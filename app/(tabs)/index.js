import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import YeepLogo from '../../components/YeepLogo';

const { width } = Dimensions.get('window');

// Mock Data
const CATEGORIES = [
  { id: 1, name: 'ของใช้', icon: 'desktop-outline', color: '#DEE4EE' },
  { id: 2, name: 'เสื้อผ้า', icon: 'shirt-outline', color: '#DEE4EE' },
  { id: 3, name: 'หนังสือ', icon: 'book-outline', color: '#DEE4EE' },
  { id: 4, name: 'อาหาร', icon: 'restaurant-outline', color: '#DEE4EE' },
];

const PRODUCTS = [
  {
    id: 1,
    name: 'กระเป๋ามือสอง',
    price: '199',
    rating: '4.8 (1)',
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400',
    isLiked: true,
  },
  {
    id: 2,
    name: 'เดรสมือสองสภาพดี',
    price: '85',
    rating: '4.5 (1)',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
    isLiked: false,
  }
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <YeepLogo size={24} />
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="cart-outline" size={24} color={COLORS.text} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
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
          />
          <TouchableOpacity>
            <Ionicons name="mic-outline" size={20} color={COLORS.icon} />
          </TouchableOpacity>
        </View>

        {/* Promo Banner Placeholder */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoSubtitle}>สินค้าแนะนำสำหรับคุณ</Text>
          <Text style={styles.promoTitle}>แหล่งรวมสินค้าคุณภาพ</Text>
          <Text style={styles.promoDesc}>สินค้าแฮนด์เมด{'\n'}ราคาย่อมเยาสินค้านักศึกษา</Text>
          <TouchableOpacity style={styles.promoBtn}>
            <Text style={styles.promoBtnText}>ช้อปเลย</Text>
          </TouchableOpacity>
          <View style={styles.bannerImagePlaceholder}>
            {/* Background elements would go here */}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>หมวดหมู่</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.categoryRow}>
          {CATEGORIES.map(item => (
            <View key={item.id} style={styles.categoryItem}>
              <View style={[styles.categoryIconBg, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={28} color="#fff" />
              </View>
              <Text style={styles.categoryName}>{item.name}</Text>
            </View>
          ))}
        </View>

        {/* For You Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>สำหรับคุณ</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>ดูเพิ่มเติม</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productRow}>
          {PRODUCTS.map(product => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <TouchableOpacity style={styles.likeBtn}>
                  <Ionicons 
                    name={product.isLiked ? "heart" : "heart-outline"} 
                    size={16} 
                    color={product.isLiked ? COLORS.primary : COLORS.icon} 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#FFC107" />
                  <Text style={styles.ratingText}>{product.rating}</Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>{product.price} บาท</Text>
                  <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* New Arrival Banner */}
        <View style={styles.newArrivalBanner}>
          <View>
            <Text style={styles.newArrivalTitle}>สินค้ามาใหม่</Text>
            <Text style={styles.newArrivalSub}>ค้นพบสไตล์ล่าสุด</Text>
            <TouchableOpacity style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>สำรวจ</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="checkmark-decagram" size={80} color="#1C2E4A" style={styles.bannerIcon} />
        </View>
        <View style={{ height: 20 }} />

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
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  productCard: {
    width: (width - SIZES.padding * 2 - 15) / 2, // 2 columns
    backgroundColor: '#fff',
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
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
