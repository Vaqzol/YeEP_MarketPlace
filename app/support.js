import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';

export default function DeprecatedSupportScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // พาผู้ใช้กลับไปหน้ากล่องข้อความหลักแทน เพราะย้ายระบบ Support เข้าระบบ Chat หลักแล้ว
      router.replace('/(tabs)/inbox');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 16, color: COLORS.textLight }}>กำลังโหลดหน้าแชทหลัก...</Text>
    </View>
  );
}
