import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import YeepLogo from '../../components/YeepLogo';
import { auth, db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs } from 'firebase/firestore';

import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data
const CATEGORIES = [
  { id: 1, name: 'ของใช้', icon: 'desktop-outline', color: '#DEE4EE' },
  { id: 2, name: 'เสื้อผ้า', icon: 'shirt-outline', color: '#DEE4EE' },
  { id: 3, name: 'หนังสือ', icon: 'book-outline', color: '#DEE4EE' },
  { id: 4, name: 'อาหาร', icon: 'restaurant-outline', color: '#DEE4EE' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dbCategories, setDbCategories] = useState(CATEGORIES);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        if (!snap.empty) {
          const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const formattedCats = cats.map(c => ({ ...c, color: c.color || '#DEE4EE' }));
          setDbCategories([...formattedCats, { id: 'others', name: 'อื่นๆ', icon: 'ellipsis-horizontal-outline', color: '#DEE4EE' }]);
        } else {
          setDbCategories([{ id: 'others', name: 'อื่นๆ', icon: 'ellipsis-horizontal-outline', color: '#DEE4EE' }]);
        }
      } catch (err) {
        console.log("Error loading categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const toggleLike = async (product) => {
    if (!auth.currentUser) return;
    const isLiked = product.likes && product.likes.includes(auth.currentUser.uid);
    try {
      const prodRef = doc(db, 'products', product.id);
      await updateDoc(prodRef, {
        likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (err) {
      console.log('Toggle like error', err);
    }
  };

  useEffect(() => {
    // 1. ดึงรายการผลิตภัณฑ์แบบ Real-time
    const q = query(
      collection(db, 'products'),
      where('status', '==', 'พร้อมขาย'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(prod => typeof prod.stock === 'number' ? prod.stock > 0 : true);

      setProducts(prods);
      setLoading(false);
    });

    // 3. อัปเดต lastSeen บ่อยๆ ทุกๆ 1 นาทีที่ใช้งานแอพ
    let lastSeenInterval = null;
    if (auth.currentUser) {
      const updateLastSeen = () => {
        if (!auth.currentUser) return;
        updateDoc(doc(db, 'users', auth.currentUser.uid), { lastSeen: serverTimestamp() }).catch(() => { });
      };
      updateLastSeen(); // update immediately
      lastSeenInterval = setInterval(updateLastSeen, 60000); // and every minute
    }

    // 2. ตรวจสอบแจ้งเตือนแชทใหม่
    let chatUnsubscribe = () => { };
    if (auth.currentUser) {
      const chatQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      chatUnsubscribe = onSnapshot(chatQuery, (snapshot) => {
        if (!auth.currentUser) return;
        // ตรวจสอบว่ามีแชทไหนที่ผู้ส่งล่าสุดไม่ใช่เรา (เป็นคนอื่นทักมา)
        const hasNew = snapshot.docs.some(doc => {
          const data = doc.data();
          return data.lastSenderId !== auth.currentUser.uid;
        });
        setHasNewMessage(hasNew);
      }, (err) => console.log('Chat listener error', err));
    }

    return () => {
      unsubscribe();
      chatUnsubscribe();
      if (lastSeenInterval) clearInterval(lastSeenInterval);
    };
  }, [auth.currentUser?.uid]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <YeepLogo size={24} />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/chat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.text} />
            {hasNewMessage && (
              <View style={[styles.badge, { backgroundColor: '#FF4D4F', width: 12, height: 12, borderRadius: 6, top: -2, right: -2 }]}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' }} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/wishlist')}
          >
            <Ionicons name="heart-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.icon} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาสินค้า..."
            placeholderTextColor={COLORS.textLight}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchText.trim()) {
                router.push({ pathname: '/(tabs)/explore', params: { search: searchText.trim() } });
                setSearchText('');
              }
            }}
          />
          <TouchableOpacity onPress={() => {
            if (searchText.trim()) {
              router.push({ pathname: '/(tabs)/explore', params: { search: searchText.trim() } });
              setSearchText('');
            }
          }}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Promo Banner Placeholder */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoSubtitle}>สินค้าแนะนำสำหรับคุณ</Text>
          <Text style={styles.promoTitle}>แหล่งรวมสินค้าคุณภาพ</Text>
          <Text style={styles.promoDesc}>สินค้าแฮนด์เมด{'\n'}ราคาย่อมเยาสินค้านักศึกษา</Text>
          <TouchableOpacity style={styles.promoBtn} onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.promoBtnText}>ช้อปเลย</Text>
          </TouchableOpacity>
          <View style={styles.bannerImagePlaceholder}>
            {/* Background elements would go here */}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>หมวดหมู่</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryRow}>
          {dbCategories.slice(0, 4).map(item => (
            <TouchableOpacity key={item.id} style={styles.categoryItem} onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: item.name } })}>
              <View style={[styles.categoryIconBg, { backgroundColor: item.color }]}>
                {item.icon && /^[a-zA-Z-]+$/.test(item.icon) ? (
                  <Ionicons name={item.icon} size={28} color="#fff" />
                ) : (
                  <Text style={{ fontSize: 24 }}>{item.icon || '📦'}</Text>
                )}
              </View>
              <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* For You Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>สำหรับคุณ</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>ดูเพิ่มเติม</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ยังไม่มีสินค้าในขณะนี้</Text>
          </View>
        ) : (
          <View style={styles.productRow}>
            {products.slice(0, 4).map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150' }}
                    style={styles.productImage}
                  />
                  <TouchableOpacity
                    style={styles.likeBtn}
                    onPress={() => toggleLike(product)}
                  >
                    <Ionicons
                      name={product.likes?.includes(auth.currentUser?.uid) ? "heart" : "heart-outline"}
                      size={16}
                      color={product.likes?.includes(auth.currentUser?.uid) ? "#FF4D4F" : COLORS.icon}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>{product.price} บาท</Text>
                    <TouchableOpacity style={styles.addBtn}>
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Latest Items Section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>รายการล่าสุด</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.latestScroll}>
          {products.slice(0, 10).map(product => (
            <TouchableOpacity
              key={product.id}
              style={styles.latestCard}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <Image
                source={{ uri: product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150' }}
                style={styles.latestCardImg}
              />
              <View style={styles.latestCardInfo}>
                <Text style={styles.latestCardName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.latestCardPrice}>{product.price} บาท</Text>
                <Text style={styles.latestCardTag}>เปิดตัวใหม่</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* New Arrival Banner */}
        <View style={styles.newArrivalBanner}>
          <View>
            <Text style={styles.newArrivalTitle}>สินค้ามาใหม่</Text>
            <Text style={styles.newArrivalSub}>ค้นพบสไตล์ล่าสุด</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.exploreBtnText}>สำรวจ</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="shield-checkmark" size={80} color="#1C2E4A" style={styles.bannerIcon} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    marginLeft: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FAFAFA',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: SIZES.radius,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: COLORS.text,
  },
  promoBanner: {
    backgroundColor: '#D6DEEC',
    borderRadius: SIZES.radius,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 4,
  },
  promoTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    marginBottom: 8,
  },
  promoDesc: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 16,
    lineHeight: 18,
  },
  promoBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  promoBtnText: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryIconBg: {
    width: 60,
    height: 60,
    borderRadius: 20, // Squircle look
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#333',
    fontWeight: FONTS.medium,
  },
  productRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
    rowGap: 15,
  },
  productCard: {
    width: (width - SIZES.padding * 2 - 15) / 2, // 2 columns
    backgroundColor: '#fff',
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  latestScroll: {
    paddingBottom: 20,
  },
  latestCard: {
    width: 260,
    height: 100,
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginRight: 15,
    flexDirection: 'row',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  latestCardImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  latestCardInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  latestCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  latestCardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginVertical: 4,
  },
  latestCardTag: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#F0F0F0',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  likeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: SIZES.fontMd,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  addBtn: {
    backgroundColor: '#E6F4FE', // Light blue background
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newArrivalBanner: {
    backgroundColor: '#152033', // Dark navy background
    borderRadius: SIZES.radius,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  newArrivalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: FONTS.bold,
    color: '#fff',
    marginBottom: 4,
  },
  newArrivalSub: {
    fontSize: 12,
    color: '#8A97A8',
    marginBottom: 16,
  },
  exploreBtn: {
    backgroundColor: '#6C94C1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FONTS.bold,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.5,
  }
});
