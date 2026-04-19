import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { registerForPushNotifications } from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    let interval;
    
    // ฟังสถานะการ Login
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // อัปเดตครั้งแรกเมื่อ Login
        updateLastSeen(user.uid);
        
        // ลงทะเบียน Push Token
        registerForPushNotifications();
        
        // Setup Interval ทุกๆ 3 นาที (180,000 ms)
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          updateLastSeen(user.uid);
        }, 180000);
      } else {
        if (interval) clearInterval(interval);
      }
    });

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, []);

  const updateLastSeen = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.log('Presence update failed:', error.message);
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
