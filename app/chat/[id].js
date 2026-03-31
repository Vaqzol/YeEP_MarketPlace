import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { auth, db } from '../../config/firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc, setDoc, updateDoc
} from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const { id: chatId, productId, sellerId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [partner, setPartner] = useState(null);
  const [sending, setSending] = useState(false);

  // 1. ดึงข้อมูลคู่สนทนาและสินค้าที่อ้างถึง
  useEffect(() => {
    let partnerUnsubscribe = () => { };

    const fetchData = async () => {
      try {
        // ดึงข้อมูลสินค้า (ถ้ามี)
        if (productId) {
          const prodRef = doc(db, 'products', productId);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) setProduct(prodSnap.data());
        }

        // ดึงข้อมูลผู้รับ (Partner) แบบ Real-time เพื่อดูสถานะ Online
        if (sellerId) {
          const userRef = doc(db, 'users', sellerId);
          partnerUnsubscribe = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              setPartner(snap.data());
            }
          });
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
    return () => partnerUnsubscribe();
  }, [productId, sellerId]);

  // 2. ฟังข้อความแบบ Real-time
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  // 3. ส่งข้อความ
  const handleSend = async (image = null) => {
    if ((!inputText.trim() && !image) || !chatId) return;

    const messageContent = inputText.trim();
    setInputText(''); // ล้างเพื่อความลื่นไหล

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: auth.currentUser.uid,
        text: messageContent,
        image: image || null,
        createdAt: serverTimestamp(),
      });

      // อัปเดตข้อมูลสรุปของห้องแชท (สำหรับหน้า List)
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      const chatUpdate = {
        lastMessage: image ? 'ส่งรูปภาพ' : messageContent,
        lastSenderId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
        participants: chatId.split('_'), // [uid1, uid2]
      };

      if (!chatSnap.exists()) {
        await setDoc(chatRef, chatUpdate);
      } else {
        await updateDoc(chatRef, chatUpdate);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้ครับ');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('คำเตือน', 'กรุณาอนุญาตเข้าถึงรูปภาพครับ');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      handleSend(base64Img);
    }
  };

  const renderMessageItem = ({ item, index }) => {
    const isMe = item.senderId === auth.currentUser.uid;
    const showAvatar = !isMe;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.partnerMessageRow]}>
        {showAvatar && (
          <View style={styles.partnerAvatarSmall}>
            {partner?.profileImage ? (
              <Image source={{ uri: partner.profileImage }} style={styles.avatarImgSmall} />
            ) : (
              <Ionicons name="person" size={14} color="#999" />
            )}
          </View>
        )}

        <View style={isMe ? styles.myBubbleContainer : styles.partnerBubbleContainer}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.messageImage} />
          )}
          {item.text ? (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.partnerBubble]}>
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.partnerMessageText]}>
                {item.text}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.partnerTimestamp]}>
            {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
          </Text>
        </View>
      </View>
    );
  };

  // ตรวจสอบสถานะออนไลน์
  const getOnlineStatus = () => {
    if (!partner?.lastSeen) return { online: false, text: 'OFFLINE' };

    const lastSeenDate = partner.lastSeen.toDate();
    const now = new Date();
    const diffInMins = Math.floor((now - lastSeenDate) / 60000);

    if (diffInMins < 5) return { online: true, text: 'ONLINE' };
    if (diffInMins < 60) return { online: false, text: `Active ${diffInMins}m ago` };
    if (diffInMins < 1440) return { online: false, text: `Active ${Math.floor(diffInMins / 60)}h ago` };
    return { online: false, text: lastSeenDate.toLocaleDateString() };
  };

  const status = getOnlineStatus();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header - Friend's Design */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerProfile}>
            <View style={styles.avatarContainer}>
              {partner?.profileImage ? (
                <Image source={{ uri: partner.profileImage }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={24} color="#999" />
              )}
              {status.online && <View style={styles.onlineDot} />}
            </View>
            <View>
              <Text style={styles.partnerName}>{partner ? `${partner.firstName} ${partner.lastName}` : 'กำลังโหลด...'}</Text>
              <Text style={[styles.onlineText, !status.online && { color: COLORS.textLight }]}>{status.text}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn}>
              <Ionicons name="call-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Banner - Friend's Design */}
        {product && (
          <View style={styles.productBanner}>
            <Image
              source={{ uri: product.images?.[0] || 'https://via.placeholder.com/50' }}
              style={styles.bannerImg}
            />
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.bannerPrice}>{product.price.toLocaleString()} บาท</Text>
            </View>
            <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/product/${productId}`)}>
              <Text style={styles.viewBtnText}>ดูสินค้า</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🔥 ย้อนกลับมาใช้ height แต่ปรับ Offset ให้จอดสนิทพอดีขอบล่าง 🔥 */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : -30}
        >
          {/* Chat Area */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            inverted
            contentContainerStyle={styles.chatList}
            ListHeaderComponent={<View style={{ height: 10 }} />}
            ListFooterComponent={
              <View style={styles.dateSeparator}>
                <Text style={styles.dateText}>TODAY</Text>
              </View>
            }
          />

          {/* Input Bar - Friend's Design */}
          <View style={[
            styles.inputBar, 
            { paddingBottom: Math.max(insets.bottom, 15) }
          ]}>
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.inputActionBtn}>
                <Ionicons name="add-outline" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputActionBtn}>
                <Ionicons name="briefcase-outline" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="พิมพ์ข้อความ..."
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()}>
                <Ionicons name="send" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerBtn: { padding: 5 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  avatarContainer: { position: 'relative', width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#27AE60', borderWidth: 2, borderColor: 'white' },
  partnerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  onlineText: { fontSize: 10, color: '#27AE60', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 15 },
  headerActionBtn: { padding: 5 },

  productBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 1
  },
  bannerImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#EEE' },
  bannerInfo: { flex: 1, marginLeft: 12 },
  bannerTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  bannerPrice: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  viewBtn: { backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  viewBtnText: { fontSize: 12, fontWeight: 'bold', color: COLORS.text },

  chatList: { paddingHorizontal: 15, paddingBottom: 10 },
  dateSeparator: { alignItems: 'center', marginVertical: 20 },
  dateText: { fontSize: 11, color: '#A0A0A0', fontWeight: 'bold', letterSpacing: 1 },

  messageRow: { flexDirection: 'row', marginVertical: 8, maxWidth: '85%' },
  myMessageRow: { alignSelf: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' },
  partnerMessageRow: { alignSelf: 'flex-start', alignItems: 'flex-end' },

  partnerAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEE', overflow: 'hidden', marginRight: 8, marginBottom: 15 },
  avatarImgSmall: { width: '100%', height: '100%' },

  myBubbleContainer: { alignItems: 'flex-end' },
  partnerBubbleContainer: { alignItems: 'flex-start' },

  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15 },
  myBubble: { backgroundColor: '#7DA1C9', borderBottomRightRadius: 2 },
  partnerBubble: { backgroundColor: '#F0F2F5', borderBottomLeftRadius: 2 },

  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: 'white' },
  partnerMessageText: { color: COLORS.text },

  messageImage: { width: width * 0.6, height: width * 0.6, borderRadius: 15, marginBottom: 5, backgroundColor: '#EEE' },

  timestamp: { fontSize: 10, color: '#A0A0A0', marginTop: 4 },
  myTimestamp: { marginRight: 5 },
  partnerTimestamp: { marginLeft: 5 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingHorizontal: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  inputActions: { flexDirection: 'row', gap: 10, marginRight: 10 },
  inputActionBtn: { padding: 5 },
  inputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    borderRadius: 25, paddingHorizontal: 15, minHeight: 45, maxHeight: 100
  },
  textInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 8 },
  sendBtn: { marginLeft: 10, padding: 5 },
});