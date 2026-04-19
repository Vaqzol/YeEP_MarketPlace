/**
 * utils/notifications.js
 * Handles push notifications with graceful fallback for Expo Go (SDK 53+).
 * Uses lazy imports to avoid loading expo-notifications in unsupported envs.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Check if running inside Expo Go (not a standalone/dev build)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

/**
 * Requests notification permission and saves the Expo Push Token to Firestore.
 * Silently skips if running in Expo Go or on a simulator.
 */
export async function registerForPushNotifications() {
  if (isExpoGo) {
    // Skip entirely in Expo Go — avoids the SDK 53 warning spam
    return null;
  }

  // Lazy import: only load expo-notifications in dev/prod builds
  const Notifications = require('expo-notifications');
  const Device = require('expo-device');

  if (!Device.isDevice) {
    return null;
  }

  // Set notification handler (foreground)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('[Notifications] No EAS projectId — run "eas init" to enable push.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenData.data;

    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        expoPushToken,
      });
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C94C1',
      });
    }

    return expoPushToken;
  } catch (error) {
    console.log('[Notifications] Could not get push token:', error.message);
    return null;
  }
}

/**
 * Sends a push notification via Expo's free Push API.
 * No-op if token is missing or running in Expo Go.
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || isExpoGo) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: expoPushToken, sound: 'default', title, body, data }),
    });
  } catch (error) {
    console.log('[Notifications] Send failed:', error.message);
  }
}
