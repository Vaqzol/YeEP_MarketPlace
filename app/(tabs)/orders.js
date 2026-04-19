import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, TextInput, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { auth, db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';

const TABS = ['ทั้งหมด', 'รอดำเนินการ', 'รอรับสินค้า', 'สำเร็จแล้ว', 'ยกเลิก'];

const STATUS_MAP = {
  'รอดำเนินการ': { term: 'รอดำเนินการ', tab: 'รอดำเนินการ', color: '#888' },
  'กำลังเตรียมสินค้า': { term: 'กำลังเตรียมของ', tab: 'รอรับสินค้า', color: '#4A7FB8' },
  'พร้อมนัดรับ': { term: 'พร้อมนัดรับ/ส่งของ', tab: 'รอรับสินค้า', color: '#4A7FB8' },
  'จัดส่งแล้ว': { term: 'สำเร็จแล้ว', tab: 'สำเร็จแล้ว', color: '#27AE60' },
  'เสร็จสิ้น': { term: 'สำเร็จแล้ว', tab: 'สำเร็จแล้ว', color: '#27AE60' },
  'ยกเลิก': { term: 'ยกเลิก', tab: 'ยกเลิก', color: '#FF4D4F' }
};

export default function BuyerOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Rating Modal States
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [ratingItem, setRatingItem] = useState(null);
  const [ratingProductId, setRatingProductId] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'), 
      where('buyerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        const firstItem = data.items?.[0] || {};
        const otherCount = (data.items?.length > 1) ? ` และอีก ${data.items.length - 1} รายการ` : '';
        
        // เราใช้สถานะคำสั่งซื้อดั้งเดิม แล้วค่อย Map ไปแสดงผลให้คนซื้อดูง่ายๆ
        const originalStatus = data.status || 'รอดำเนินการ';
        const displayStatus = STATUS_MAP[originalStatus]?.term || originalStatus;
        const tabCategory = STATUS_MAP[originalStatus]?.tab || originalStatus;
        const displayColor = STATUS_MAP[originalStatus]?.color || '#888';

        return {
          id: doc.id,
          productName: firstItem.name ? `${firstItem.name}${otherCount}` : 'คำสั่งซื้อ',
          productImage: firstItem.image || 'https://via.placeholder.com/200',
          variant: 'ปกติ', // Mock variant if needed
          price: data.totalAmount || 0,
          qty: data.items?.length || 1, // Number of distinct items
          originalStatus: originalStatus,
          displayStatus: displayStatus,
          tabCategory: tabCategory,
          statusColor: displayColor,
          isRated: data.isRated || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          items: data.items || [],
          sellerId: data.sellerIds?.[0] || null,
        };
      });

      // Sort newest first
      fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Actions
  const handleCancelRequest = (orderId) => {
    setSelectedOrderId(orderId);
    setCancelModalVisible(true);
  };

  const confirmCancel = async () => {
    if (!selectedOrderId) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrderId), {
        status: 'ยกเลิก',
        updatedAt: serverTimestamp()
      });
      setCancelModalVisible(false);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยกเลิกคำสั่งซื้อได้');
    }
  };

  const handleReceiveRequest = (orderId) => {
    setSelectedOrderId(orderId);
    setConfirmModalVisible(true);
  };

  const confirmReceive = async () => {
    if (!selectedOrderId) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrderId), {
        status: 'เสร็จสิ้น',
        updatedAt: serverTimestamp()
      });
      setConfirmModalVisible(false);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยืนยันรับสินค้าได้');
    }
  };

  const openRatingModal = (item) => {
    setRatingOrderId(item.id);
    setRatingItem(item);
    setRatingStars(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!ratingOrderId) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        orderId: ratingOrderId,
        buyerId: auth.currentUser?.uid,
        buyerName: auth.currentUser?.displayName || 'ลูกค้า',
        rating: ratingStars,
        comment: ratingComment.trim(),
        createdAt: serverTimestamp(),
        sellerId: ratingItem?.sellerId || null,
      });
      await updateDoc(doc(db, 'orders', ratingOrderId), { isRated: true });
      
      // อัปเดต Rating ให้คนขาย
      if (ratingItem?.sellerId) {
        try {
          await updateDoc(doc(db, 'users', ratingItem.sellerId), {
            reviewCount: increment(1),
            totalRating: increment(ratingStars)
          });
        } catch(e) {}
      }
      
      // อัปเดต Rating ให้กับตัวสินค้า
      if (ratingItem?.items && ratingItem.items.length > 0) {
        await Promise.all(ratingItem.items.map(async (prodItem) => {
          if (!prodItem.id) return;
          try {
            await updateDoc(doc(db, 'products', prodItem.id), {
              reviewCount: increment(1),
              totalRating: increment(ratingStars)
            });
          } catch(e) {}
        }));
      }

      setRatingModalVisible(false);
      Alert.alert('ขอบคุณ! 🌟', `คุณให้คะแนน ${ratingStars} ดาวเรียบร้อยแล้วครับ`);
    } catch (err) {
      console.error(err);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งรีวิวได้');
    }
  };

  // Filter Data
  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'ทั้งหมด' || order.tabCategory === activeTab;
    const matchesSearch = order.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const renderItem = ({ item }) => {
    const isPending = item.originalStatus === 'รอดำเนินการ';
    const isCompleted = item.tabCategory === 'สำเร็จแล้ว';
    const isCancelled = item.originalStatus === 'ยกเลิก';
    
    // หากต้องการให้เฉพาะออเดอร์ที่ถูกจัดส่งแล้ว ถึงจะกดยืนยันรับได้, แต่ตอนนี้เรารวม "จัดส่งแล้ว" ไปที่ "สำเร็จแล้ว" 
    // ขอใช้เช็คจาก originalStatus ว่ามันเป็นอะไร หรือสมมติเลยว่าถ้าเพิ่งสั่งเสร็จ แต่ยังไม่ให้คะแนน
    // เพื่อให้ตรง UI: ออเดอร์สำเร็จแล้วบางอันมีปุ่ม "ฉันได้รับสินค้าแล้ว" และบางอัน "ให้คะแนน"
    // จะจำลองว่าถ้าเพิ่งมารวมเป็นเสร็จสิ้น ให้กดรับก่อน
    const needsReceiveConfirm = item.originalStatus === 'จัดส่งแล้ว' || item.originalStatus === 'พร้อมนัดรับ';
    const isFullyDone = item.originalStatus === 'เสร็จสิ้น';

    return (
      <View style={styles.orderCard}>
        {/* Cancel Icon */}
        {isPending && (
          <TouchableOpacity 
            style={styles.cancelIconTopRight} 
            onPress={() => handleCancelRequest(item.id)}
          >
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>
        )}
        
        {/* Content Row */}
        <View style={styles.orderRow}>
          <Image source={{ uri: item.productImage }} style={styles.productImg} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.productVariant}>{item.variant}</Text>
            
            <View style={styles.statusDisplay}>
              <Text style={styles.statusLabel}>สถานะ : </Text>
              <Text style={[styles.statusValue, { color: item.statusColor }]}>{item.displayStatus}</Text>
            </View>

            <View style={styles.priceQtyRow}>
              <Text style={styles.priceText}>ราคา {item.price.toLocaleString()} บาท</Text>
              <Text style={styles.qtyText}>จำนวน {item.qty}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsContainer}>
          {isCancelled ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push(`/order/${item.id}`)}>
              <Text style={styles.secondaryBtnText}>ดูรายละเอียด</Text>
            </TouchableOpacity>
          ) : isPending ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push(`/order/${item.id}`)}>
              <Text style={styles.secondaryBtnText}>ดูรายละเอียด</Text>
            </TouchableOpacity>
          ) : needsReceiveConfirm ? (
            <TouchableOpacity style={styles.primaryFullBtn} onPress={() => handleReceiveRequest(item.id)}>
              <Text style={styles.primaryFullBtnText}>ฉันได้รับสินค้าแล้ว</Text>
            </TouchableOpacity>
          ) : isFullyDone ? (
            <View style={styles.rowActions}>
              <TouchableOpacity 
                style={[styles.secondaryBtnFixed, item.isRated && { borderColor: '#C0C0C0', backgroundColor: '#F5F5F5' }]} 
                onPress={() => !item.isRated && openRatingModal(item)}
              >
                <Text style={[styles.secondaryBtnTextFixed, item.isRated && { color: '#A0A0A0' }]}>
                  {item.isRated ? '✓ ให้คะแนนแล้ว' : '⭐ ให้คะแนน'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtnFixed} onPress={() => router.push(`/order/${item.id}`)}>
                <Text style={styles.secondaryBtnTextFixed}>ดูรายละเอียด</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push(`/order/${item.id}`)}>
              <Text style={styles.secondaryBtnText}>ดูรายละเอียด</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>คำสั่งซื้อของฉัน</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === item && styles.tabBtnActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.tabsContainer}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาคำสั่งซื้อ..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C94C1" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="bag-handle-outline" size={60} color="#E0E0E0" />
          <Text style={styles.emptyText}>ไม่มีข้อมูลคำสั่งซื้อ</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cancel Modal */}
      <Modal transparent visible={cancelModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ต้องการยกเลิกคำสั่งซื้อหรือไม่?</Text>
            <Text style={styles.modalSub}>
              ระบบจะทำการแจ้งผู้ขายเพื่อยืนยันการยกเลิกภายใน 24 ชั่วโมง
              หากมีการชำระเงินแล้ว ผู้ขายจะเป็นผู้จัดการโอนเงินคืน
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={confirmCancel}>
                <Text style={styles.modalBtnTextCancel}>ยืนยันการยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnBack} onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalBtnTextBack}>ย้อนกลับ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Receive Modal */}
      <Modal transparent visible={confirmModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ยืนยันว่าท่านได้รับสินค้าแล้วจริงหรือไม่</Text>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={[styles.modalBtnRow, { backgroundColor: '#A2BEDF' }]} onPress={confirmReceive}>
                <Text style={styles.modalBtnTextCancel}>ยืนยัน</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnRow, { backgroundColor: '#A2BEDF' }]} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>ย้อนกลับ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal transparent visible={ratingModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 30 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 8 }]}>⭐ ให้คะแนนสินค้า</Text>
            <Text style={{ textAlign: 'center', color: '#888', marginBottom: 20 }}>ความคิดเห็นของคุณช่วยให้คนอื่นตัดสินใจได้ครับ 🙏</Text>
            
            {/* Star Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRatingStars(star)}>
                  <Text style={{ fontSize: 38 }}>{star <= ratingStars ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ textAlign: 'center', color: '#6C94C1', fontWeight: 'bold', marginBottom: 16 }}>
              {ratingStars === 1 ? 'แย่มาก' : ratingStars === 2 ? 'พอใช้ได้' : ratingStars === 3 ? 'เป็นสิ' : ratingStars === 4 ? 'ดีมาก' : 'ยอดเยี่ยม!'}
            </Text>

            {/* Comment Input */}
            <TextInput
              style={{
                borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
                padding: 12, minHeight: 80, textAlignVertical: 'top',
                fontSize: 14, color: '#333', backgroundColor: '#FAFAFA', marginBottom: 20
              }}
              placeholder="เขียนความคิดเห็นเพิ่มเติม..."
              placeholderTextColor="#AAA"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={[styles.modalBtnRow, { backgroundColor: '#6C94C1' }]} onPress={submitRating}>
                <Text style={styles.modalBtnTextCancel}>ส่งรีวิว</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnRow, { backgroundColor: '#DDD' }]} onPress={() => setRatingModalVisible(false)}>
                <Text style={[styles.modalBtnTextCancel, { color: '#555' }]}>ยกเลิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 15, 
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerBtn: { padding: 5 },

  tabsWrapper: { backgroundColor: 'white', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabsContainer: { paddingHorizontal: 15, gap: 10 },
  tabBtn: { 
    paddingHorizontal: 15, paddingVertical: 8, 
    borderRadius: 20, backgroundColor: '#EDF1F7' 
  },
  tabBtnActive: { backgroundColor: '#6C94C1' },
  tabText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: 'white' },

  searchContainer: {
    margin: 15, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 15,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 14, color: COLORS.text },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { color: '#A0A0A0', marginTop: 10 },

  listContent: { paddingHorizontal: 15, paddingBottom: 30 },
  
  orderCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15,
    position: 'relative', borderWidth: 1, borderColor: '#F0F2F5',
  },
  cancelIconTopRight: { position: 'absolute', top: 12, right: 12, zIndex: 1, padding: 5 },
  
  orderRow: { flexDirection: 'row' },
  productImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F0F0F0' },
  productInfo: { flex: 1, marginLeft: 15 },
  productName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginRight: 25 },
  productVariant: { fontSize: 13, color: '#A0A0A0', marginTop: 2 },
  
  statusDisplay: { flexDirection: 'row', marginTop: 4 },
  statusLabel: { fontSize: 13, color: COLORS.text },
  statusValue: { fontSize: 13, fontWeight: 'bold' },
  
  priceQtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceText: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },

  actionsContainer: { marginTop: 15, alignItems: 'flex-end', width: '100%' },
  secondaryBtn: { 
    paddingHorizontal: 20, paddingVertical: 8, 
    borderWidth: 1, borderColor: '#6C94C1', borderRadius: 20 
  },
  secondaryBtnText: { color: '#6C94C1', fontSize: 13, fontWeight: 'bold' },
  
  primaryFullBtn: {
    width: '100%', paddingVertical: 12, 
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    alignItems: 'center', marginTop: 5
  },
  primaryFullBtnText: { color: COLORS.text, fontSize: 14 },

  rowActions: { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'flex-end' },
  secondaryBtnFixed: { 
    paddingHorizontal: 15, paddingVertical: 8, 
    borderWidth: 1, borderColor: '#6C94C1', borderRadius: 20, minWidth: 100, alignItems: 'center'
  },
  secondaryBtnTextFixed: { color: '#6C94C1', fontSize: 13, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: 'white', borderRadius: 20, padding: 25, 
    width: '100%', alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: COLORS.text },
  modalSub: { fontSize: 14, textAlign: 'center', color: COLORS.textLight, marginBottom: 25, lineHeight: 22 },
  
  modalActions: { width: '100%', gap: 10 },
  modalBtnCancel: { backgroundColor: '#A2BEDF', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnTextCancel: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  modalBtnBack: { backgroundColor: '#A2BEDF', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnTextBack: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  modalActionsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 15, marginTop: 10 },
  modalBtnRow: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});
