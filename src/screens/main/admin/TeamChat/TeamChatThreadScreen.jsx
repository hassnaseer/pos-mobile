import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Alert, Linking,
} from 'react-native';
import { pick, types, isCancel } from '@react-native-documents/picker'
import { useAuth } from '../../../../context/AuthContext';
import { useInternalChat } from '../../../../hooks/useInternalChat';
import colors from '../../../../theme/colors';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MORE_REACTIONS = ['🎉', '🔥', '👏', '😍', '😅', '🤔', '💯', '✅', '👀', '🙌', '🚀'];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export default function TeamChatThreadScreen({ route, navigation }) {
  const { conversationId } = route.params ?? {};
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const userName = user?.name ?? '';

  const {
    conversations, messages, messagesLoading, sending, isOnline,
    selectConversation, sendMessage, deleteMessage, toggleReaction, deleteConversation,
  } = useInternalChat(userId, userName);

  const conversation = useMemo(() => conversations.find(c => c.id === conversationId), [conversations, conversationId]);
  const [text, setText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [reactionTargetId, setReactionTargetId] = useState(null);
  const flatRef = useRef(null);
  const selectedOnce = useRef(false);

  useEffect(() => {
    if (conversationId && !selectedOnce.current) {
      selectedOnce.current = true;
      selectConversation(conversationId);
    }
  }, [conversationId, selectConversation]);

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const title = conversation
    ? conversation.type === 'group'
      ? conversation.name ?? 'Group'
      : conversation.participantNames[conversation.participantIds.find(id => id !== userId) ?? ''] ?? 'Unknown'
    : '';
  const otherId = conversation?.type === 'direct' ? conversation.participantIds.find(id => id !== userId) : undefined;
  const online = !!otherId && isOnline(otherId);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    const rt = replyTarget;
    setReplyTarget(null);
    try {
      await sendMessage(content, null, rt);
    } catch {
      Alert.alert('Error', 'Failed to send message');
    }
  };

const handlePickFile = async () => {
  try {
    const [picked] = await pick({
      type: [types.allFiles],
    });

    const rt = replyTarget;
    setReplyTarget(null);

    await sendMessage(
      '',
      {
        uri: picked.uri,
        type: picked.type,
        name: picked.name,
      },
      rt
    );

  } catch (e) {
    if (!isCancel(e)) {
      Alert.alert('Error', 'Failed to send attachment');
    }
  }
};

  const handleDeleteMessage = id => {
    Alert.alert('Delete Message', 'Delete this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(id).catch(() => Alert.alert('Error', 'Failed to delete message')) },
    ]);
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      conversation?.type === 'group' ? 'Delete Group' : 'Delete Conversation',
      'This will permanently delete the entire conversation and all its messages for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try { await deleteConversation(conversationId); navigation.goBack(); }
            catch { Alert.alert('Error', 'Failed to delete — you may not have permission to remove this conversation.'); }
          },
        },
      ],
    );
  };

  const handleToggleReaction = (id, emoji) => {
    setReactionTargetId(null);
    toggleReaction(id, emoji).catch(() => Alert.alert('Error', 'Failed to react to message'));
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ position: 'relative' }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{conversation?.type === 'group' ? '👥' : getInitials(title)}</Text>
            </View>
            {online && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSub}>
              {conversation?.type === 'group' ? `${conversation.participantIds.length} members` : online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDeleteConversation} style={styles.deleteBtn}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {messagesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Send a message to start the conversation.</Text>}
          renderItem={({ item }) => {
            const mine = item.senderId === userId;
            const reactions = Object.entries(item.reactions ?? {}).filter(([, uids]) => uids.length > 0);
            return (
              <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}>
                <TouchableOpacity
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                  onLongPress={() => setReactionTargetId(item.id)}
                  activeOpacity={0.85}
                >
                  {!mine && conversation?.type === 'group' && <Text style={styles.senderName}>{item.senderName}</Text>}

                  {item.replyToId && (
                    <View style={[styles.replyBox, mine ? styles.replyBoxMine : styles.replyBoxOther]}>
                      <Text style={[styles.replySender, mine && { color: '#fff' }]}>{item.replyToSenderName}</Text>
                      <Text style={[styles.replyText, mine && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>{item.replyToText}</Text>
                    </View>
                  )}

                  {item.attachmentUrl && item.attachmentType === 'image' && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.attachmentUrl)}>
                      <Image source={{ uri: item.attachmentUrl }} style={styles.attachmentImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  {item.attachmentUrl && item.attachmentType === 'file' && (
                    <TouchableOpacity style={[styles.fileChip, mine && styles.fileChipMine]} onPress={() => Linking.openURL(item.attachmentUrl)}>
                      <Text style={{ fontSize: 14 }}>📎</Text>
                      <Text style={[styles.fileChipText, mine && { color: '#fff' }]} numberOfLines={1}>{item.attachmentName}</Text>
                    </TouchableOpacity>
                  )}
                  {!!item.text && <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.text}</Text>}

                  {reactions.length > 0 && (
                    <View style={styles.reactionsRow}>
                      {reactions.map(([emoji, uids]) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[styles.reactionChip, uids.includes(userId) && styles.reactionChipActive]}
                          onPress={() => handleToggleReaction(item.id, emoji)}
                        >
                          <Text style={styles.reactionText}>{emoji} {uids.length}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                    {item.createdAt?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                <View style={styles.msgActions}>
                  <TouchableOpacity onPress={() => setReactionTargetId(item.id)} style={styles.actionIcon}>
                    <Text>😊</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setReplyTarget({ id: item.id, senderName: item.senderName, text: item.text || (item.attachmentType === 'image' ? 'Photo' : 'Attachment') })}
                    style={styles.actionIcon}
                  >
                    <Text>↩️</Text>
                  </TouchableOpacity>
                  {mine && (
                    <TouchableOpacity onPress={() => handleDeleteMessage(item.id)} style={styles.actionIcon}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {replyTarget && (
        <View style={styles.replyBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBarLabel}>Replying to {replyTarget.senderName}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyTarget.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTarget(null)}><Text style={{ fontSize: 16 }}>✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn} onPress={handlePickFile} disabled={sending}>
          <Text style={{ fontSize: 18 }}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={handleSend} disabled={!text.trim() || sending}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!reactionTargetId} transparent animationType="fade" onRequestClose={() => setReactionTargetId(null)}>
        <TouchableOpacity style={styles.reactionOverlay} activeOpacity={1} onPress={() => setReactionTargetId(null)}>
          <View style={styles.reactionSheet}>
            <View style={styles.reactionGrid}>
              {[...QUICK_REACTIONS, ...MORE_REACTIONS].map(emoji => (
                <TouchableOpacity key={emoji} style={styles.reactionOption} onPress={() => handleToggleReaction(reactionTargetId, emoji)}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  headerTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  headerSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  deleteBtn: { padding: 6 },
  list: { padding: 16, gap: 4 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 60 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 6 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 14, padding: 10 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 1 },
  senderName: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 3 },
  replyBox: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6 },
  replyBoxMine: { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)' },
  replyBoxOther: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  replySender: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  replyText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  attachmentImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6, maxWidth: 220 },
  fileChipMine: { borderColor: 'rgba(255,255,255,0.4)' },
  fileChipText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#374151', flexShrink: 1 },
  msgText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  msgTextMine: { color: '#fff' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F9FAFB' },
  reactionChipActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  reactionText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#374151' },
  msgTime: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  msgActions: { flexDirection: 'row', gap: 2 },
  actionIcon: { padding: 4 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderColor: '#E5E7EB' },
  replyBarLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  replyBarText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  attachBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', maxHeight: 100 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#D0D5DD' },
  sendBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  reactionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  reactionSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '85%' },
  reactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  reactionOption: { padding: 8 },
});
