import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBX_1GNx-xoiaohcnTL6TYbQeVBmm6ppRY",
  authDomain: "yeep-marketplace.firebaseapp.com",
  projectId: "yeep-marketplace",
  storageBucket: "yeep-marketplace.firebasestorage.app",
  messagingSenderId: "20249950154",
  appId: "1:20249950154:web:8f2c108206fc170e628133",
  measurementId: "G-FX5R29B85N"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
