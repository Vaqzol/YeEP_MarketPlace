import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import YeepLogo from '../../components/YeepLogo';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { auth } from '../../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');
  
  const handleNext = async () => {
    if (!email) {
      setErrorMSG('กรุณากรอกอีเมล');
      return;
    }

    setIsLoading(true);
    setErrorMSG('');

    try {
      await sendPasswordResetEmail(auth, email);
      // Skip OTP for Firebase default reset flow, just go to success screen
      router.push('/(auth)/reset-success');
    } catch (error) {
      console.error("Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
         setErrorMSG('ไม่พบบัญชีผู้ใช้นี้');
      } else if (error.code === 'auth/invalid-email') {
         setErrorMSG('รูปแบบอีเมลไม่ถูกต้อง');
      } else {
         setErrorMSG('เกิดข้อผิดพลาด: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
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
            
            <Text style={styles.titleText}>ลืมรหัสผ่าน</Text>
            
            <View style={styles.formContainer}>
              <Text style={styles.headingText}>Email</Text>
              
              <Text style={styles.instructionText}>โปรดกรอก Email ของคุณ</Text>
              
              <CustomInput 
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              
              {errorMSG ? <Text style={styles.errorText}>{errorMSG}</Text> : null}
              
              <View style={styles.buttonContainer}>
                <CustomButton 
                  title={isLoading ? "ส่งอีเมล..." : "ถัดไป"} 
                  onPress={handleNext} 
                  style={styles.nextBtn}
                  disabled={isLoading}
                />
              </View>
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
    minHeight: 500, // Matching the long card in UI
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
    marginBottom: 40,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    flex: 1,
  },
  headingText: {
    fontSize: SIZES.fontXxl - 2,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    marginBottom: 12,
  },
  buttonContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
  },
  nextBtn: {
    width: 100,
    backgroundColor: '#6C94C1',
    height: 40,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontSm,
    marginBottom: 10,
  },
});
