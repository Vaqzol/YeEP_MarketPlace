import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

const YeepLogo = ({ size = 24, showText = true, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="bag-handle-outline" size={size} color={COLORS.primary} />
      {showText && (
        <Text style={[styles.text, { fontSize: size * 0.9 }]}>
          YeEP
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#1A2A47',
    fontWeight: '800',
    fontFamily: 'System',
    marginLeft: 6,
    letterSpacing: -0.5,
  }
});

export default YeepLogo;
