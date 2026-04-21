import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, Alert, TextInput, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import YeepLogo from '../../components/YeepLogo';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (auth.currentUser) {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const pickImage = async () => {
    try {
      // 1. ขออนุญาตเข้าถึงอัลบั้ม
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('คำเตือน', 'กรุณาอนุญาตให้แอปเข้าถึงรูปภาพก่อนครับ');
        return;
      }

      // 2. เลือกรูป
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled) {
        setIsUpdating(true);
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // 3. อัปเดตลง Firestore
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            profileImage: base64Img
          });
          
          // 4. อัปเดต State ในหน้าจอ
          setUserData({ ...userData, profileImage: base64Img });
          Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเปลี่ยนรูปโปรไฟล์ได้ครับ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ยืนยันการออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ออกจากระบบ', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ครับ');
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header matching main screen */}
      <View style={styles.header}>
        <YeepLogo size={24} />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="cart-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.pageTitle}>บัญชีของฉัน</Text>

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={isUpdating} style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {userData?.profileImage ? (
                <Image source={{ uri: userData.profileImage }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={80} color="#DDD" style={{ alignSelf: 'center', marginTop: 15 }} />
              )}
              {isUpdating && (
                <View style={[styles.avatarImg, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color="white" />
                </View>
              )}
            </View>
            <Text style={styles.editAvatarText}>แก้ไข</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>ชื่อ</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputText}>{userData?.firstName || 'NongOpal'}</Text>
          </View>

          <Text style={styles.fieldLabel}>นามสกุล</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputText}>{userData?.lastName || 'MaiKinPak'}</Text>
          </View>

          <Text style={styles.fieldLabel}>อีเมล</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputText}>{auth.currentUser?.email || 'user@example.com'}</Text>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>รหัสผ่าน</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.linkText}>เปลี่ยนรหัสผ่าน</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputBox}>
            <TextInput 
              style={styles.passwordInput}
              value="password"
              secureTextEntry={true}
              editable={false}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.blueBtn} onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.blueBtnText}>ประวัติการสั่งซื้อ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.blueBtn, { backgroundColor: '#5B7FC4' }]} onPress={() => router.push({
            pathname: `/chat/${[auth.currentUser.uid, 'admin'].sort().join('_')}`,
            params: { sellerId: 'admin' }
          })}>
            <Text style={styles.blueBtnText}>💬 ติดต่อแอดมิน</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.blueBtn} onPress={handleLogout}>
            <Text style={styles.blueBtnText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerRight: { flexDirection: 'row', gap: 15 },
  iconBtn: { position: 'relative' },
  scrollContent: { padding: 20, alignItems: 'center' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 10, marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: { alignItems: 'center' },
  avatarCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F2F5', overflow: 'hidden', borderWidth: 1, borderColor: '#EEE', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  editAvatarText: { color: COLORS.textLight, marginTop: 8, fontSize: 14, textAlign: 'center' },
  form: { width: '100%', marginBottom: 30 },
  fieldLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  linkText: { fontSize: 12, color: COLORS.textLight },
  inputBox: {
    width: '100%', height: 45, backgroundColor: 'white', borderRadius: 10,
    borderWidth: 1, borderColor: '#D1D9E6', paddingHorizontal: 15, justifyContent: 'center',
  },
  inputText: { fontSize: 15, color: COLORS.text },
  passwordBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passwordInput: { flex: 1, fontSize: 15, color: COLORS.text },
  actionSection: { width: '100%', gap: 15 },
  blueBtn: {
    width: '100%', height: 45, backgroundColor: '#6C94C1', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  blueBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
