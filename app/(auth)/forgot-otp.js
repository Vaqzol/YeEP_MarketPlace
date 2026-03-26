import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import YeepLogo from '../../components/YeepLogo';
import OTPInput from '../../components/OTPInput';
import CustomButton from '../../components/CustomButton';

export default function ForgotOTPScreen() {
  const [otp, setOtp] = useState('');
  
  const handleVerify = () => {
    // Navigate to create new password
    router.push('/(auth)/new-password');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <YeepLogo size={28} />
          </View>
          
          <View style={styles.cardContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="bag-handle-outline" size={24} color={COLORS.primary} />
            </View>
            
            <Text style={styles.titleText}>ยืนยันตัวตน</Text>
            
            <View style={styles.formContainer}>
              <Text style={styles.headingText}>OTP</Text>
              
              <View style={styles.instructionRow}>
                <Text style={styles.instructionText}>กรอกรหัส OTP สำหรับการยืนยันตัวตน</Text>
                <Text style={styles.timerText}>00:58</Text>
              </View>
              
              <OTPInput 
                length={5}
                value={otp}
                onChangeText={setOtp}
              />
              
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>รหัส </Text>
                <Text style={styles.infoHighlight}>OTP</Text>
                <Text style={styles.infoText}> ถูกส่งไปยัง Email ของคุณ</Text>
              </View>
              
              <TouchableOpacity style={styles.resendContainer}>
                <Text style={styles.resendText}>ส่งรหัสอีกครั้ง</Text>
              </TouchableOpacity>
              
              <View style={styles.buttonContainer}>
                <CustomButton 
                  title="ยืนยัน" 
                  onPress={handleVerify} 
                  style={styles.verifyBtn}
                />
              </View>
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>มีบัญชีอยู่แล้ว? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </View>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.padding,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F5FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: SIZES.fontXl,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  headingText: {
    fontSize: SIZES.fontXxl,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    marginBottom: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
  },
  timerText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    fontWeight: FONTS.medium,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
  },
  infoHighlight: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: FONTS.medium,
  },
  resendContainer: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  resendText: {
    fontSize: SIZES.fontSm,
    color: '#8A9BA8', 
    fontWeight: FONTS.medium,
  },
  buttonContainer: {
    alignItems: 'flex-start',
  },
  verifyBtn: {
    width: 100,
    height: 40,
    backgroundColor: '#6C94C1', 
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  footerText: {
    fontSize: SIZES.fontReg,
    color: COLORS.text,
  },
  footerLink: {
    fontSize: SIZES.fontReg,
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  }
});
