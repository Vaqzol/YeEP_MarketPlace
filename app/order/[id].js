import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { COLORS, SIZES } from '../../constants/theme';

const STATUS_TIMELINE = ['รอดำเนินการ', 'กำลังเตรียมสินค้า', 'พร้อมนัดรับ', 'เสร็จสิ้น'];

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState('กำลังโหลด...');

  useEffect(() => {
    if (!id) return;

    // Listen to real-time order updates
    const unsubscribe = onSnapshot(doc(db, 'orders', id), async (docSnap) => {
      if (docSnap.exists()) {
        const rawData = docSnap.data();
        const firstItem = rawData.items?.[0] || {};
        const otherCount = (rawData.items?.length > 1) ? ` และอีก ${rawData.items.length - 1} รายการ` : '';
        
        const data = { 
          id: docSnap.id, 
          ...rawData,
          productName: firstItem.name ? `${firstItem.name}${otherCount}` : 'คำสั่งซื้อ',
          productImage: firstItem.image || 'https://via.placeholder.com/200',
          variant: firstItem.variant || '',
          price: rawData.totalAmount || 0,
          qty: 1, // totalAmount includes all item quantities, so treat as 1 batch
          sellerId: rawData.sellerIds?.[0] || null,
        };
        setOrder(data);
        
        // Fetch seller details if available
        if (data.sellerId) {
          try {
            const sellerRef = doc(db, 'users', data.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              setSellerName(sellerSnap.data().displayName || 'ไม่มีชื่อ');
            }
          } catch (err) {
            console.log('Error fetching seller name', err);
          }
        }
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบคำสั่งซื้อนี้');
        router.back();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) return null;

  const currentStatusIndex = STATUS_TIMELINE.indexOf(order.status);
  const isCancelled = order.status === 'ยกเลิก';

  // Navigate to chat with seller
  const handleChat = () => {
    const chatId = [auth.currentUser?.uid, order.sellerId].sort().join('_');
    router.push({
      pathname: `/chat/${chatId}`,
      params: { 
        productId: order.productId,
        sellerId: order.sellerId 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>รายละเอียดคำสั่งซื้อ</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Timeline */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <Ionicons name={isCancelled ? "close-circle" : "checkmark-circle"} size={26} color={isCancelled ? '#FF4D4F' : COLORS.primary} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.statusTitle}>{isCancelled ? 'การสั่งซื้อถูกยกเลิก' : order.status}</Text>
              <Text style={styles.statusSubtitle}>อัปเดตล่าสุด: {order.updatedAt?.toDate().toLocaleString('th-TH') || 'ไม่ระบุ'}</Text>
            </View>
          </View>
          {/* Visual Timeline Bar */}
          {!isCancelled && (
            <View style={styles.timelineContainer}>
              {STATUS_TIMELINE.map((step, index) => {
                const isPassed = index <= currentStatusIndex;
                const isLast = index === STATUS_TIMELINE.length - 1;
                return (
                  <View key={step} style={styles.timelineStep}>
                    <View style={[styles.timelineDot, isPassed && styles.timelineDotActive]} />
                    {!isLast && <View style={[styles.timelineLine, isPassed && index < currentStatusIndex && styles.timelineLineActive]} />}
                    <Text style={[styles.timelineText, isPassed && styles.timelineTextActive]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={18} color="#555" />
            <Text style={styles.storeName}>{sellerName}</Text>
            <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
              <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
              <Text style={styles.chatBtnText}>แชท</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productRow}>
            <Image source={{ uri: order.productImage }} style={styles.productImg} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
              {order.variant ? <Text style={styles.productVariant}>ตัวเลือก: {order.variant}</Text> : null}
              <View style={styles.priceRow}>
                <Text style={styles.price}>฿{order.price.toLocaleString()}</Text>
                {order.items && order.items.length > 1 ? (
                  <Text style={styles.qty}>({order.items.length} ชิ้น)</Text>
                ) : (
                  <Text style={styles.qty}>x{order.items?.[0]?.qty || 1}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Delivery / Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>การจัดส่ง / นัดรับ</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6C94C1" />
            <Text style={styles.infoText}>{order.location || 'ไม่ได้ระบุจุดนัดรับ'}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลการชำระเงิน</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>รหัสคำสั่งซื้อ</Text>
            <Text style={styles.summaryValue}>{order.id.slice(0, 10).toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ยอดรวมสินค้า</Text>
            <Text style={styles.summaryValue}>฿{(order.price * order.qty).toLocaleString()}</Text>
          </View>
          {order.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ส่วนลดโค้ด ({order.promoCode})</Text>
              <Text style={[styles.summaryValue, { color: '#E15241' }]}>- ฿{order.discountAmount.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>ยอดชำระสุทธิ</Text>
            <Text style={styles.summaryTotalValue}>฿{(order.price * order.qty - (order.discountAmount || 0)).toLocaleString()}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 15,
    gap: 15,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  timelineStep: {
    alignItems: 'center',
    width: 50,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E0E0E0',
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    position: 'absolute',
    top: 6,
    left: 25,
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 1,
  },
  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },
  timelineText: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  storeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  chatBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImg: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  productVariant: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E15241',
  },
  qty: {
    fontSize: 13,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E15241',
  },
});
