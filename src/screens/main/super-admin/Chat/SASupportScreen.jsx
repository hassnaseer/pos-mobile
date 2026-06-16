import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import colors from '../../../../theme/colors';

let firestore;
try { firestore = require('@react-native-firebase/firestore').default; } catch { firestore = null; }

const serverTs = () => firestore?.FieldValue?.serverTimestamp?.() ?? null;

const USER_TYPES = ['business', 'guest'];
const STATUS_TABS = ['All', 'Open', 'On Hold', 'Done'];

const SASupportScreen = () => {
  const { user } = useAuth();
  const [userType, setUserType]   = useState('business');
  const [tab, setTab]             = useState('All');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [text, setText]                   = useState('');
  const flatRef = useRef(null);

  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    const db = firestore();
    let query = db.collection('support_conversations').orderBy('lastMessageAt', 'desc');
    query = query.where('userType', '==', userType === 'guest' ? 'guest' : 'business');
    if (tab !== 'All') query = query.where('status', '==', tab === 'On Hold' ? 'on_hold' : tab.toLowerCase());
    const unsub = query.onSnapshot(
      snap => {
        if (!snap) { setLoading(false); return; }
        setConversations((snap.docs ?? []).map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [tab, userType]);

  useEffect(() => {
    if (!firestore || !selectedId) { setMessages([]); return; }
    const db = firestore();
    const unsub = db.collection('support_conversations').doc(selectedId)
      .collection('messages').orderBy('timestamp', 'asc')
      .onSnapshot(
        snap => {
          if (!snap) return;
          setMessages((snap.docs ?? []).map(d => ({
            id: d.id, ...d.data(),
            timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
          })));
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        },
        () => {},
      );
    db.collection('support_conversations').doc(selectedId)
      .update({ isReadBySupport: true }).catch(() => {});
    return unsub;
  }, [selectedId]);

  const send = async () => {
    if (!text.trim() || !selectedId || !firestore) return;
    const content = text.trim();
    setText('');
    const db = firestore();
    await db.collection('support_conversations').doc(selectedId).collection('messages').add({
      senderId: user?.id, senderName: user?.name, senderRole: 'super-admin',
      content, timestamp: serverTs(),
    });
    await db.collection('support_conversations').doc(selectedId).update({
      lastMessage: content, lastMessageAt: serverTs(),
      isReadByCustomer: false, isReadBySupport: true,
    });
  };

  if (!firestore) return (
    <View style={styles.center}>
      <Text style={styles.infoText}>Firebase Firestore is not configured.{'\n'}Chat is unavailable.</Text>
    </View>
  );

  // Mobile layout: either show conversation list OR chat panel
  const selected = conversations.find(c => c.id === selectedId);

  if (selectedId && selected) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatTopBar}>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.chatName}>{selected.customerName}</Text>
            {selected.businessName ? <Text style={styles.chatBiz}>{selected.businessName}</Text> : null}
          </View>
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
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Reply…"
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnOff]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.root}>
      {/* User type toggle */}
      <View style={styles.userTypeBar}>
        {[['business', '👤 Business Owners'], ['guest', '💬 Guest Visitors']].map(([type, label]) => (
          <TouchableOpacity
            key={type}
            style={[styles.userTypeBtn, userType === type && styles.userTypeBtnActive]}
            onPress={() => { setUserType(type); setTab('All'); setSelectedId(null); }}
          >
            <Text style={[styles.userTypeText, userType === type && styles.userTypeTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Status sub-tabs */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => { setTab(t); setSelectedId(null); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        : conversations.length === 0
          ? <View style={styles.center}><Text style={styles.infoText}>No conversations found.</Text></View>
          : (
            <FlatList
              data={conversations}
              keyExtractor={c => c.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.convItem} onPress={() => setSelectedId(item.id)} activeOpacity={0.7}>
                  <View style={styles.convAvatar}>
                    <Text style={styles.convAvatarText}>{(item.customerName ?? 'C')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.convInfo}>
                    <View style={styles.convNameRow}>
                      <Text style={styles.convName} numberOfLines={1}>{item.customerName ?? '—'}</Text>
                      {item.isReadBySupport === false && <View style={styles.unreadDot} />}
                    </View>
                    {item.businessName ? <Text style={styles.convBiz} numberOfLines={1}>{item.businessName}</Text> : null}
                    <Text style={styles.convLast} numberOfLines={1}>{item.lastMessage ?? ''}</Text>
                  </View>
                  <Text style={styles.convArrow}>›</Text>
                </TouchableOpacity>
              )}
            />
          )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  infoText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  // User type bar
  userTypeBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8, borderBottomWidth: 1, borderColor: '#eee' },
  userTypeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: '#f4f6f9' },
  userTypeBtnActive: { backgroundColor: colors.primary },
  userTypeText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  userTypeTextActive: { color: '#fff' },
  // Status tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabBtnActive: { borderColor: colors.primary },
  tabText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  tabTextActive: { color: colors.primary, fontFamily: 'Outfit-SemiBold' },

  // Conversation list
  convItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  convAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  convInfo: { flex: 1 },
  convNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  convBiz: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 1 },
  convLast: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  convArrow: { fontSize: 20, color: '#d1d5db' },

  // Chat
  chatTopBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { padding: 6 },
  backBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  chatName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827' },
  chatBiz: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  msgList: { padding: 12, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginVertical: 2 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 1 },
  senderName: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 3 },
  msgText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111827' },
  msgTextMine: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular', maxHeight: 80 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#D0D5DD' },
  sendBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
});

export default SASupportScreen;
