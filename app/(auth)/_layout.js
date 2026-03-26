import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="register-success" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="forgot-otp" />
      <Stack.Screen name="new-password" />
      <Stack.Screen name="reset-success" />
    </Stack>
  );
}
