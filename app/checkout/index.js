import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { auth, db } from '../../config/firebase';
import { collection, query, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const BANK_ICONS = {
  'ธนาคารกรุงเทพ': require('../../assets/Bank_icon/กรุงเทพ.png'),
  'ธนาคารกสิกรไทย': require('../../assets/Bank_icon/กสิกร.png'),
  'ธนาคารไทยพาณิชย์': require('../../assets/Bank_icon/ไทยพาณิชย์ SCB.png'),
  'ธนาคารกรุงไทย': require('../../assets/Bank_icon/กรุงไทย2.png'),
  'ธนาคารกรุงศรีอยุธยา': require('../../assets/Bank_icon/กรุงศรี 2.png'),
  'TrueMoney Wallet': require('../../assets/Bank_icon/ทรูวอเลต.png'),
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { selectedItemIds } = useLocalSearchParams();
  const [cartItems, setCartItems] = useState([]);
  const [sellerBankInfo, setSellerBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment Options: 'direct' or 'gateway'. We focus on 'direct' based on user preference
  const [paymentMethod, setPaymentMethod] = useState('direct');
  const [slipImage, setSlipImage] = useState(null);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    if (!auth.currentUser) return;
    try {
      let ids = [];
      if (selectedItemIds) {
        ids = JSON.parse(selectedItemIds);
      }

      const q = query(collection(db, 'carts', auth.currentUser.uid, 'items'));
      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter if we have specific selection
      if (ids.length > 0) {
        items = items.filter(item => ids.includes(item.id));
      }
      
      setCartItems(items);

      // Fetch seller info
      if (items.length > 0) {
        const sellerId = items[0].sellerId;
        const sellerSnap = await getDoc(doc(db, 'users', sellerId));
        if (sellerSnap.exists()) {
          setSellerBankInfo(sellerSnap.data());
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const pickSlipImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('คำเตือน', 'กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพเพื่ออัปโหลดสลิปครับ');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setSlipImage(base64Img);
    }
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('ตะกร้าว่างเปล่า', 'คุณไม่มีสินค้าในตะกร้าครับ');
      return;
    }
    
    // ตรวจสอบเงื่อนไขถ้าเลือกโอนเงินว่าอัปโหลดสลิปหรือยัง
    if (paymentMethod === 'direct' && !slipImage) {
      Alert.alert('กรุณาอัปโหลดสลิป', 'กรุณาแนบภาพสลิปโอนเงินเพื่อยืนยันการชำระเงินกับผู้ขายครับ');
      return;
    }

    setIsProcessing(true);

    try {
      // ดึงรายชื่อคนขายที่ไม่ซ้ำกันเพื่อใช้ในการ filter ในหน้าแดชบอร์ดคนขาย
      const uniqueSellerIds = [...new Set(cartItems.map(item => item.sellerId))];

      // ดึงชื่อ-นามสกุลผู้ซื้อจาก Firestore เพื่อนำไปแสดงในหน้า Seller Dashboard
      let buyerName = 'ลูกค้า';
      try {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          buyerName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || auth.currentUser.email;
        }
      } catch (_) {}

      // 1. สร้าง Order ใน Firestore
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, {
        buyerId: auth.currentUser.uid,
        buyerName: buyerName,
        sellerIds: uniqueSellerIds,
        items: cartItems,
        totalAmount: totalAmount,
        status: 'รอดำเนินการ',
        paymentMethod: paymentMethod,
        paymentSlip: slipImage,
        createdAt: serverTimestamp(),
      });

      // 2. เคลียร์ตะกร้าสินค้า และ ลดสต็อกสินค้า
      for (const item of cartItems) {
        // เคลียร์ตะกร้า
        await deleteDoc(doc(db, 'carts', auth.currentUser.uid, 'items', item.id));
        // ลดสต็อกตามจำนวนที่สั่งซื้อ
        if (item.productId) {
          try {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              const newStock = currentStock - (item.qty || 1);
              // ถ้าสต็อกหมดหรือน้อยกว่า 0 ให้ซ่อนสินค้าออกจาก marketplace
              const updateData = { stock: newStock };
              if (newStock <= 0) {
                updateData.stock = 0;
                updateData.status = 'หมด';
              }
              await updateDoc(productRef, updateData);
            }
          } catch (e) {
            console.log('Error deducting stock', e);
          }
        }
      }

      // 3. ไปยังหน้าสำเร็จ
      router.push('/checkout/success');

    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยืนยันคำสั่งซื้อได้ โปรดลองอีกครั้ง');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สั่งซื้อสินค้า</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สรุปการสั่งซื้อ</Text>
          {cartItems.map((item, index) => (
            <View key={item.id} style={[styles.orderItem, index !== cartItems.length - 1 && styles.borderBottom]}>
              <Image source={{ uri: item.image || 'https://via.placeholder.com/60' }} style={styles.itemImg} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQty}>จำนวน: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{(item.price * item.quantity).toLocaleString()} บาท</Text>
            </View>
          ))}
        </View>

        {/* Cost Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ยอดรวมสินค้า</Text>
            <Text style={styles.summaryValue}>{totalAmount.toLocaleString()} บาท</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ค่าจัดส่ง</Text>
            <Text style={styles.summaryValue}>0.00 บาท</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>ยอดรวมสุทธิ</Text>
            <Text style={styles.totalValue}>{totalAmount.toLocaleString()} บาท</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เลือกวิธีชำระเงิน</Text>
          
          {/* Method 1: Direct Transfer / Upload Slip */}
          <View style={[styles.paymentMethodCard, paymentMethod === 'direct' && styles.paymentMethodCardActive]}>
            <TouchableOpacity 
              style={styles.paymentMethodHeader}
              onPress={() => setPaymentMethod('direct')}
            >
              <Ionicons 
                name={paymentMethod === 'direct' ? "radio-button-on" : "radio-button-off"} 
                size={24} 
                color={paymentMethod === 'direct' ? COLORS.primary : '#D0D0D0'} 
              />
              <View style={styles.paymentMethodTextContainer}>
                <Text style={styles.paymentMethodTitle}>โอนเงินให้ผู้ขายโดยตรง</Text>
                <Text style={styles.paymentMethodSub}>จัดการโดยผู้ขาย (แนบสลิปเพื่อยืนยัน)</Text>
              </View>
              <Ionicons name="business-outline" size={24} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Bank Info & Upload area (Only show if selected) */}
            {paymentMethod === 'direct' && (
              <View style={styles.paymentMethodBody}>
                <View style={styles.bankAccountCard}>
                  <View style={styles.bankLogo}>
                    {sellerBankInfo?.bankName && BANK_ICONS[sellerBankInfo.bankName] ? (
                      <Image source={BANK_ICONS[sellerBankInfo.bankName]} style={styles.bankLogoImg} />
                    ) : (
                      <Text style={styles.bankLogoText}>BANK</Text>
                    )}
                  </View>
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankName}>{sellerBankInfo?.bankName || 'ธนาคาร (โปรดสอบถามผู้ขาย)'}</Text>
                    <Text style={styles.bankNumber}>{sellerBankInfo?.bankAccountNo || 'ยังไม่ระบุเลขบัญชี'}</Text>
                    <Text style={styles.bankAccountName}>ชื่อบัญชี: {sellerBankInfo?.bankAccountName || (sellerBankInfo ? `${sellerBankInfo.firstName} ${sellerBankInfo.lastName}` : 'ยังไม่ระบุชื่อบัญชี')}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={20} color={COLORS.textLight} />
                </View>

                <TouchableOpacity style={styles.uploadBox} onPress={pickSlipImage}>
                  {slipImage ? (
                    <Image source={{ uri: slipImage }} style={{ width: '100%', height: 120, borderRadius: 8, resizeMode: 'cover' }} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color={COLORS.textLight} />
                      <Text style={styles.uploadBoxTitle}>อัปโหลดสลิปการโอนเงิน</Text>
                      <Text style={styles.uploadBoxSub}>รองรับไฟล์ JPG, PNG (สูงสุด 5MB)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmBtn, isProcessing && styles.disabledBtn]}
          onPress={handleConfirmOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>ยืนยันการสั่งซื้อ</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 15, 
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerBtn: { padding: 5, width: 40 },
  
  scrollContent: { paddingBottom: 100 },
  
  section: { backgroundColor: 'white', marginTop: 10, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  
  orderItem: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemImg: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F0F0F0' },
  itemDetails: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  itemQty: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },

  summaryCard: {
    backgroundColor: '#F7F8FA', padding: 20, margin: 15, borderRadius: 12
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: COLORS.textLight },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#4A7FB8' },

  paymentMethodCard: {
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12,
    overflow: 'hidden'
  },
  paymentMethodCardActive: { borderColor: COLORS.primary },
  paymentMethodHeader: {
    flexDirection: 'row', padding: 15, alignItems: 'center'
  },
  paymentMethodTextContainer: { flex: 1, marginLeft: 15 },
  paymentMethodTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  paymentMethodSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  
  recommendedBadge: { backgroundColor: '#6C94C1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recommendedText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  paymentMethodBody: { padding: 15, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  
  bankAccountCard: {
    flexDirection: 'row', backgroundColor: '#F0F2F5', padding: 12, borderRadius: 8, 
    alignItems: 'center', marginTop: 15, marginBottom: 15
  },
  bankLogo: { width: 45, height: 45, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' },
  bankLogoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bankLogoText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 10 },
  bankDetails: { flex: 1, marginLeft: 12 },
  bankName: { fontSize: 12, color: COLORS.textLight },
  bankNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  bankAccountName: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  uploadBox: {
    borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 12,
    padding: 20, alignItems: 'center', backgroundColor: '#FAFAFC'
  },
  uploadBoxTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginTop: 10 },
  uploadBoxSub: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', paddingHorizontal: 20, paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 5
  },
  confirmBtn: {
    backgroundColor: '#6C94C1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 50, borderRadius: 10, gap: 10
  },
  disabledBtn: { opacity: 0.7 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
