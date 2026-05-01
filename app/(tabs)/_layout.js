import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 4);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.icon,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 1,
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าแรก',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'สำรวจ',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'ลงขาย',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'คำสั่งซื้อ',
          tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
