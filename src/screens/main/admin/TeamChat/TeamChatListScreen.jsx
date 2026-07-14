import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { useInternalChatDirectory } from '../../../../services/api/posApi';
import { useInternalChat } from '../../../../hooks/useInternalChat';
import { MultiPicker } from './MultiPicker';
import colors from '../../../../theme/colors';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLORS = ['#DBEAFE', '#EDE9FE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#CFFAFE'];
function avatarColor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function conversationTitle(c, currentUserId) {
  if (c.type === 'group') return c.name ?? 'Group';
  const otherId = c.participantIds.find(id => id !== currentUserId);
  return (otherId && c.participantNames[otherId]) || 'Unknown';
}

export default function TeamChatListScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const userName = user?.name ?? '';
  const codes = user?.permissionCodes ?? [];
  const canCreateGroups = codes.length === 0 || codes.includes('internal_chat_groups');

  const { data: rawDirectory = [] } = useInternalChatDirectory();
  const directory = Array.isArray(rawDirectory) ? rawDirectory : (rawDirectory?.data ?? []);
  const directoryMap = Object.fromEntries(directory.map(u => [u.id, u]));

  const {
    conversations, loading, isOnline,
    selectConversation, createDirectConversation, createGroupConversation, deleteConversation,
  } = useInternalChat(userId, userName);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredDirectory = directory.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const openChat = async id => {
    await selectConversation(id);
    navigation.navigate('TeamChatThread', { conversationId: id });
  };

  const handlePickDirect = async u => {
    setNewChatOpen(false);
    setSearch('');
    const id = await createDirectConversation({ id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl });
    if (id) navigation.navigate('TeamChatThread', { conversationId: id });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Error', 'Group name is required'); return; }
    if (groupMemberIds.length === 0) { Alert.alert('Error', 'Add at least one member'); return; }
    setCreating(true);
    try {
      const members = groupMemberIds.map(id => directoryMap[id]).filter(Boolean)
        .map(u => ({ id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl }));
      const id = await createGroupConversation(groupName.trim(), members);
      setNewGroupOpen(false);
      setGroupName('');
      setGroupMemberIds([]);
      if (id) navigation.navigate('TeamChatThread', { conversationId: id });
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = c => Alert.alert(
    c.type === 'group' ? 'Delete Group' : 'Delete Conversation',
    'This will permanently delete the entire conversation and all its messages for everyone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(c.id).catch(() => Alert.alert('Error', 'Failed to delete')) },
    ],
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Team Chat</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setNewChatOpen(true)}>
            <Text style={styles.headerBtnText}>+ Chat</Text>
          </TouchableOpacity>
          {canCreateGroups && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setNewGroupOpen(true)}>
              <Text style={styles.headerBtnText}>+ Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          ListEmptyComponent={<Text style={styles.empty}>No conversations yet. Start one!</Text>}
          renderItem={({ item }) => {
            const title = conversationTitle(item, userId);
            const otherId = item.type === 'direct' ? item.participantIds.find(id => id !== userId) : undefined;
            const online = !!otherId && isOnline(otherId);
            const unread = !!item.lastSenderId && item.lastSenderId !== userId && !item.readBy.includes(userId);
            return (
              <TouchableOpacity style={styles.row} onPress={() => openChat(item.id)} onLongPress={() => handleDelete(item)}>
                <View style={{ position: 'relative' }}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
                    <Text style={styles.avatarText}>{item.type === 'group' ? '👥' : getInitials(title)}</Text>
                  </View>
                  {online && <View style={styles.onlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, unread && { fontFamily: 'Outfit-Bold' }]}>{title}</Text>
                  <Text style={[styles.rowSub, unread && { color: '#111', fontFamily: 'Outfit-SemiBold' }]} numberOfLines={1}>
                    {item.lastMessage || 'No messages yet'}
                  </Text>
                </View>
                {unread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* New Chat modal */}
      <Modal visible={newChatOpen} animationType="slide" transparent onRequestClose={() => setNewChatOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search co-workers…" placeholderTextColor="#999" />
            <FlatList
              data={filteredDirectory}
              keyExtractor={u => u.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.empty}>No co-workers found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickRow} onPress={() => handlePickDirect(item)}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor(item.id), width: 36, height: 36, borderRadius: 18 }]}>
                    <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
                  </View>
                  <View>
                    <Text style={styles.rowName}>{item.fullName}</Text>
                    <Text style={styles.rowSub}>{item.designation ?? (item.isAdmin ? 'Admin' : 'Staff')}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewChatOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Group modal */}
      <Modal visible={newGroupOpen} animationType="slide" transparent onRequestClose={() => setNewGroupOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Group Chat</Text>
            <Text style={styles.fieldLabel}>Group Name *</Text>
            <TextInput style={styles.input} value={groupName} onChangeText={setGroupName} placeholder="e.g. Marketing Team" placeholderTextColor="#999" />
            <Text style={styles.fieldLabel}>Members *</Text>
            <MultiPicker
              options={directory.map(u => ({ id: u.id, name: u.fullName }))}
              selected={groupMemberIds}
              onChange={setGroupMemberIds}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewGroupOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGroup} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create Group</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  headerBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  headerBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 12 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6, marginTop: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
