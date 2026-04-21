import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image,
  TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { auth, db } from '../config/firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

export default function SupportScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);

  const [ticketId, setTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [subject, setSubject] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const loadTicket = async () => {
      try {
        // ค้นหา ticket ของ user นี้ที่ยังเปิดอยู่อยู่ก่อน
        const q = query(
          collection(db, 'support_tickets'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const ticket = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setTicketId(ticket.id);
            setTicketStatus(ticket.status || 'open');
            setSubject(ticket.subject || 'สอบถามทั่วไป');
            setIsNew(false);
            setLoading(false);

            // ฟัง messages
            const msgUnsub = onSnapshot(
              query(
                collection(db, 'support_tickets', ticket.id, 'messages'),
                orderBy('createdAt', 'asc')
              ),
              (msgSnap) => {
                setMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              }
            );
            return msgUnsub;
          } else {
            setIsNew(true);
            setLoading(false);
          }
        });

        return unsubscribe;
      } catch (err) {
        console.log('Support load error', err);
        setLoading(false);
      }
    };

    loadTicket();
  }, []);

  const createTicket = async (firstMsg) => {
    if (!auth.currentUser) return null;
    const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userSnap.data() || {};
    const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'ผู้ใช้';

    const ref = await addDoc(collection(db, 'support_tickets'), {
      userId: auth.currentUser.uid,
      userName: name,
      userEmail: auth.currentUser.email,
      subject: 'สอบถามทั่วไป',
      status: 'open',
      lastMessage: firstMsg,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    let tid = ticketId;
    if (!tid) {
      tid = await createTicket(text);
      setTicketId(tid);
      setIsNew(false);

      // ฟัง messages หลังสร้าง ticket
      onSnapshot(
        query(collection(db, 'support_tickets', tid, 'messages'), orderBy('createdAt', 'asc')),
        (snap) => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      );
    }

    await addDoc(collection(db, 'support_tickets', tid, 'messages'), {
      text,
      senderRole: 'user',
      senderName: auth.currentUser?.displayName || 'ผู้ใช้',
      senderId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'support_tickets', tid), {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('การอนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพเพื่อส่งรูปในแชท');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
      sendImageMessage(base64Data);
    }
  };

  const sendImageMessage = async (base64Image) => {
    let tid = ticketId;
    if (!tid) {
      tid = await createTicket('ส่งรูปภาพ 🖼️');
      setTicketId(tid);
      setIsNew(false);

      onSnapshot(
        query(collection(db, 'support_tickets', tid, 'messages'), orderBy('createdAt', 'asc')),
        (snap) => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      );
    }

    await addDoc(collection(db, 'support_tickets', tid, 'messages'), {
      image: base64Image,
      senderRole: 'user',
      senderName: auth.currentUser?.displayName || 'ผู้ใช้',
      senderId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'support_tickets', tid), {
      lastMessage: 'ส่งรูปภาพ 🖼️',
      updatedAt: serverTimestamp(),
    });
  };

  const renderMessage = ({ item }) => {
    const isUser = item.senderRole !== 'admin';
    const time = item.createdAt?.toDate?.()?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) || '';

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isUser && (
          <View style={styles.adminAvatar}>
            <Text style={styles.adminAvatarText}>A</Text>
          </View>
        )}
        <View>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAdmin]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.bubbleImage} />
            ) : null}
            {item.text ? (
              <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
            ) : null}
          </View>
          <Text style={[styles.bubbleTime, isUser && { textAlign: 'right' }]}>
            {isUser ? 'คุณ' : 'แอดมิน'} · {time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle}>💬 ติดต่อแอดมิน</Text>
          <Text style={styles.headerSub}>
            {ticketStatus === 'resolved' ? '✅ ปิดเรื่องแล้ว' : '🟢 กำลังรับเรื่อง'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        {isNew ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>ส่งข้อความหาแอดมิน</Text>
            <Text style={styles.emptySubtitle}>ทีมแอดมินพร้อมช่วยเหลือคุณตลอดเวลาครับ</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        {ticketStatus !== 'resolved' ? (
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#5B7FC4" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="พิมพ์ข้อความ..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>✅ เรื่องนี้ถูกปิดแล้วโดยแอดมิน</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 12, color: '#8A97A8', marginTop: 2 },
  messagesList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  adminAvatar: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#5B7FC4',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  adminAvatarText: { color: 'white', fontWeight: '700', fontSize: 13 },
  bubble: {
    maxWidth: 260,
    padding: 12,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#5B7FC4',
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  bubbleText: { fontSize: 14, color: '#1A1A2E', lineHeight: 20 },
  bubbleTextUser: { color: 'white' },
  bubbleTime: { fontSize: 11, color: '#8A97A8', marginTop: 4, paddingHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F5F7FA',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: '#5B7FC4',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C5D3E8' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#8A97A8', textAlign: 'center', lineHeight: 22 },
  closedBanner: {
    padding: 16,
    backgroundColor: '#F0FFF4',
    borderTopWidth: 1,
    borderTopColor: '#D4F7C5',
    alignItems: 'center',
  },
  closedBannerText: { fontSize: 14, color: '#52C41A', fontWeight: '600' },
  attachBtn: {
    padding: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#E8ECF4',
    resizeMode: 'cover'
  }
});
