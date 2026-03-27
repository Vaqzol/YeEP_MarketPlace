import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, SIZES } from '../../constants/theme';
import SuccessScreen from '../../components/SuccessScreen';
import CustomButton from '../../components/CustomButton';

export default function ResetSuccessScreen() {
  const handleContinue = () => {
    // Navigate to Login
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.cardContainer}>
          <SuccessScreen 
            title="ส่งลิงก์สำเร็จ" 
            subtitle="กรุณาตรวจสอบอีเมลของคุณเพื่อตั้งรหัสผ่านใหม่" 
          />
          
          <View style={styles.buttonContainer}>
            <CustomButton 
              title="เข้าสู่ระบบ" 
              onPress={handleContinue} 
              style={styles.loginBtn}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EBEBEB',
  },
  container: {
    flex: 1,
    padding: SIZES.padding,
    paddingTop: 40,
    paddingBottom: 40,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  buttonContainer: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  loginBtn: {
    backgroundColor: '#6C94C1', 
  }
});
