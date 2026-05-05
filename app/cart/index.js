import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../../constants/theme';
import { auth, db } from '../../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // Array of item IDs

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      Alert.alert('กรุณากรอกรหัส', 'กรุณาพิมพ์รหัสโปรโมชั่นก่อนกดใช้ครับ');
      return;
    }
    // รหัสทดสอบ YEEP10 ลด 10%
    if (promoCode.trim().toUpperCase() === 'YEEP10') {
      setPromoApplied(true);
      Alert.alert('สำเร็จ! 🎉', 'ใช้รหัส YEEP10 ส่วนลด 10% เรียบร้อยแล้วครับ');
    } else {
      setPromoApplied(false);
      Alert.alert('รหัสไม่ถูกต้อง', `ไม่พบรหัส "${promoCode.trim()}" ในระบบ กรุณาตรวจสอบอีกครั้งครับ`);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const cartRef = collection(db, 'carts', auth.currentUser.uid, 'items');
    const q = query(cartRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // เรียงลำดับตามเวลาล่าสุด
      items.sort((a, b) => (b.addedAt?.toDate() || 0) - (a.addedAt?.toDate() || 0));
      setCartItems(items);
      setLoading(false);
    }, (error) => {
      console.log('Cart listener error:', error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleUpdateQuantity = async (itemId, currentQty, change) => {
    const newQty = currentQty + change;
    if (newQty < 1) return; // ไม่ให้จำนวนติดลบ
    
    try {
      const itemRef = doc(db, 'carts', auth.currentUser.uid, 'items', itemId);
      await updateDoc(itemRef, { quantity: newQty });
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตจำนวนสินค้าได้');
    }
  };

  const handleRemoveItem = async (itemId) => {
    Alert.alert('ลบสินค้า', 'คุณแน่ใจหรือไม่ที่จะลบสินค้านี้ออกจากตะกร้า?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        try {
          const itemRef = doc(db, 'carts', auth.currentUser.uid, 'items', itemId);
          await deleteDoc(itemRef);
        } catch (error) {
          console.error('Error removing item:', error);
          Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบสินค้าได้');
        }
      }}
    ]);
  };

  const toggleSelectItem = (item) => {
    const isSelected = selectedItems.includes(item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(id => id !== item.id));
    } else {
      // Check if we already have items from a different seller
      const otherSelectedItems = cartItems.filter(ci => selectedItems.includes(ci.id));
      if (otherSelectedItems.length > 0 && otherSelectedItems[0].sellerId !== item.sellerId) {
        Alert.alert(
          'ชำระเงินได้ทีละร้านค้า',
          'ขออภัยครับ ระบบรองรับการโอนเงินให้ผู้ขายโดยตรง จึงต้องสั่งซื้อแยกทีละร้านค้าครับ'
        );
        return;
      }
      setSelectedItems([...selectedItems, item.id]);
    }
  };

  const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.id));
  const subTotal = selectedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemsCount = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    
    return (
      <View style={[styles.cartCard, isSelected && styles.cartCardSelected]}>
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={() => toggleSelectItem(item)}
        >
          <Ionicons 
            name={isSelected ? "checkbox" : "square-outline"} 
            size={22} 
            color={isSelected ? COLORS.primary : "#CCC"} 
          />
        </TouchableOpacity>

        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/80' }} 
          style={styles.itemImage} 
        />
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => handleRemoveItem(item.id)}
            >
              <Ionicons name="close" size={18} color="#A0A0A0" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.itemVariant}>คนขาย: {item.sellerName || 'ร้านค้าทั่วไป'}</Text>
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>{item.price?.toLocaleString()} บาท</Text>
            
            <View style={styles.qtyContainer}>
              <TouchableOpacity 
                style={styles.qtyBtn}
                onPress={() => handleUpdateQuantity(item.id, item.quantity, -1)}
              >
                <Ionicons name="remove" size={16} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity 
                style={styles.qtyBtn}
                onPress={() => handleUpdateQuantity(item.id, item.quantity, 1)}
              >
                <Ionicons name="add" size={16} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!auth.currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ตะกร้าสินค้า</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้า</Text>
        </View>
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
        <Text style={styles.headerTitle}>ตะกร้าสินค้า</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyText}>ไม่มีสินค้าในตะกร้า</Text>
          <Text style={styles.emptySubText}>ลองค้นหาสินค้าที่ถูกใจแล้วเพิ่มลงตะกร้าเลย!</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.exploreBtnText}>เลือกซื้อสินค้าต่อ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View style={styles.promoContainer}>
                <TextInput 
                  style={[styles.promoInput, promoApplied && { borderColor: '#27AE60', backgroundColor: '#F0FFF4' }]} 
                  placeholder="รหัสโปรโมชั่น" 
                  placeholderTextColor="#A0A0A0"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  editable={!promoApplied}
                />
                <TouchableOpacity 
                  style={[styles.promoBtn, promoApplied && { backgroundColor: '#27AE60' }]}
                  onPress={promoApplied ? () => { setPromoApplied(false); setPromoCode(''); } : handleApplyPromo}
                >
                  <Text style={[styles.promoBtnText, promoApplied && { color: 'white' }]}>{promoApplied ? '✓ ใช้แล้ว' : 'ใช้'}</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {/* Bottom Summary Board */}
          <View style={styles.bottomBoard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ยอดรวมย่อย ({totalItemsCount} รายการ)</Text>
              <Text style={styles.summaryValue}>{subTotal.toLocaleString()} บาท</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ค่าจัดส่ง</Text>
              <Text style={styles.summaryValueFree}>ฟรี</Text>
            </View>
            {promoApplied && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#27AE60' }]}>ส่วนลด (YEEP10 -10%)</Text>
                <Text style={[styles.summaryValue, { color: '#27AE60' }]}>-{(subTotal * 0.1).toLocaleString()} บาท</Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ยอดรวมทั้งหมด</Text>
              <Text style={styles.totalValue}>{(promoApplied ? subTotal * 0.9 : subTotal).toLocaleString()} บาท</Text>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutBtn, selectedItems.length === 0 && styles.disabledBtn]}
              onPress={() => {
                if (selectedItems.length === 0) {
                  Alert.alert('กรุณาเลือกสินค้า', 'โปรดเลือกสินค้าที่ต้องการสั่งซื้ออย่างน้อย 1 รายการครับ');
                  return;
                }
                router.push({
                  pathname: '/checkout',
                  params: { selectedItemIds: JSON.stringify(selectedItems) }
                });
              }}
              disabled={selectedItems.length === 0}
            >
              <Text style={styles.checkoutBtnText}>ดำเนินการชำระเงิน ({selectedItems.length})</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
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
  headerBtn: { padding: 5 },
  
  listContent: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 30 },
  
  cartCard: {
    flexDirection: 'row', backgroundColor: 'white', 
    borderRadius: 12, padding: 12, marginBottom: 15,
    borderWidth: 1, borderColor: '#F0F2F5',
  },
  cartCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FAFF',
  },
  checkboxContainer: {
    justifyContent: 'center',
    paddingRight: 10,
  },
  itemImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F0F0F0' },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { flex: 1, fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginRight: 10 },
  deleteBtn: { padding: 2 },
  itemVariant: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#6C94C1' },
  
  qtyContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 20,
    backgroundColor: 'white'
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, width: 20, textAlign: 'center' },

  promoContainer: { 
    flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 20 
  },
  promoInput: { 
    flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8', 
    borderRadius: 8, paddingHorizontal: 15, height: 45, fontSize: 14, color: COLORS.text
  },
  promoBtn: { 
    marginLeft: 10, backgroundColor: '#D5DFEB', height: 45, 
    paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center' 
  },
  promoBtnText: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },

  bottomBoard: { 
    backgroundColor: 'white', padding: 20, 
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    paddingBottom: 30 // For safe area
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: COLORS.textLight },
  summaryValue: { fontSize: 14, color: COLORS.textLight },
  summaryValueFree: { fontSize: 14, color: '#6C94C1', fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#6C94C1' },
  
  checkoutBtn: { 
    backgroundColor: '#6C94C1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 50, borderRadius: 10, gap: 10
  },
  disabledBtn: {
    backgroundColor: '#CCC',
  },
  checkoutBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 20 },
  emptySubText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  exploreBtn: { marginTop: 25, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8 },
  exploreBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
