import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebase';
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';

// ===== ORDER MOCK DATA =====
const MOCK_ORDERS = [
  {
    id: 'YE-8821',
    productName: 'Classic White Watch',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
    price: 1250,
    buyerName: 'คุณสมชาย',
    buyerPhone: '081-234-56XX',
    location: 'หน้าหอพักสุรนิเวศ 1 (ประตูทางเข้าหลัก)',
    status: 'รอดำเนินการ',
  },
  {
    id: 'YE-8819',
    productName: 'Bluetooth Headphones Gen 2',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
    price: 890,
    buyerName: 'คุณวิภาดา',
    buyerPhone: '089-765-43XX',
    location: 'โรงอาหารกลาง 1 (โต๊ะยาวด้านหน้า)',
    status: 'กำลังเตรียมสินค้า',
  },
  {
    id: 'YE-8790',
    productName: 'Sport Runner X1',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    price: 2450,
    buyerName: 'คุณธนนากรณ์',
    buyerPhone: '062-111-22XX',
    location: 'ลานจอดรถกลิติ C ชั้น 1',
    status: 'เสร็จสิ้น',
  },
];

const STATUS_OPTIONS = [
  { key: 'รอดำเนินการ',      icon: 'clipboard-outline',     color: '#FA8C16' },
  { key: 'กำลังเตรียมสินค้า', icon: 'cube-outline',          color: '#1890FF' },
  { key: 'พร้อมนัดรับ',      icon: 'people-outline',        color: '#722ED1' },
  { key: 'เสร็จสิ้น',       icon: 'bag-check-outline',      color: '#52C41A' },
];

const STATUS_STYLE = {
  'รอดำเนินการ':      { bg: '#FFF7E6', text: '#FA8C16' },
  'กำลังเตรียมสินค้า': { bg: '#E6F7FF', text: '#1890FF' },
  'พร้อมนัดรับ':      { bg: '#F9F0FF', text: '#722ED1' },
  'เสร็จสิ้น':       { bg: '#F6FFED', text: '#52C41A' },
};

// ===== MAIN COMPONENT =====
export default function SellScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('สินค้า');

  // --- Products state ---
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // --- Orders state ---
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Stats (mock)
  const stats = [
    { label: 'รายได้ต่อเดือน',    value: '฿12,450', icon: 'wallet-outline', trend: '+14.2%' },
    { label: 'สินค้าที่ต้องจัดส่ง', value: orders.filter(o => o.status !== 'เสร็จสิ้น').length.toString(), icon: 'basket-outline', subtext: '! ต้องดำเนินการ' },
    { label: 'จำนวนเข้าชม',      value: '4.2k',   icon: 'eye-outline',    trend: '+5.1%' },
  ];

  // Fetch products from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(d => {
        const data = d.data();
        let status = 'ใช้งานอยู่'; let sColor = '#E6F7ED'; let tColor = '#27AE60';
        if (data.stock === 0)     { status = 'หมด';       sColor = '#F0F2F5'; tColor = '#8A97A8'; }
        else if (data.stock < 5) { status = 'สต็อกต่ำ'; sColor = '#FFF7E6'; tColor = '#FAAD14'; }
        return {
          id: d.id, name: data.name, stock: data.stock,
          status, statusColor: sColor, textColor: tColor,
          image: data.images?.length ? data.images[0] : 'https://via.placeholder.com/50'
        };
      });
      setProducts(prods.reverse());
      setLoadingProducts(false);
    });
    return () => unsub();
  }, []);

  // Fetch real orders (ถ้ามี)
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'orders'), where('sellerId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const real = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders([...real, ...MOCK_ORDERS]);
      }
    });
    return () => unsub();
  }, []);

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
  };

  const confirmUpdate = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.isMock || !selectedOrder.docId) {
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
      setSelectedOrder(null);
      return;
    }
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: newStatus, updatedAt: serverTimestamp()
      });
    } catch (e) { Alert.alert('เกิดข้อผิดพลาด', e.message); }
    finally { setUpdatingStatus(false); setSelectedOrder(null); }
  };

  // ===== TAB CONTENT RENDERERS =====

  const renderProductsTab = () => (
    <>
      <View style={styles.inventoryActions}>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/seller/add-product')}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addBtnText}>เพิ่มสินค้า</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.productList}>
        {loadingProducts ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีสินค้าในคลัง</Text>
        ) : products.map(item => (
          <View key={item.id} style={styles.productItem}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productStock}>{item.stock} ชิ้น</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.statusColor }]}>
              <Text style={[styles.statusText, { color: item.textColor }]}>{item.status}</Text>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity 
                style={styles.actionIcon}
                onPress={() => router.push(`/seller/edit-product?id=${item.id}`)}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionIcon}
                onPress={() => router.push(`/seller/edit-product?id=${item.id}`)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const renderOrdersTab = () => (
    <View>
      {orders.map(item => {
        const ss = STATUS_STYLE[item.status] || { bg: '#F5F5F5', text: '#888' };
        const isCompleted = item.status === 'เสร็จสิ้น';
        return (
          <View key={item.id} style={[styles.orderCard, isCompleted && { opacity: 0.65 }]}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>ORDER #{item.id}</Text>
              <View style={[styles.orderStatusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.orderStatusText, { color: ss.text }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.orderProductRow}>
              <Image source={{ uri: item.productImage }} style={styles.orderProductImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.orderProductName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.orderBuyer}>
                  <Ionicons name="person-outline" size={12} /> {item.buyerName}
                </Text>
              </View>
            </View>
            <View style={styles.orderLocation}>
              <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              <Text style={styles.orderLocationText} numberOfLines={2}>{item.location}</Text>
            </View>
            {isCompleted ? (
              <View style={styles.completedBtn}>
                <Text style={styles.completedBtnText}>จัดเก็บรายการแล้ว</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.updateBtn} onPress={() => openStatusModal(item)}>
                <Ionicons name="create-outline" size={16} color="white" />
                <Text style={styles.updateBtnText}>อัปเดตสถานะ</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderUpdateTab = () => (
    <View style={styles.updateTabContainer}>
      <Text style={styles.sectionTitle}>คำสั่งซื้อที่รอการอัปเดต</Text>
      {orders
        .filter(o => o.status !== 'เสร็จสิ้น')
        .map(item => {
          const ss = STATUS_STYLE[item.status] || { bg: '#F5F5F5', text: '#888' };
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.updateTabCard}
              onPress={() => openStatusModal(item)}
            >
              <Image source={{ uri: item.productImage }} style={styles.updateCardImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.updateCardName} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.updateCardBuyer}>{item.buyerName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: ss.bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={[styles.statusText, { color: ss.text }]}>{item.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          );
        })}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'สินค้า':       return renderProductsTab();
      case 'คำสั่งซื้อ':   return renderOrdersTab();
      case 'อัพเดตสถานะ': return renderUpdateTab();
      default:            return <View style={{ padding: 20 }}><Text style={styles.emptyText}>เร็วๆ นี้...</ Text></View>;
    }
  };

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront" size={16} color="white" />
          </View>
          <Text style={styles.headerTitle}>YeEP Seller</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.avatar} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Register Shop Banner */}
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={() => router.push('/seller/register-shop')}
        >
          <Text style={styles.bannerTitle}>🏪 สมัครร้านค้าประจำ</Text>
          <Ionicons name="chevron-forward" size={18} color="#D48806" />
        </TouchableOpacity>

        {/* Stats */}
        {stats.map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Ionicons name={stat.icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            {stat.trend   && <Text style={styles.statTrend}>↗ {stat.trend}</Text>}
            {stat.subtext && <Text style={styles.statSubtext}>{stat.subtext}</Text>}
          </View>
        ))}

        {/* Manage Shop */}
        <TouchableOpacity style={styles.manageShopBtn}>
          <Text style={styles.manageShopText}>จัดการหน้าร้านค้า</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['สินค้า', 'คำสั่งซื้อ', 'อัพเดตสถานะ', 'โปรโมชัน'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              {activeTab === tab && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

      </ScrollView>

      {/* Status Update Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>อัปเดตสถานะคำสั่งซื้อ</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Current Status */}
            <View style={styles.currentStatusBox}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.textLight }}>สถานะปัจจุบัน</Text>
                <Text style={[styles.currentStatusValue, { color: STATUS_STYLE[selectedOrder?.status]?.text || COLORS.primary }]}>
                  {selectedOrder?.status}
                </Text>
              </View>
              <Ionicons name="clipboard-outline" size={28} color={COLORS.primary} />
            </View>

            {/* Product Summary */}
            {selectedOrder && (
              <View style={styles.orderSummary}>
                <Image source={{ uri: selectedOrder.productImage }} style={styles.modalProductImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalProductName} numberOfLines={2}>{selectedOrder.productName}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textLight }}>รหัสสั่งซื้อ: #{selectedOrder.id}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 }}>฿{selectedOrder.price?.toLocaleString()}</Text>
                </View>
              </View>
            )}

            {/* Buyer */}
            {selectedOrder && (
              <View style={styles.buyerCard}>
                <View style={styles.buyerIcon}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text }}>{selectedOrder.buyerName}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textLight }}>{selectedOrder.buyerPhone}</Text>
                </View>
              </View>
            )}

            {/* Status Options */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 }}>เลือกสถานะใหม่</Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.statusOption, newStatus === opt.key && styles.statusOptionSelected]}
                onPress={() => setNewStatus(opt.key)}
              >
                <Ionicons name={opt.icon} size={22} color={opt.color} style={{ marginRight: 12 }} />
                <Text style={{ flex: 1, fontSize: 14, color: COLORS.text }}>{opt.key}</Text>
                <View style={[styles.radio, newStatus === opt.key && styles.radioSelected]}>
                  {newStatus === opt.key && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmUpdate} disabled={updatingStatus}>
              {updatingStatus
                ? <ActivityIndicator color="white" />
                : <Text style={styles.confirmBtnText}>ยืนยันการอัปเดต</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: { width: 32, height: 32, backgroundColor: COLORS.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  scrollContent: { padding: 15, paddingBottom: 100 },
  bannerContainer: { backgroundColor: '#FFF7E6', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FFE7BA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTitle: { color: '#D48806', fontWeight: '600', fontSize: 14 },
  statCard: { backgroundColor: 'white', borderRadius: SIZES.radius, padding: 15, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { color: COLORS.textLight, fontSize: 12 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  statTrend: { color: '#27AE60', fontSize: 12, fontWeight: '600' },
  statSubtext: { color: '#F5A623', fontSize: 12, fontWeight: '600' },
  manageShopBtn: { backgroundColor: '#E8EDF2', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  manageShopText: { color: COLORS.text, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 20 },
  tab: { marginRight: 20, paddingBottom: 10, position: 'relative' },
  tabText: { color: COLORS.textLight, fontSize: 14 },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  activeTabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: COLORS.primary },
  // Products tab
  inventoryActions: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  addBtn: { flex: 1, backgroundColor: COLORS.primary, flexDirection: 'row', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 5 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  filterBtn: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  productList: { backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 10 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  productStock: { fontSize: 12, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginRight: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  productActions: { flexDirection: 'row', gap: 8 },
  actionIcon: { padding: 5 },
  emptyText: { textAlign: 'center', marginVertical: 20, color: COLORS.textLight },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  // Orders tab
  orderCard: { backgroundColor: 'white', borderRadius: SIZES.radius, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  orderStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  orderStatusText: { fontSize: 11, fontWeight: 'bold' },
  orderProductRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderProductImg: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: COLORS.border },
  orderProductName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  orderBuyer: { fontSize: 13, color: COLORS.textLight },
  orderLocation: { flexDirection: 'row', gap: 6, marginBottom: 12, alignItems: 'flex-start' },
  orderLocationText: { flex: 1, fontSize: 12, color: COLORS.textLight, lineHeight: 18 },
  updateBtn: { backgroundColor: COLORS.primary, height: 44, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  updateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  completedBtn: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  completedBtnText: { color: COLORS.textLight, fontSize: 13 },
  // Update tab
  updateTabContainer: { },
  updateTabCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  updateCardImg: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  updateCardName: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 2 },
  updateCardBuyer: { fontSize: 12, color: COLORS.textLight },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  currentStatusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F6FF', borderRadius: 12, padding: 16, marginBottom: 14 },
  currentStatusValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  orderSummary: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12 },
  modalProductImg: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  modalProductName: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  buyerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 14, gap: 12 },
  buyerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  statusOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  statusOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F6FF' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },
  confirmBtn: { backgroundColor: COLORS.primary, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
