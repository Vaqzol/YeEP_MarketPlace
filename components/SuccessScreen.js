import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import YeepLogo from './YeepLogo';

const SuccessScreen = ({ title }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <YeepLogo size={28} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={80} color="#fff" />
          </View>
        </View>
        
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginTop: 40,
  },
  iconContainer: {
    marginBottom: 40,
    // Add drop shadow
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.success, // #52C41A
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.fontXxl - 4,
    fontWeight: FONTS.bold,
    color: '#1A2A47',
    textAlign: 'center',
  }
});

export default SuccessScreen;
