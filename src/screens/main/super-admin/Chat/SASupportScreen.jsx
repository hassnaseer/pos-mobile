import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  ScrollView, Image, Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../../context/AuthContext';
import { useSAPlatformTeam, useCreateSASupportTicket } from '../../../../services/api/posApi';
import { BASE_URL } from '../../../../services/api/globalApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

let fs;
try { fs = require('@react-native-firebase/firestore'); } catch { fs = null; }

const serverTs = () => fs?.serverTimestamp?.() ?? null;

const STATUS_TABS = ['All', 'Open', 'On Hold', 'Done'];
const STATUS_VALUE = { Open: 'open', 'On Hold': 'onhold', Done: 'completed' };
const STATUS_ACTIONS = [
  { value: 'open', label: 'Open', bg: '#dcfce7', text: '#15803d' },
  { value: 'onhold', label: 'On Hold', bg: '#fef9c3', text: '#b45309' },
  { value: 'completed', label: 'Completed', bg: '#f3f4f6', text: '#6b7280' },
];
const TICKET_PRIORITY = { low: '#6b7280', medium: '#b45309', high: '#dc2626' };
const TICKET_STATUS = ['open', 'in_progress', 'resolved', 'closed'];

const emptyTicketForm = () => ({
  title: '', description: '', status: 'open', priority: 'medium', imageUrl: '',
  assignedToId: '', assignedToName: '',
});

const uploadImage = async asset => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'ticket.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? '';
};

const SASupportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [userType, setUserType]   = useState('business');
  const [tab, setTab]             = useState('All');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [text, setText]                   = useState('');
  const flatRef = useRef(null);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [ticketOpen, setTicketOpen]   = useState(false);
  const [ticketForm, setTicketForm]   = useState(emptyTicketForm());
  const [ticketSaving, setTicketSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);

  const { data: rawStaff = [] } = useSAPlatformTeam();
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.name }));
  const { mutateAsync: createTicket } = useCreateSASupportTicket();

  const collName = userType === 'guest' ? 'guest_conversations' : 'support_conversations';

  useEffect(() => {
    if (!fs) { setLoading(false); return; }
    const db = fs.getFirestore();
    const clauses = [fs.orderBy('lastMessageAt', 'desc')];
    if (tab !== 'All') clauses.push(fs.where('status', '==', STATUS_VALUE[tab]));
    const q = fs.query(fs.collection(db, collName), ...clauses);
    setLoading(true);
    const unsub = fs.onSnapshot(
      q,
      snap => {
        if (!snap) { setLoading(false); return; }
        const list = (snap.docs ?? []).map(d => {
          const data = d.data();
          return userType === 'guest'
            ? { id: d.id, ...data, customerName: data.guestName ?? 'Guest', customerEmail: data.guestEmail ?? '' }
            : { id: d.id, ...data };
        });
        setConversations(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [tab, userType, collName]);

  useEffect(() => {
    if (!fs || !selectedId) { setMessages([]); return; }
    const db = fs.getFirestore();
    const convRef = fs.doc(db, collName, selectedId);
    const q = fs.query(fs.collection(convRef, 'messages'), fs.orderBy('timestamp', 'asc'));
    const unsub = fs.onSnapshot(
      q,
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
    fs.updateDoc(convRef, { isReadBySupport: true }).catch(() => {});
    return unsub;
  }, [selectedId, collName]);

  const postMessage = async (convId, content) => {
    const db = fs.getFirestore();
    const convRef = fs.doc(db, collName, convId);
    const msgPayload = userType === 'guest'
      ? { content, senderName: user?.name, senderRole: 'super-admin', timestamp: serverTs() }
      : { senderId: user?.id, senderName: user?.name, senderRole: 'super-admin', content, timestamp: serverTs() };
    await fs.addDoc(fs.collection(convRef, 'messages'), msgPayload);
    const updatePayload = userType === 'guest'
      ? { lastMessage: content, lastMessageAt: serverTs(), isReadByGuest: false, isReadBySupport: true }
      : { lastMessage: content, lastMessageAt: serverTs(), isReadByCustomer: false, isReadBySupport: true };
    await fs.updateDoc(convRef, updatePayload);
  };

  const send = async () => {
    if (!text.trim() || !selectedId || !fs) return;
    const content = text.trim();
    setText('');
    await postMessage(selectedId, content);
  };

  const updateStatus = async status => {
    if (!fs || !selectedId) return;
    const db = fs.getFirestore();
    const convRef = fs.doc(db, collName, selectedId);
    const patch = { status };
    if (status === 'completed') patch.completedAt = serverTs();
    await fs.updateDoc(convRef, patch);
    if (status === 'onhold' || status === 'completed') {
      const msg = status === 'onhold'
        ? "⏸️ This conversation has been placed on hold. We'll get back to you as soon as possible."
        : '✅ This conversation has been marked as completed. Thank you for reaching out! Feel free to send a new message if you need further assistance.';
      await postMessage(selectedId, msg);
    }
    setActionsOpen(false);
  };

  const reassign = async staffId => {
    if (!fs || !selectedId) return;
    const staff = staffOptions.find(s => s.id === staffId);
    const db = fs.getFirestore();
    await fs.updateDoc(fs.doc(db, 'support_conversations', selectedId), {
      assignedToId: staffId || null,
      assignedToName: staff?.name || null,
    });
  };

  const openTicketForm = () => {
    setTicketForm(emptyTicketForm());
    setActionsOpen(false);
    setTicketOpen(true);
  };

  const openCustomPlan = () => {
    const conv = conversations.find(c => c.id === selectedId);
    setActionsOpen(false);
    navigation.navigate('SACustomPlanForm', {
      presetBusinessName: conv?.businessName,
      conversationId: selectedId,
    });
  };

  const attachScreenshot = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
      if (res.didCancel || !res.assets?.[0]) return;
      setImgUploading(true);
      try {
        const url = await uploadImage(res.assets[0]);
        setTicketForm(f => ({ ...f, imageUrl: url }));
      } catch {
        Alert.alert('Error', 'Image upload failed');
      } finally { setImgUploading(false); }
    });
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    const conv = conversations.find(c => c.id === selectedId);
    setTicketSaving(true);
    try {
      const res = await createTicket({
        title: ticketForm.title.trim(),
        description: ticketForm.description || undefined,
        status: ticketForm.status,
        priority: ticketForm.priority,
        imageUrl: ticketForm.imageUrl || undefined,
        conversationId: selectedId,
        conversationType: userType === 'guest' ? 'guest' : 'admin',
        assignedToId: ticketForm.assignedToId || undefined,
        assignedToName: ticketForm.assignedToName || undefined,
        customerId: conv?.customerId || undefined,
        customerEmail: conv?.customerEmail || undefined,
        customerName: conv?.customerName || undefined,
      });
      const ticketRef = res?.data?.ticketRef ?? res?.ticketRef ?? '';
      const msg = `🎫 Support ticket created: **${ticketRef}** — ${ticketForm.title.trim()}\nOur team will reach out soon. Please keep this reference number for follow-ups.`;
      await postMessage(selectedId, msg);
      setTicketOpen(false);
      Alert.alert('Success', `Ticket ${ticketRef} created`);
    } catch {
      Alert.alert('Error', 'Failed to create ticket');
    } finally { setTicketSaving(false); }
  };

  if (!fs) return (
    <View style={styles.center}>
      <Text style={styles.infoText}>Firebase Firestore is not configured.{'\n'}Chat is unavailable.</Text>
    </View>
  );

  const selected = conversations.find(c => c.id === selectedId);

  if (selectedId && selected) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatTopBar}>
          <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatName}>{selected.customerName}</Text>
            {selected.businessName ? <Text style={styles.chatBiz}>{selected.businessName}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => setActionsOpen(true)} style={styles.moreBtn}>
            <Text style={styles.moreBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.msgList}
          renderItem={({ item }) => {
            const mine = userType === 'guest' ? item.senderRole !== 'guest' : item.senderRole !== 'admin';
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

        {/* Conversation actions sheet */}
        <Modal visible={actionsOpen} transparent animationType="slide" onRequestClose={() => setActionsOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheetBox}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Conversation Actions</Text>
                <TouchableOpacity onPress={() => setActionsOpen(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Change Status</Text>
              <View style={styles.statusRow}>
                {STATUS_ACTIONS.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.statusBtn, { backgroundColor: s.bg }, selected.status === s.value && styles.statusBtnActive]}
                    onPress={() => updateStatus(s.value)}
                    disabled={selected.status === s.value}
                  >
                    <Text style={[styles.statusBtnText, { color: s.text }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {userType !== 'guest' && (
                <>
                  <Text style={styles.sectionLabel}>Reassign</Text>
                  <InlinePicker
                    options={staffOptions}
                    value={selected.assignedToId ?? ''}
                    onSelect={reassign}
                    placeholder="Unassigned"
                  />
                </>
              )}

              <TouchableOpacity style={styles.actionBtn} onPress={openTicketForm}>
                <Text style={styles.actionBtnText}>🎫 Create Ticket</Text>
              </TouchableOpacity>

              {userType !== 'guest' && (
                <TouchableOpacity style={styles.actionBtn} onPress={openCustomPlan}>
                  <Text style={styles.actionBtnText}>📦 Send Custom Plan</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        {/* Create ticket modal */}
        <Modal visible={ticketOpen} transparent animationType="slide" onRequestClose={() => setTicketOpen(false)}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView style={{ width: '100%' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.sheetBox, { maxHeight: '88%' }]}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Create Ticket</Text>
                  <TouchableOpacity onPress={() => setTicketOpen(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.fieldLabel}>Title *</Text>
                  <TextInput
                    style={styles.ticketInput}
                    value={ticketForm.title}
                    onChangeText={v => setTicketForm(f => ({ ...f, title: v }))}
                    placeholder="Ticket title"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.ticketInput, { height: 80, textAlignVertical: 'top' }]}
                    value={ticketForm.description}
                    onChangeText={v => setTicketForm(f => ({ ...f, description: v }))}
                    placeholder="Optional details"
                    placeholderTextColor="#9ca3af"
                    multiline
                  />
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.statusRow}>
                    {Object.entries(TICKET_PRIORITY).map(([key, color]) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.statusBtn, { backgroundColor: color + '20' }, ticketForm.priority === key && styles.statusBtnActive]}
                        onPress={() => setTicketForm(f => ({ ...f, priority: key }))}
                      >
                        <Text style={[styles.statusBtnText, { color }]}>{key.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusRow}>
                    {TICKET_STATUS.map(st => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.statusBtn, { backgroundColor: '#f4f6f9' }, ticketForm.status === st && styles.statusBtnActive]}
                        onPress={() => setTicketForm(f => ({ ...f, status: st }))}
                      >
                        <Text style={styles.statusBtnText}>{st.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Assign To</Text>
                  <InlinePicker
                    options={staffOptions}
                    value={ticketForm.assignedToId}
                    onSelect={id => {
                      const staff = staffOptions.find(s => s.id === id);
                      setTicketForm(f => ({ ...f, assignedToId: id, assignedToName: staff?.name ?? '' }));
                    }}
                    placeholder="Unassigned"
                  />
                  <Text style={styles.fieldLabel}>Screenshot</Text>
                  {ticketForm.imageUrl ? (
                    <Image source={{ uri: ticketForm.imageUrl }} style={styles.preview} />
                  ) : null}
                  <TouchableOpacity style={styles.attachBtn} onPress={attachScreenshot} disabled={imgUploading}>
                    {imgUploading
                      ? <ActivityIndicator color={colors.primary} size="small" />
                      : <Text style={styles.attachBtnText}>{ticketForm.imageUrl ? 'Replace Screenshot' : '📎 Attach Screenshot'}</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.saveBtn, ticketSaving && { opacity: 0.6 }]} onPress={handleCreateTicket} disabled={ticketSaving}>
                    {ticketSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Create Ticket</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
  moreBtn: { padding: 6, paddingHorizontal: 10 },
  moreBtnText: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#6b7280' },
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

  // Action sheet / ticket modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },
  sectionLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 8, marginTop: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  statusBtnActive: { borderWidth: 2, borderColor: '#374151' },
  statusBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151', textTransform: 'capitalize' },
  actionBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  actionBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6, marginTop: 12 },
  ticketInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa' },
  preview: { width: '100%', height: 140, borderRadius: 10, marginBottom: 8, resizeMode: 'cover' },
  attachBtn: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  attachBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
});

export default SASupportScreen;
