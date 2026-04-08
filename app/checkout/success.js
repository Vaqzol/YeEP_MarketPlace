import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function CheckoutSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>คำสั่งซื้อ</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        
        {/* Success Card */}
        <View style={styles.successCard}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={60} color="white" />
          </View>
          <Text style={styles.successTitle}>สั่งซื้อเสร็จสิ้น</Text>
        </View>

        {/* Message */}
        <Text style={styles.messageText}>
          พัสดุของคุณจะถูกจัดส่งภายใน 7 วัน{'\n'}หากมีข้อสงสัย โปรดติดต่อคนขาย
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => {
              // Nav to My Orders (placeholder if it doesn't exist yet, we just go to home or user profile)
              router.push('/');
              alert('กำลังพาไปหน้า คำสั่งซื้อของฉัน (กำลังพัฒนา)');
            }}
          >
            <Text style={styles.primaryBtnText}>คำสั่งซื้อของฉัน</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => router.push('/')}
          >
            <Text style={styles.secondaryBtnText}>กลับสู่หน้าหลัก</Text>
          </TouchableOpacity>
        </View>

      </View>
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
  headerBtn: { padding: 5, width: 40 },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80 // ยกให้เนื้อหาอยู่กึ่งกลางค่อนไปขวางบนนิดหน่อย
  },

  successCard: {
    backgroundColor: 'white',
    width: '100%',
    paddingVertical: 50,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 40
  },
  checkCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#00A651', // Green color from design
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20
  },
  successTitle: {
    fontSize: 22, fontWeight: 'bold', color: COLORS.text
  },

  messageText: {
    fontSize: 14, color: COLORS.textLight, textAlign: 'center',
    lineHeight: 24, marginBottom: 40
  },

  actionsBox: {
    flexDirection: 'row', gap: 15, width: '100%', paddingHorizontal: 10
  },
  primaryBtn: {
    flex: 1, backgroundColor: '#6C94C1', 
    height: 48, borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center'
  },
  primaryBtnText: {
    color: 'white', fontWeight: 'bold', fontSize: 15
  },
  secondaryBtn: {
    flex: 1, backgroundColor: '#6C94C1', 
    height: 48, borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center'
  },
  secondaryBtnText: {
    color: 'white', fontWeight: 'bold', fontSize: 15
  }
});
