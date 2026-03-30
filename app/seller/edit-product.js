import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const CATEGORIES = [
  { id: '1', name: 'ของใช้', icon: 'desktop-outline' },
  { id: '2', name: 'เสื้อผ้า', icon: 'shirt-outline' },
  { id: '3', name: 'หนังสือ', icon: 'book-outline' },
  { id: '4', name: 'อาหาร', icon: 'restaurant-outline' },
  { id: '5', name: 'อื่นๆ', icon: 'ellipsis-horizontal-outline' },
];

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [images, setImages] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // แผนที่
  const [region, setRegion] = useState({
    latitude: 13.7563,
    longitude: 100.5018,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoords, setMarkerCoords] = useState(null);

  // ดึงข้อมูลเดิมจาก Firestore
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setCategory(data.category || '');
          setPrice(data.price?.toString() || '');
          setStock(data.stock?.toString() || '1');
          setDescription(data.description || '');
          setLocation(data.location || '');
          
          if (data.coords) {
            setMarkerCoords(data.coords);
            setRegion({
              ...data.coords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setIsPinned(true);
          }
          
          if (data.images && data.images.length > 0) {
            setImages(data.images.map(img => ({ 
              uri: img, // ใน edit-product เราจะใช้ Base64 string เป็น URI ได้เลย
              base64: img 
            })));
          }
        } else {
          Alert.alert('ไม่พบข้อมูล', 'ไม่พบสินค้าที่คุณต้องการแก้ไขครับ');
          router.back();
        }
      } catch (error) {
        console.error(error);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสินค้าได้ครับ');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('คำเตือน', 'กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งที่ตั้งก่อนครับ');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      
      setMarkerCoords(coords);
      setRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIsPinned(true);
    } catch (error) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงตำแหน่งปัจจุบันได้ครับ');
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('จำกัดจำนวนรูป', 'คุณสามารถเพิ่มรูปภาพได้สูงสุด 5 รูป');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled) {
      const newImage = {
        uri: result.assets[0].uri,
        base64: `data:image/jpeg;base64,${result.assets[0].base64}`
      };
      setImages([...images, newImage]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const incrementStock = () => setStock((parseInt(stock) + 1).toString());
  const decrementStock = () => {
    const current = parseInt(stock);
    if (current > 0) setStock((current - 1).toString());
  };

  const handleUpdate = async () => {
    if (!name || !price || !category) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setSubmitting(true);
    try {
      const base64Images = images.map(img => img.base64);

      await updateDoc(doc(db, 'products', id), {
        name,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        description,
        location,
        coords: markerCoords,
        images: base64Images,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว!');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? ข้อมูลจะหายไปถาวรและไม่สามารถเรียกคืนได้ครับ',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบสินค้า', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, 'products', id));
              Alert.alert('สำเร็จ', 'ลบสินค้าออกเรียบร้อยแล้วครับ');
              router.back();
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบสินค้าได้ในขณะนี้ครับ');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูลสินค้า...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขสินค้า</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Image Picker Section */}
          <Text style={styles.label}>รูปภาพสินค้า</Text>
          <View style={styles.imageContainer}>
            <TouchableOpacity style={styles.addImageBox} onPress={pickImage}>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={styles.addImageText}>เพิ่มรูปภาพ</Text>
            </TouchableOpacity>
            
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
                {index === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>หน้าปก</Text></View>}
              </View>
            ))}
          </View>
          <Text style={styles.hint}>สูงสุด 5 รูป รูปแรกจะเป็นรูปหน้าปก</Text>

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>ชื่อสินค้า</Text>
            <TextInput 
              style={styles.input}
              placeholder="คุณกำลังขายอะไร?"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>หมวดหมู่</Text>
            <TouchableOpacity 
              style={styles.dropdown} 
              onPress={() => setIsCategoryModalVisible(true)}
            >
              <Text style={category ? styles.inputText : styles.placeholderText}>
                {category || 'เลือกหมวดหมู่'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.label}>ราคา</Text>
            <TextInput 
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>สต็อก</Text>
            <View style={styles.stockContainer}>
              <TouchableOpacity onPress={decrementStock} style={styles.stockBtn}>
                <Ionicons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TextInput 
                style={styles.stockInput}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />
              <TouchableOpacity onPress={incrementStock} style={styles.stockBtn}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>รายละเอียดสินค้า</Text>
            <TextInput 
              style={[styles.input, styles.textArea]}
              placeholder="อธิบายสินค้า สภาพ และคุณสมบัติพิเศษ..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.locationHeaderRow}>
              <Text style={styles.label}>สถานที่นัดรับ</Text>
              <TouchableOpacity style={styles.useCurrentBtn} onPress={getCurrentLocation}>
                <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
                <Text style={styles.useCurrentText}>ตำแหน่งปัจจุบัน</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.locationInputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.locationIcon} />
              <TextInput 
                style={styles.locationInput}
                placeholder="ป้อนย่านหรือชื่อเมือง"
                value={location}
                onChangeText={setLocation}
              />
            </View>
            
            {/* Real Map View */}
            <View style={[styles.mapContainer, isPinned && styles.mapPinned]}>
              <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={(e) => {
                  setMarkerCoords(e.nativeEvent.coordinate);
                  setIsPinned(true);
                }}
              >
                {markerCoords && (
                  <Marker coordinate={markerCoords} />
                )}
              </MapView>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={[styles.saveBtn, submitting && styles.btnDisabled]} 
            onPress={handleUpdate}
            disabled={submitting || deleting}
          >
            {submitting ? (
               <ActivityIndicator color="white" />
            ) : (
               <>
                 <Ionicons name="save-outline" size={20} color="white" />
                 <Text style={styles.saveBtnText}>บันทึกสินค้า</Text>
               </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteBtn, deleting && styles.btnDisabled]} 
            onPress={handleDelete}
            disabled={submitting || deleting}
          >
            {deleting ? (
               <ActivityIndicator color={COLORS.error} />
            ) : (
               <Text style={styles.deleteBtnText}>ลบสินค้า</Text>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* Category Modal */}
        <Modal
          visible={isCategoryModalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>เลือกหมวดหมู่สินค้า</Text>
                <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={CATEGORIES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.categorySelectItem}
                    onPress={() => {
                      setCategory(item.name);
                      setIsCategoryModalVisible(false);
                    }}
                  >
                    <Ionicons name={item.icon} size={24} color={COLORS.primary} style={styles.catIcon} />
                    <Text style={styles.catName}>{item.name}</Text>
                    {category === item.name && (
                      <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textLight },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  scrollContent: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, marginTop: 15 },
  imageContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addImageBox: {
    width: 100, height: 100, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.primary,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background,
  },
  addImageText: { fontSize: 10, color: COLORS.primary, marginTop: 5 },
  imageWrapper: { position: 'relative' },
  selectedImage: { width: 100, height: 100, borderRadius: SIZES.radius },
  removeImageBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius, paddingVertical: 2, alignItems: 'center',
  },
  coverText: { color: 'white', fontSize: 10 },
  hint: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginTop: 8 },
  form: { marginTop: 10 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, padding: 15, fontSize: 16 },
  inputText: { fontSize: 16, color: COLORS.text },
  placeholderText: { fontSize: 16, color: COLORS.textLight },
  dropdown: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius,
    padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  stockContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 10, height: 55,
  },
  stockBtn: { padding: 10 },
  stockInput: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  textArea: { height: 120 },
  locationInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 15,
  },
  locationIcon: { marginRight: 10 },
  locationInput: { flex: 1, height: 55, fontSize: 16 },
  mapContainer: {
    height: 200, borderRadius: SIZES.radius, marginTop: 15, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: COLORS.border,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapPinned: { borderColor: COLORS.primary, borderWidth: 2 },
  locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 10 },
  useCurrentBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F4FE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, gap: 4 },
  useCurrentText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: COLORS.primary, height: 55, borderRadius: SIZES.radius,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 10, elevation: 3,
  },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  deleteBtn: {
    height: 55, borderRadius: SIZES.radius, justifyContent: 'center', alignItems: 'center', marginTop: 12,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  deleteBtnText: { color: COLORS.error, fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  categorySelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catIcon: { marginRight: 15 },
  catName: { flex: 1, fontSize: 16, color: COLORS.text },
  btnDisabled: { opacity: 0.7 },
});
