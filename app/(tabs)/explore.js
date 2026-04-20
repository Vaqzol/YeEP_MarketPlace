import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { db, auth } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const FILTER_CHIPS = [
  { id: 'all', name: 'ทั้งหมด' },
  { id: 'handmade', name: 'สินค้าแฮนด์เมด' },
  { id: 'clothing', name: 'เสื้อผ้า' },
  { id: 'food', name: 'อาหาร' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

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
    const q = query(
      collection(db, 'products'),
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

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'all' || item.category === activeFilter || (activeFilter === 'handmade' && item.category === 'อื่นๆ'); 
    // Note: mapping logic can be refined later based on real categories
    return matchesSearch && matchesFilter;
  });

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
          style={styles.likeBtn}
          onPress={() => toggleLike(item)}
        >
          <Ionicons 
            name={item.likes?.includes(auth.currentUser?.uid) ? "heart" : "heart-outline"} 
            size={16} 
            color={item.likes?.includes(auth.currentUser?.uid) ? "#FF4D4F" : COLORS.icon} 
          />
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

        <TouchableOpacity 
          style={styles.detailBtn}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          <Text style={styles.detailBtnText}>ดูรายละเอียด</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.icon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity>
            <Ionicons name="mic-outline" size={20} color={COLORS.icon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={{ height: 50, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {FILTER_CHIPS.map(chip => (
            <TouchableOpacity 
              key={chip.id} 
              style={[
                styles.chip, 
                activeFilter === chip.id && styles.activeChip
              ]}
              onPress={() => setActiveFilter(chip.id)}
            >
              <Text style={[
                styles.chipText,
                activeFilter === chip.id && styles.activeChipText
              ]}>
                {chip.name}
              </Text>
              {chip.id !== 'all' && (
                 <Ionicons 
                   name="chevron-down" 
                   size={14} 
                   color={activeFilter === chip.id ? 'white' : COLORS.textLight} 
                   style={{ marginLeft: 4 }} 
                 />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่พบสินค้าที่คุณกำลังค้นหา</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: 'white' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    borderRadius: 12, paddingHorizontal: 15, height: 50, gap: 10
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text },
  chipContainer: { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9ECEF',
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20,
  },
  activeChip: { backgroundColor: '#6C94C1' },
  chipText: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  activeChipText: { color: 'white' },
  listContent: { padding: 15, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  productCard: {
    width: (width - 45) / 2, backgroundColor: 'white',
    borderRadius: 15, marginBottom: 15, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  imageContainer: { width: '100%', height: 160, position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  likeBtn: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'white',
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center'
  },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  ratingText: { fontSize: 11, color: COLORS.textLight },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },
  detailBtn: {
    borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center'
  },
  detailBtnText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.textLight, fontSize: 14 },
});
