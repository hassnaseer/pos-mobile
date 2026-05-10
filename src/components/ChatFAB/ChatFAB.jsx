import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/permissions';
import colors from '../../theme/colors';
import chatIcon from '../../assets/icons/users-01.png';

// ── Firestore lazy-load ───────────────────────────────────────────────────────
let _firestore = null;
let _firestoreLoaded = false;
const getFirestore = () => {
  if (_firestoreLoaded) return _firestore;
  try {
    _firestore = require('@react-native-firebase/firestore').default;
  } catch {
    _firestore = null;
  }
  _firestoreLoaded = true;
  return _firestore;
};

// serverTimestamp helper that works with @react-native-firebase v9–v24
const serverTs = () => {
  const fs = getFirestore();
  if (!fs) return null;
  // v9+ static property
  return fs.FieldValue?.serverTimestamp?.() ?? null;
};

// ── Chat hook (mirrors web's useAdminSupportChat) ─────────────────────────────
const useSupportChat = (userId, userName, businessName) => {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fs = getFirestore();
    if (!fs || !userId) { setLoading(false); return; }
    const db = fs();
    const unsub = db.collection('support_conversations')
      .where('customerId', '==', userId)
      .limit(1)
      .onSnapshot(
        snap => {
          if (!snap.empty) {
            const doc = snap.docs[0];
            setConversationId(doc.id);
            const data = doc.data();
            if (data.isReadByCustomer === false) setUnreadCount(1);
            else setUnreadCount(0);
          }
          setLoading(false);
        },
        err => { setError(err.message); setLoading(false); },
      );
    return unsub;
  }, [userId]);

  useEffect(() => {
    const fs = getFirestore();
    if (!fs || !conversationId) return;
    const db = fs();
    const unsub = db.collection('support_conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(
        snap => {
          setMessages(snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              senderId: data.senderId,
              senderName: data.senderName,
              content: data.content,
              timestamp: data.timestamp?.toDate?.() ?? new Date(),
            };
          }));
        },
        err => setError(err.message),
      );
    return unsub;
  }, [conversationId]);

  const markRead = async () => {
    const fs = getFirestore();
    if (!fs || !conversationId) return;
    const db = fs();
    await db.collection('support_conversations').doc(conversationId).update({ isReadByCustomer: true });
    setUnreadCount(0);
  };

  const sendMessage = async content => {
    const fs = getFirestore();
    if (!fs || !content.trim()) return;
    const db = fs();
    const ts = serverTs();
    let convId = conversationId;

    try {
      if (!convId) {
        const ref = await db.collection('support_conversations').add({
          customerId: userId,
          customerName: userName,
          businessName: businessName ?? '',
          assignedToId: null,
          assignedToName: null,
          lastMessage: content,
          lastMessageAt: ts,
          isReadByCustomer: true,
          isReadBySupport: false,
          createdAt: ts,
        });
        convId = ref.id;
        setConversationId(ref.id);
      } else {
        await db.collection('support_conversations').doc(convId).update({
          lastMessage: content,
          lastMessageAt: ts,
          isReadBySupport: false,
        });
      }

      await db.collection('support_conversations').doc(convId).collection('messages').add({
        senderId: userId,
        senderName: userName,
        senderRole: 'admin',
        content,
        timestamp: ts,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return { messages, unreadCount, loading, error, sendMessage, markRead };
};

// ── FAB component ─────────────────────────────────────────────────────────────
const ChatFAB = () => {
  const { user, userRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const flatRef = useRef(null);
  const fs = getFirestore();

  const { messages, unreadCount, loading, error, sendMessage, markRead } = useSupportChat(
    user?.id,
    user?.name ?? 'User',
    user?.businessName ?? '',
  );

  // Only show for admin role
  if (userRole !== ROLES.ADMIN && userRole !== 'admin') return null;

  const handleOpen = () => {
    setOpen(true);
    markRead();
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    await sendMessage(content);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpen} activeOpacity={0.85}>
        <Image source={chatIcon} style={styles.fabIcon} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat panel modal */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.panel}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Support Chat</Text>
                <Text style={styles.panelSub}>We typically reply within a few hours</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            {!fs ? (
              <View style={styles.center}>
                <Text style={styles.errText}>Firestore not available.</Text>
                <Text style={styles.errSub}>npm install @react-native-firebase/firestore</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.errText}>Connection error</Text>
                <Text style={styles.errSub}>{error}</Text>
              </View>
            ) : loading ? (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={m => m.id}
                contentContainerStyle={styles.msgList}
                onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <Text style={styles.emptyMsg}>Send a message to start the conversation.</Text>
                }
                renderItem={({ item }) => {
                  const mine = item.senderId === user?.id;
                  return (
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                      {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}
                      <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
                      <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                        {item.timestamp?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                }}
              />
            )}

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor="#999"
                multiline
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!text.trim()}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  fabIcon: { width: 24, height: 24, tintColor: '#fff', resizeMode: 'contain' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit-Bold' },

  // Modal panel
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 380,
    overflow: 'hidden',
  },

  // Header
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  panelTitle: { color: '#fff', fontSize: 15, fontFamily: 'Outfit-SemiBold' },
  panelSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 2 },
  closeX: { color: '#fff', fontSize: 18, fontFamily: 'Outfit-Regular' },

  // Messages
  msgList: { padding: 14, gap: 8, paddingBottom: 8 },
  emptyMsg: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40, fontSize: 13 },
  bubble: { maxWidth: '78%', borderRadius: 14, padding: 10 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 3 },
  msgText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  msgTextMine: { color: '#fff' },
  msgTime: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#999', marginTop: 3, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.65)' },

  // Input
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    maxHeight: 90,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D0D5DD' },
  sendBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  // Error / loading
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 180 },
  errText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 6, textAlign: 'center' },
  errSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center' },
});

export default ChatFAB;
