import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const CustomInput = ({ 
  label, 
  iconName, 
  placeholder, 
  secureTextEntry, 
  keyboardType = 'default',
  value,
  onChangeText,
  error,
  ...props 
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error && styles.inputError
      ]}>
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={20} 
            color={COLORS.icon} 
            style={styles.icon} 
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={!isPasswordVisible && secureTextEntry}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={COLORS.icon} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: FONTS.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    height: 50,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: SIZES.fontMd,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontSm,
    marginTop: 4,
  }
});

export default CustomInput;
