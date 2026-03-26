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
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');
  
  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMSG('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    setErrorMSG('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (error) {
      console.error("Login Error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
         setErrorMSG('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
         setErrorMSG('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
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
            
            <Text style={styles.welcomeText}>ยินดีต้อนรับกลับมา!</Text>
            <Text style={styles.subText}>
              ตลาดซื้อขายสำหรับนักศึกษา แหล่งรวมทุกสิ่งที่คุณต้องการ
            </Text>
            
            <View style={styles.formContainer}>
              <CustomInput 
                label="อีเมล"
                placeholder="yourname@university.edu"
                iconName="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              
              <CustomInput 
                label="รหัสผ่าน"
                placeholder="••••••••"
                iconName="lock-closed-outline"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              
              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.checkboxContainer}>
                  <View style={styles.checkbox} />
                  <Text style={styles.checkboxText}>จดจำฉันไว้</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotPassword}>ลืมรหัสผ่าน?</Text>
                </TouchableOpacity>
              </View>
              
              {errorMSG ? <Text style={styles.errorText}>{errorMSG}</Text> : null}
              
              <CustomButton 
                title={isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"} 
                onPress={handleLogin} 
                style={styles.loginBtn}
                disabled={isLoading}
              />
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>หรือดำเนินการต่อด้วย</Text>
                <View style={styles.divider} />
              </View>
              
              <CustomButton 
                title="Google" 
                type="outline"
                iconName="logo-google"
                iconColor="#DB4437"
                onPress={() => {}} 
              />
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>ยังไม่มีบัญชี YeEP? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerLink}>สร้างบัญชีใหม่</Text>
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
    backgroundColor: '#EBEBEB', // Light gray background behind card
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding,
    paddingTop: 40,
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
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: SIZES.fontSm,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: '#FAFAFA',
  },
  checkboxText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
  },
  forgotPassword: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: FONTS.medium,
  },
  loginBtn: {
    marginBottom: 24,
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
    marginTop: -10,
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
