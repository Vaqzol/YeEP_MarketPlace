import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import CustomButton from '../../components/CustomButton';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const handleLogout = () => {
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>หน้าโปรไฟล์</Text>
      
      <View style={{ marginTop: 40, width: '80%' }}>
        <CustomButton 
          title="ออกจากระบบ" 
          onPress={handleLogout} 
          type="outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: 20,
    color: COLORS.text,
  }
});
