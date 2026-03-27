import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async (user) => {
      try {
        if (user) {
          const rememberMe = await AsyncStorage.getItem('rememberMe');
          // ถ้าเคยกดจดจำฉันไว้ ให้ไปหน้าหลักเลย
          if (rememberMe === 'true') {
            setInitialRoute('/(tabs)');
          } else {
            // ถ้าไม่ได้กดจดจำฉันไว้ ให้บังคับล็อกเอาท์
            await auth.signOut();
            setInitialRoute('/(auth)/login');
          }
        } else {
          setInitialRoute('/(auth)/login');
        }
      } catch (e) {
        setInitialRoute('/(auth)/login');
      } finally {
        setIsReady(true);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, checkAuthStatus);
    return () => unsubscribe();
  }, []);

  if (!isReady || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Redirect href={initialRoute} />;
}
