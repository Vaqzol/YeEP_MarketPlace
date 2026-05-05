import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import YeepLogo from '../../components/YeepLogo';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');
  
  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setErrorMSG('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    if (password.length < 8) {
      setErrorMSG('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setErrorMSG('');

    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP and user data temporarily to Firestore
      await setDoc(doc(db, "otps", email), {
        firstName,
        lastName,
        email,
        password,
        otp,
        createdAt: serverTimestamp()
      });

      // Send OTP via Google Apps Script
      const gasUrl = 'https://script.google.com/macros/s/AKfycbwyUrvcgGSlGHXABITi1H0ODdbl2r8qjCygKs1MSaKP9HlBs1eJydO6LELRxKzBjD51/exec';
      
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors', // GAS web app requires no-cors for simple fetch if not handling OPTIONS
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp })
        });
      } catch (e) {
        console.log("GAS fetch error (often ignorable with no-cors):", e);
      }

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { email }
      });
    } catch (error) {
      console.error("Register Error:", error);
      setErrorMSG('เกิดข้อผิดพลาด: ' + error.message);
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
            
            <Text style={styles.welcomeText}>สร้างบัญชี</Text>
            <View style={styles.spacer} />
            
            <View style={styles.formContainer}>
              <CustomInput 
                label="ชื่อ"
                placeholder=""
                value={firstName}
                onChangeText={setFirstName}
              />
              
              <CustomInput 
                label="นามสกุล"
                placeholder=""
                value={lastName}
                onChangeText={setLastName}
              />
              
              <CustomInput 
                label="อีเมล"
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              
              <View style={styles.passwordContainer}>
                <CustomInput 
                  label="รหัสผ่าน"
                  placeholder=""
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <Text style={styles.passwordHint}>ใช้อักขระ 8 ตัวขึ้นไป</Text>
              </View>
              
              {errorMSG ? <Text style={styles.errorText}>{errorMSG}</Text> : null}
              
              <CustomButton 
                title={isLoading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"} 
                onPress={handleRegister} 
                style={styles.registerBtn}
                disabled={isLoading}
              />
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>มีบัญชีอยู่แล้ว? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>ลงชื่อเข้าใช้</Text>
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
  welcomeText: {
    fontSize: SIZES.fontXl,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    marginBottom: 8,
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
  formContainer: {
    width: '100%',
  },
  passwordContainer: {
    marginBottom: 10,
  },
  passwordHint: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -8,
    marginBottom: 16,
  },
  registerBtn: {
    marginBottom: 24,
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontSm,
    textAlign: 'center',
    marginBottom: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
