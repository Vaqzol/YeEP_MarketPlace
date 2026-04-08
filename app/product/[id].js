import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, Platform, ActivityIndicator, Share, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Product
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() };
          setProduct(productData);

          // อัปเดตยอดเข้าชม (Views)
          try {
            await updateDoc(docRef, { views: increment(1) });
          } catch (err) {
            console.log('Error updating views', err);
          }

          // 2. Fetch Seller Info if sellerId exists
          if (productData.sellerId) {
            const sellerRef = doc(db, 'users', productData.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              setSeller(sellerSnap.data());
            }
          }
        } else {
          Alert.alert('ขออภัย', 'ไม่พบข้อมูลสินค้าชิ้นนี้ครับ');
          router.back();
        }
      } catch (error) {
        console.error(error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้ครับ');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ดูสินค้าชิ้นนี้บน YeEP: ${product.name} ราคา ${product.price} บาท`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สินค้า</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400' }} 
            style={styles.productImage} 
          />
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <TouchableOpacity onPress={() => setIsLiked(!isLiked)}>
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={28} 
                color={isLiked ? COLORS.primary : COLORS.textLight} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.productPrice}>{product.price.toLocaleString()} บาท</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>คำอธิบาย</Text>
          <Text style={styles.productDescription}>
            {product.description || 'ไม่มีคำอธิบายสำหรับสินค้าชิ้นนี้'}
          </Text>

          <View style={styles.divider} />

          {/* Seller Section */}
          <View style={styles.sellerRow}>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                {seller?.profileImage ? (
                  <Image source={{ uri: seller.profileImage }} style={styles.sellerAvatarImg} />
                ) : (
                  <Ionicons name="person" size={24} color="#999" />
                )}
              </View>
              <View>
                <Text style={styles.sellerName}>
                  {seller ? `${seller.firstName} ${seller.lastName}` : 'ไม่พบข้อมูลผู้ขาย'}
                </Text>
                <View style={styles.sellerRating}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={styles.ratingText}>4.9 (50 รีวิว)</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Location Section */}
          <Text style={styles.sectionLabel}>สถานที่นัดรับ</Text>
          <Text style={styles.locationName}>{product.location || 'ไม่ระบุสถานที่'}</Text>
          
          {product.coords && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  ...product.coords,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={product.coords} />
              </MapView>
            </View>
          )}

        <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>

      {/* Action Bar */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        <TouchableOpacity 
          style={styles.contactBtn}
          onPress={() => {
            if (!auth.currentUser) {
              Alert.alert('กรุณาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบเพื่อเริ่มการแชทครับ');
              return;
            }
            if (!seller) return;
            if (auth.currentUser.uid === product.sellerId) {
              Alert.alert('ขออภัย', 'คุณไม่สามารถแชทกับตัวเองได้ครับ');
              return;
            }
            // สร้าง chatId จาก uid สองคนเรียงตามตัวอักษร
            const myUid = auth.currentUser.uid;
            const sellerUid = product.sellerId;
            const chatId = myUid < sellerUid ? `${myUid}_${sellerUid}` : `${sellerUid}_${myUid}`;
            
            router.push({
              pathname: `/chat/${chatId}`,
              params: { productId: id, sellerId: product.sellerId }
            });
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.contactBtnText}>ติดต่อ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addToCartBtn}
          onPress={async () => {
            if (!auth.currentUser) {
              Alert.alert('กรุณาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบก่อนครับ');
              return;
            }
            if (auth.currentUser.uid === product.sellerId) {
              Alert.alert('ขออภัย', 'ไม่สามารถสร้างรายการสั่งซื้อสินค้าของตัวเองได้ครับ');
              return;
            }
            try {
              const cartRef = doc(db, 'carts', auth.currentUser.uid, 'items', id);
              const cartSnap = await getDoc(cartRef);

              if (cartSnap.exists()) {
                await updateDoc(cartRef, {
                  quantity: cartSnap.data().quantity + 1,
                  updatedAt: serverTimestamp()
                });
              } else {
                await setDoc(cartRef, {
                  productId: id,
                  name: product.name,
                  price: product.price,
                  image: product.images?.[0] || null,
                  sellerId: product.sellerId,
                  quantity: 1,
                  addedAt: serverTimestamp()
                });
              }
              Alert.alert('สำเร็จ', 'เพิ่มสินค้าลงตะกร้าเรียบร้อยแล้ว!');
            } catch (error) {
              console.error(error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มลงตะกร้าได้ครับ');
            }
          }}
        >
          <Ionicons name="cart-outline" size={20} color="white" />
          <Text style={styles.addToCartText}>เพิ่มลงตะกร้า</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  safeArea: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { width: width, height: width, backgroundColor: '#F0F0F0' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  infoContainer: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { flex: 1, fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginRight: 15 },
  productPrice: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginTop: 10 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  productDescription: { fontSize: 15, color: COLORS.textLight, lineHeight: 22 },
  sellerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  sellerAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  sellerRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: COLORS.textLight },
  viewProfileBtn: { backgroundColor: '#F0F2F5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  viewProfileText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  locationName: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  mapContainer: { height: 200, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  map: { ...StyleSheet.absoluteFillObject },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: 'white', padding: 15,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  contactBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  addToCartBtn: {
    flex: 2, flexDirection: 'row', height: 50, borderRadius: 12,
    backgroundColor: '#6C94C1',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  addToCartText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
