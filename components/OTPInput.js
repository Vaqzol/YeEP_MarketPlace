import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const OTPInput = ({ length = 6, value = '', onChangeText }) => {
  const [internalValues, setInternalValues] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  useEffect(() => {
    // Sync external value to internal state
    const valArr = value.split('').slice(0, length);
    const newValues = Array(length).fill('');
    valArr.forEach((char, index) => {
      newValues[index] = char;
    });
    setInternalValues(newValues);
  }, [value, length]);

  const handleChangeText = (text, index) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue.length > 1) {
      // Handle paste
      onChangeText(numericValue.slice(0, length));
      Keyboard.dismiss();
      return;
    }

    const newValues = [...internalValues];
    newValues[index] = numericValue;
    
    const finalString = newValues.join('');
    onChangeText(finalString);

    if (numericValue.length === 1 && index < length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !internalValues[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array(length).fill(0).map((_, index) => (
        <TextInput
          key={index}
          style={[
            styles.input,
            internalValues[index] ? styles.inputFilled : null
          ]}
          value={internalValues[index]}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="numeric"
          maxLength={1}
          ref={(ref) => { inputs.current[index] = ref; }}
          selectTextOnFocus
          testID={`otp-input-${index}`}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.text, // Outlined explicitly in UI
    borderRadius: SIZES.radiusSm,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: SIZES.fontLg,
    fontWeight: FONTS.semiBold,
    color: COLORS.text,
  },
  inputFilled: {
    borderColor: COLORS.primary,
  }
});

export default OTPInput;
