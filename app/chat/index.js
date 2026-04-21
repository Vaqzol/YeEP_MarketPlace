import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { auth, db } from '../../config/firebase';
import { 
  collection, query, where, onSnapshot, doc, getDoc 
} from 'firebase/firestore';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ChatListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersInfo, setUsersInfo] = useState({}); // เก็บข้อมูลโปรไฟล์เพื่อนที่ดึงมาแล้ว

  useEffect(() => {
    if (!auth.currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // เรียงลำดับตามเวลาล่าสุดในฝั่ง Client
      chatList.sort((a, b) => {
        const timeA = a.updatedAt?.toDate() || 0;
        const timeB = b.updatedAt?.toDate() || 0;
        return timeB - timeA;
      });

      setChats(chatList);
      setLoading(false);

      // ดึงข้อมูลโปรไฟล์ของคู่สนทนาที่ยังไม่มีใน usersInfo
      chatList.forEach(chat => {
        const partnerId = chat.participants.find(uid => uid !== auth.currentUser.uid);
        if (partnerId && !usersInfo[partnerId]) {
          fetchPartnerInfo(partnerId);
        }
      });
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const fetchPartnerInfo = async (uid) => {
    if (uid === 'admin') {
      setUsersInfo(prev => ({
        ...prev,
        [uid]: {
          firstName: 'แอดมิน',
          lastName: 'YeEP',
          profileImage: 'https://cdn-icons-png.flaticon.com/512/6124/6124997.png'
        }
      }));
      return;
    }
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUsersInfo(prev => ({
          ...prev,
          [uid]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'เมื่อกี้';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชม.ที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item }) => {
    const partnerId = item.participants.find(uid => uid !== auth.currentUser.uid);
    const partner = usersInfo[partnerId];
    const isUnread = item.lastSenderId !== auth.currentUser.uid; // สมมติว่าถ้าเราไม่ใช่คนส่งล่าสุด คือยังไม่อ่าน (Logic ง่ายๆ สำหรับ MVP)

    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => router.push({
          pathname: `/chat/${item.id}`,
          params: { sellerId: partnerId }
        })}
      >
        <View style={styles.avatarWrapper}>
          {partner?.profileImage ? (
            <Image source={{ uri: partner.profileImage }} style={styles.chatAvatar} />
          ) : (
            <View style={[styles.chatAvatar, styles.placeholderAvatar]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          {/* สถานะออนไลน์ (Mock) */}
          <View style={styles.onlineIndicator} />
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partner ? `${partner.firstName} ${partner.lastName}` : 'กำลังโหลด...'}
            </Text>
            <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
              {item.lastMessage || 'ไม่มีข้อความ'}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ข้อความ</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>ไม่มีการสนทนา</Text>
          <Text style={styles.emptySub}>คุณสามารถเริ่มคุยกับผู้ขายได้จากหน้าสินค้าครับ</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  backBtn: { padding: 5 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  
  chatItem: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#F8F8F8', alignItems: 'center'
  },
  avatarWrapper: { position: 'relative' },
  chatAvatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#F0F2F5' },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  onlineIndicator: {
    position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#27AE60', borderWidth: 2, borderColor: 'white'
  },
  
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  partnerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, flex: 1, marginRight: 10 },
  chatTime: { fontSize: 12, color: COLORS.textLight },
  
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: COLORS.textLight, flex: 1, marginRight: 10 },
  unreadText: { color: COLORS.text, fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconBg: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 22 },
});
