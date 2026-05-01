import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayRemove } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function WishlistScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'products'),
      where('likes', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUnlike = async (productId) => {
    if (!auth.currentUser) return;
    try {
      const prodRef = doc(db, 'products', productId);
      await updateDoc(prodRef, {
        likes: arrayRemove(auth.currentUser.uid)
      });
    } catch (err) {
      console.log('Unlike error', err);
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/150' }} 
          style={styles.productImage} 
        />
        <TouchableOpacity 
          style={styles.heartBtn}
          onPress={() => handleUnlike(item.id)}
        >
          <Ionicons name="heart" size={18} color="#FF4D4F" />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FFC107" />
          <Text style={styles.ratingText}>
            {item.reviewCount > 0 
              ? (item.totalRating / item.reviewCount).toFixed(1) 
              : '0'} ({item.reviewCount || 0})
          </Text>
        </View>

        <Text style={styles.productPrice}>{item.price} บาท</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สินค้าที่ถูกใจ</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={70} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>ยังไม่มีสินค้าที่ถูกใจ</Text>
          <Text style={styles.emptyDesc}>กดปุ่ม ❤️ ที่สินค้าเพื่อบันทึกไว้ดูภายหลังครับ</Text>
          <TouchableOpacity 
            style={styles.shopBtn}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.shopBtnText}>ไปดูสินค้า</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backBtn: { padding: 4 },
  listContainer: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: { 
    width: '100%', 
    height: CARD_WIDTH, 
    backgroundColor: '#F0F4F8',
    position: 'relative' 
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'white', borderRadius: 20,
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ratingText: { fontSize: 12, color: COLORS.textLight, marginLeft: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 20 },
  emptyDesc: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  shopBtn: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 32,
    backgroundColor: COLORS.primary, borderRadius: 12
  },
  shopBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
