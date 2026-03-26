import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const CustomButton = ({ 
  title, 
  onPress, 
  type = 'primary', // primary, outline, text
  iconName,
  iconColor,
  style,
  disabled
}) => {
  const getButtonStyle = () => {
    switch(type) {
      case 'outline':
        return styles.outlineButton;
      case 'text':
        return styles.textButton;
      case 'primary':
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch(type) {
      case 'outline':
        return styles.outlineText;
      case 'text':
        return styles.textText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        getButtonStyle(), 
        disabled && styles.disabledButton,
        style
      ]} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.contentContainer}>
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={20} 
            color={iconColor || (type === 'primary' ? '#fff' : COLORS.text)} 
            style={styles.icon} 
          />
        )}
        <Text style={[getTextStyle(), disabled && styles.disabledText]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textButton: {
    backgroundColor: 'transparent',
    height: 'auto',
    marginBottom: 0,
    paddingVertical: 8,
  },
  primaryText: {
    color: '#fff',
    fontSize: SIZES.fontMd,
    fontWeight: FONTS.semiBold,
  },
  outlineText: {
    color: COLORS.text,
    fontSize: SIZES.fontMd,
    fontWeight: FONTS.medium,
  },
  textText: {
    color: COLORS.primary,
    fontSize: SIZES.fontMd,
    fontWeight: FONTS.medium,
  },
  icon: {
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#A0C4E8',
    borderColor: '#E8EDF2',
  },
  disabledText: {
    color: '#F5F8FC',
  }
});

export default CustomButton;
