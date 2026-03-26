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

export default function NewPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleComplete = () => {
    // Navigate to reset password success
    router.replace('/(auth)/reset-success');
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
            
            <Text style={styles.titleText}>สร้างรหัสผ่านใหม่</Text>
            
            <View style={styles.formContainer}>
              <CustomInput 
                label="รหัสผ่านใหม่"
                placeholder="XXXXXX"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              
              <View style={styles.spacing} />
              
              <CustomInput 
                label="กรอกรหัสผ่านอีกครั้ง"
                placeholder="XXXXXX"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              
              <View style={styles.buttonContainer}>
                <CustomButton 
                  title="เสร็จสิ้น" 
                  onPress={handleComplete} 
                  style={styles.doneBtn}
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
    minHeight: 500,
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
  spacing: {
    height: 12,
  },
  buttonContainer: {
    alignItems: 'flex-start',
    marginTop: 16,
  },
  doneBtn: {
    width: 100,
    height: 40,
    backgroundColor: '#6C94C1', 
  }
});
