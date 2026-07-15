import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

let fs = null;
try { fs = require('@react-native-firebase/firestore'); } catch { fs = null; }

const serverTs = () => fs?.serverTimestamp?.() ?? null;

const SupportChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const [assignedToId, setAssignedToId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatRef = useRef(null);
  const prefillSent = useRef(false);

  useEffect(() => {
    if (!fs || !user?.id) { setLoading(false); return; }
    const db = fs.getFirestore();
    const q = fs.query(
      fs.collection(db, 'support_conversations'),
      fs.where('customerId', '==', user.id),
      fs.limit(1),
    );

    const unsub = fs.onSnapshot(q, snap => {
      if (!snap.empty) {
        setConversationId(snap.docs[0].id);
        const d = snap.docs[0].data();
        setAssignedToId(d.assignedToId ?? null);
        if (d.isReadByCustomer === false) {
          fs.updateDoc(snap.docs[0].ref, { isReadByCustomer: true });
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (!fs || !conversationId) return;
    const db = fs.getFirestore();
    const q = fs.query(
      fs.collection(fs.doc(db, 'support_conversations', conversationId), 'messages'),
      fs.orderBy('timestamp', 'asc'),
    );

    const unsub = fs.onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          content: data.content,
          timestamp: data.timestamp?.toDate?.() ?? new Date(),
        };
      }));
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [conversationId]);

  // Auto-send a pre-filled message once (e.g. from the Billing screen's "Request Custom Plan"
  // banner), after the initial conversation lookup has settled.
  useEffect(() => {
    const prefill = route?.params?.prefillMessage;
    if (!prefill || loading || prefillSent.current) return;
    prefillSent.current = true;
    navigation?.setParams?.({ prefillMessage: undefined });
    send(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.prefillMessage, loading]);

  const send = async (overrideContent) => {
    const content = (overrideContent ?? text).trim();
    if (!content || !fs) return;
    setText('');
    const db = fs.getFirestore();
    let convId = conversationId;

    if (!convId) {
      const ref = await fs.addDoc(fs.collection(db, 'support_conversations'), {
        customerId: user.id,
        customerName: user.name,
        businessName: user.businessName ?? '',
        assignedToId: null,
        assignedToName: null,
        lastMessage: content,
        lastMessageAt: serverTs(),
        isReadByCustomer: true,
        isReadBySupport: false,
        createdAt: serverTs(),
      });
      convId = ref.id;
      setConversationId(ref.id);
    } else {
      await fs.updateDoc(fs.doc(db, 'support_conversations', convId), {
        lastMessage: content,
        lastMessageAt: serverTs(),
        isReadBySupport: false,
      });
    }

    await fs.addDoc(fs.collection(fs.doc(db, 'support_conversations', convId), 'messages'), {
      senderId: user.id,
      senderName: user.name,
      senderRole: 'admin',
      content,
      timestamp: serverTs(),
    });

    apiClient.post('/support/notify', {
      senderRole: 'admin',
      customerName: user.name,
      customerId: user.id,
      assignedToId,
      messagePreview: content.slice(0, 100),
      conversationId: convId,
    }).catch(() => {});
  };

  if (!fs) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Support chat requires Firestore.</Text>
        <Text style={styles.infoSub}>Run: npm install @react-native-firebase/firestore</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {loading
        ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.id;
              return (
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}
                  <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
                  <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                    {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Send a message to start the conversation.</Text>}
          />
        )
      }

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={() => send()} disabled={!text.trim()}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  infoText: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 8, textAlign: 'center' },
  infoSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '75%', borderRadius: 14, padding: 12 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 1 },
  senderName: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 4 },
  msgText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  msgTextMine: { color: '#fff' },
  msgTime: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 60 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', maxHeight: 100 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D0D5DD' },
  sendBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default SupportChatScreen;
