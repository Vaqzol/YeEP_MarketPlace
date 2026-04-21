import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { auth, db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handlePressNotify = async (item) => {
    // Mark as read
    if (!item.read) {
      try {
        await updateDoc(doc(db, 'notifications', item.id), { read: true });
      } catch (error) {
        console.error('Error marking notification as read', error);
      }
    }

    // Always route to admin chat on click for any notification for now
    router.push({
      pathname: `/chat/${[auth.currentUser.uid, 'admin'].sort().join('_')}`,
      params: { sellerId: 'admin' }
    });
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const time = item.createdAt?.toDate?.()?.toLocaleDateString('th-TH') || '';
    const isReject = item.type === 'reject';
    const isApprove = item.type === 'approve';

    return (
      <TouchableOpacity 
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handlePressNotify(item)}
      >
        <View style={styles.iconContainer}>
          {item.productImage ? (
            <Image source={{ uri: item.productImage }} style={styles.productIcon} />
          ) : (
            <Ionicons name={isReject ? "close-circle" : "checkmark-circle"} size={36} color={isReject ? '#FF4D4F' : '#52C41A'} />
          )}
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, isUnread && styles.unreadTitle, { color: isReject ? '#FF4D4F' : COLORS.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{time}</Text>
          
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => handlePressNotify(item)}
          >
            <Text style={styles.chatButtonText}>ดูรายละเอียด / ติดต่อแอดมิน</Text>
          </TouchableOpacity>
        </View>
        
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyText}>ไม่มีการแจ้งเตือนใหม่</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backBtn: { padding: 4 },
  listContainer: { paddingVertical: 8 },
  notificationItem: {
    flexDirection: 'row', padding: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    position: 'relative'
  },
  unreadItem: { backgroundColor: '#F0F9FF' },
  iconContainer: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#E0F2FE',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    overflow: 'hidden'
  },
  productIcon: { width: '100%', height: '100%', resizeMode: 'cover' },
  contentContainer: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, marginBottom: 4 },
  unreadTitle: { fontWeight: 'bold' },
  message: { fontSize: 14, color: COLORS.textLight, marginBottom: 8, lineHeight: 20 },
  time: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  
  chatButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  
  unreadDot: {
    position: 'absolute', top: 16, right: 16,
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94A3B8', marginTop: 16 }
});
