import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import colors from '../../../../theme/colors';

let firestore;
try { firestore = require('@react-native-firebase/firestore').default; } catch { firestore = null; }

const SASupportScreen = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const flatRef = useRef(null);

  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    const db = firestore();
    const unsub = db.collection('support_conversations')
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(snap => {
        setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    return unsub;
  }, []);

  useEffect(() => {
    if (!firestore || !selectedId) { setMessages([]); return; }
    const db = firestore();
    const unsub = db.collection('support_conversations').doc(selectedId)
      .collection('messages').orderBy('timestamp', 'asc')
      .onSnapshot(snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? new Date() })));
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      });
    db.collection('support_conversations').doc(selectedId).update({ isReadBySupport: true }).catch(() => {});
    return unsub;
  }, [selectedId]);

  const send = async () => {
    if (!text.trim() || !selectedId || !firestore) return;
    const content = text.trim();
    setText('');
    const db = firestore();
    await db.collection('support_conversations').doc(selectedId).collection('messages').add({
      senderId: user.id, senderName: user.name, senderRole: 'super-admin',
      content, timestamp: firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('support_conversations').doc(selectedId).update({
      lastMessage: content, lastMessageAt: firestore.FieldValue.serverTimestamp(),
      isReadByCustomer: false, isReadBySupport: true,
    });
  };

  if (!firestore) return (
    <View style={styles.center}><Text style={styles.infoText}>Requires @react-native-firebase/firestore</Text></View>
  );

  const selected = conversations.find(c => c.id === selectedId);

  return (
    <View style={styles.root}>
      {/* Conversation list */}
      <View style={styles.convList}>
        <Text style={styles.convTitle}>Conversations</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : (
          <FlatList
            data={conversations}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.convItem, selectedId === item.id && styles.convItemActive]}
                onPress={() => setSelectedId(item.id)}
              >
                <View style={styles.convAvatar}><Text style={styles.convAvatarText}>{(item.customerName ?? 'C')[0].toUpperCase()}</Text></View>
                <View style={styles.convInfo}>
                  <Text style={styles.convName} numberOfLines={1}>{item.customerName}</Text>
                  <Text style={styles.convLast} numberOfLines={1}>{item.lastMessage ?? ''}</Text>
                </View>
                {item.isReadBySupport === false && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Chat panel */}
      <KeyboardAvoidingView style={styles.chatPanel} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!selected ? (
          <View style={styles.center}><Text style={styles.selectHint}>Select a conversation</Text></View>
        ) : (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName}>{selected.customerName}</Text>
              <Text style={styles.chatBiz}>{selected.businessName}</Text>
            </View>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.msgList}
              renderItem={({ item }) => {
                const mine = item.senderId === user?.id;
                return (
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    {!mine && <Text style={styles.senderName}>{item.senderName}</Text>}
                    <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.content}</Text>
                  </View>
                );
              }}
            />
            <View style={styles.inputRow}>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Reply…" placeholderTextColor="#999" multiline />
              <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnOff]} onPress={send} disabled={!text.trim()}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', padding: 24 },
  convList: { width: 200, backgroundColor: '#fff', borderRightWidth: 1, borderColor: '#eee' },
  convTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, padding: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  convItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  convItemActive: { backgroundColor: '#EBF0F5' },
  convAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit-Bold' },
  convInfo: { flex: 1 },
  convName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  convLast: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  chatPanel: { flex: 1 },
  chatHeader: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  chatName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  chatBiz: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  msgList: { padding: 12, gap: 8 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 1 },
  senderName: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 3 },
  msgText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  msgTextMine: { color: '#fff' },
  selectHint: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#D0D5DD' },
  sendBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
});

export default SASupportScreen;
