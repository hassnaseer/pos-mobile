import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../services/api/globalApi';

let fs = null;
try { fs = require('@react-native-firebase/firestore'); } catch { fs = null; }
let authModule = null;
try { authModule = require('@react-native-firebase/auth'); } catch { authModule = null; }

const COLLECTION = 'internal_chat_conversations';
const PRESENCE_COLLECTION = 'internal_chat_presence';
const PRESENCE_ONLINE_WINDOW_MS = 60_000;
const PRESENCE_HEARTBEAT_MS = 25_000;

const serverTs = () => fs?.serverTimestamp?.() ?? null;

async function uploadAttachment(file) {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: file.uri, type: file.type ?? 'application/octet-stream', name: file.name ?? 'file' });
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? '';
}

/**
 * Mirrors the web app's internal chat hook (frontend/src/app/hooks/useInternalChat.ts)
 * feature-for-feature: direct/group conversations, reactions, reply-to, delete, presence.
 * Same Firestore collections, so mobile and web users see each other's chats live.
 */
export function useInternalChat(userId, userName) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [authUid, setAuthUid] = useState(null);
  const [presence, setPresence] = useState({});
  const [now, setNow] = useState(() => Date.now());

  const convRetryCount = useRef(0);
  const msgRetryCount = useRef(0);
  const [convRetryTick, setConvRetryTick] = useState(0);
  const [msgRetryTick, setMsgRetryTick] = useState(0);
  const lastSelectedId = useRef(null);

  const scheduleRetry = useCallback((countRef, bump) => {
    if (countRef.current >= 5) return;
    countRef.current += 1;
    setTimeout(bump, 1000 * countRef.current);
  }, []);

  // Track Firebase Auth uid — Firestore rules key off request.auth.uid, which only
  // matches our Postgres userId once the custom-token sign-in has resolved.
  useEffect(() => {
    if (!authModule) return;
    const unsub = authModule.onAuthStateChanged(authModule.getAuth(), u => setAuthUid(u?.uid ?? null));
    return unsub;
  }, []);

  const ready = !!fs && !!userId && authUid === userId;

  // Conversations this user belongs to
  useEffect(() => {
    if (!ready) return;
    const q = fs.query(fs.collection(fs.getFirestore(), COLLECTION), fs.where('participantIds', 'array-contains', userId));
    const unsub = fs.onSnapshot(q, snap => {
        const list = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type,
            name: data.name ?? null,
            participantIds: data.participantIds ?? [],
            participantNames: data.participantNames ?? {},
            participantAvatars: data.participantAvatars ?? {},
            lastMessage: data.lastMessage ?? '',
            lastMessageAt: data.lastMessageAt?.toDate?.() ?? null,
            lastSenderId: data.lastSenderId ?? null,
            readBy: data.readBy ?? [],
          };
        });
        list.sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
        setConversations(list);
        setLoading(false);
        convRetryCount.current = 0;
      }, () => {
        setLoading(false);
        scheduleRetry(convRetryCount, () => setConvRetryTick(t => t + 1));
      });
    return unsub;
  }, [ready, userId, convRetryTick, scheduleRetry]);

  // Messages of the selected conversation
  useEffect(() => {
    if (lastSelectedId.current !== selectedId) {
      lastSelectedId.current = selectedId;
      msgRetryCount.current = 0;
    }
    if (!ready || !selectedId) { setMessages([]); setMessagesLoading(false); return; }
    setMessagesLoading(true);
    const convRef = fs.doc(fs.getFirestore(), COLLECTION, selectedId);
    const q = fs.query(fs.collection(convRef, 'messages'), fs.orderBy('createdAt', 'asc'));
    const unsub = fs.onSnapshot(q, snap => {
        setMessages(snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text ?? '',
            attachmentUrl: data.attachmentUrl,
            attachmentType: data.attachmentType,
            attachmentName: data.attachmentName,
            reactions: data.reactions ?? undefined,
            replyToId: data.replyToId ?? null,
            replyToSenderName: data.replyToSenderName ?? null,
            replyToText: data.replyToText ?? null,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          };
        }));
        setMessagesLoading(false);
        msgRetryCount.current = 0;
      }, () => {
        setMessages([]);
        setMessagesLoading(false);
        scheduleRetry(msgRetryCount, () => setMsgRetryTick(t => t + 1));
      });
    return unsub;
  }, [ready, selectedId, msgRetryTick, scheduleRetry]);

  // Presence heartbeat + listener
  useEffect(() => {
    if (!ready) return;
    const beat = () => fs.setDoc(
      fs.doc(fs.getFirestore(), PRESENCE_COLLECTION, userId),
      { lastSeenAt: serverTs() },
      { merge: true },
    ).catch(() => {});
    beat();
    const interval = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [ready, userId]);

  useEffect(() => {
    if (!ready) return;
    const unsub = fs.onSnapshot(fs.collection(fs.getFirestore(), PRESENCE_COLLECTION), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const ts = d.data().lastSeenAt?.toDate?.();
        if (ts) map[d.id] = ts;
      });
      setPresence(map);
    });
    return unsub;
  }, [ready]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = useCallback(
    otherUserId => {
      const lastSeen = presence[otherUserId];
      return !!lastSeen && now - lastSeen.getTime() < PRESENCE_ONLINE_WINDOW_MS;
    },
    [presence, now],
  );

  const selectConversation = useCallback(async id => {
    setSelectedId(id);
    if (!ready) return;
    await fs.updateDoc(fs.doc(fs.getFirestore(), COLLECTION, id), { readBy: fs.arrayUnion(userId) });
  }, [ready, userId]);

  const notifyRecipients = useCallback((conv, convId, text) => {
    const recipientIds = conv.participantIds.filter(id => id !== userId);
    if (!recipientIds.length) return;
    AsyncStorage.getItem('authToken').then(token => {
      fetch(`${BASE_URL}/admin/internal-chat/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientIds,
          senderName: userName,
          messagePreview: text.slice(0, 100),
          conversationId: convId,
          conversationName: conv.type === 'group' ? conv.name ?? undefined : undefined,
        }),
      }).catch(() => {});
    });
  }, [userId, userName]);

  const sendMessage = useCallback(async (text, file, replyTo) => {
    if (!ready || !selectedId || (!text?.trim() && !file)) return;
    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) return;

    setSending(true);
    try {
      let attachmentUrl, attachmentType, attachmentName;
      if (file) {
        attachmentUrl = await uploadAttachment(file);
        attachmentType = (file.type ?? '').startsWith('image/') ? 'image' : 'file';
        attachmentName = file.name;
      }

      const convRef = fs.doc(fs.getFirestore(), COLLECTION, selectedId);
      await fs.addDoc(fs.collection(convRef, 'messages'), {
        senderId: userId,
        senderName: userName,
        text: (text ?? '').trim(),
        ...(attachmentUrl ? { attachmentUrl, attachmentType, attachmentName } : {}),
        ...(replyTo ? { replyToId: replyTo.id, replyToSenderName: replyTo.senderName, replyToText: replyTo.text.slice(0, 120) } : {}),
        createdAt: serverTs(),
      });

      const preview = (text ?? '').trim() || (attachmentType === 'image' ? '📷 Photo' : `📎 ${attachmentName}`);
      await fs.updateDoc(convRef, {
        lastMessage: preview,
        lastMessageAt: serverTs(),
        lastSenderId: userId,
        readBy: [userId],
      });

      notifyRecipients(conv, selectedId, preview);
    } finally {
      setSending(false);
    }
  }, [ready, selectedId, conversations, userId, userName, notifyRecipients]);

  const deleteMessage = useCallback(async messageId => {
    if (!ready || !selectedId) return;
    const convRef = fs.doc(fs.getFirestore(), COLLECTION, selectedId);
    await fs.deleteDoc(fs.doc(convRef, 'messages', messageId));
  }, [ready, selectedId]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!ready || !selectedId) return;
    const msg = messages.find(m => m.id === messageId);
    const reacted = !!msg?.reactions?.[emoji]?.includes(userId);
    const convRef = fs.doc(fs.getFirestore(), COLLECTION, selectedId);
    await fs.updateDoc(fs.doc(convRef, 'messages', messageId), {
      [`reactions.${emoji}`]: reacted ? fs.arrayRemove(userId) : fs.arrayUnion(userId),
    });
  }, [ready, selectedId, messages, userId]);

  const deleteConversation = useCallback(async id => {
    if (!ready) return;
    const convRef = fs.doc(fs.getFirestore(), COLLECTION, id);
    const msgsSnap = await fs.getDocs(fs.collection(convRef, 'messages'));
    await Promise.all(msgsSnap.docs.map(d => fs.deleteDoc(d.ref)));
    await fs.deleteDoc(convRef);
    setSelectedId(cur => (cur === id ? null : cur));
  }, [ready]);

  const createDirectConversation = useCallback(async other => {
    if (!ready) return null;
    const q = fs.query(
      fs.collection(fs.getFirestore(), COLLECTION),
      fs.where('type', '==', 'direct'),
      fs.where('participantIds', 'array-contains', userId),
    );
    const snap = await fs.getDocs(q);
    const existing = snap.docs.find(d => (d.data().participantIds ?? []).includes(other.id));
    if (existing) {
      await selectConversation(existing.id);
      return existing.id;
    }
    const ref = await fs.addDoc(fs.collection(fs.getFirestore(), COLLECTION), {
      type: 'direct',
      name: null,
      participantIds: [userId, other.id],
      participantNames: { [userId]: userName, [other.id]: other.fullName },
      participantAvatars: { [other.id]: other.avatarUrl ?? null },
      createdBy: userId,
      lastMessage: '',
      lastMessageAt: serverTs(),
      lastSenderId: null,
      readBy: [userId],
      createdAt: serverTs(),
    });
    await selectConversation(ref.id);
    return ref.id;
  }, [ready, userId, userName, selectConversation]);

  const createGroupConversation = useCallback(async (name, members) => {
    if (!ready) return null;
    const participantIds = [userId, ...members.map(m => m.id)];
    const participantNames = { [userId]: userName };
    const participantAvatars = {};
    members.forEach(m => { participantNames[m.id] = m.fullName; participantAvatars[m.id] = m.avatarUrl ?? null; });

    const ref = await fs.addDoc(fs.collection(fs.getFirestore(), COLLECTION), {
      type: 'group',
      name,
      participantIds,
      participantNames,
      participantAvatars,
      createdBy: userId,
      lastMessage: 'Group created',
      lastMessageAt: serverTs(),
      lastSenderId: null,
      readBy: [userId],
      createdAt: serverTs(),
    });
    await selectConversation(ref.id);
    return ref.id;
  }, [ready, userId, userName, selectConversation]);

  const unreadCount = conversations.filter(c => c.lastSenderId && c.lastSenderId !== userId && !c.readBy.includes(userId)).length;

  return {
    conversations, selectedId, messages, loading: loading || !ready, messagesLoading, sending, unreadCount, ready, isOnline,
    selectConversation, sendMessage, createDirectConversation, createGroupConversation,
    deleteConversation, deleteMessage, toggleReaction,
  };
}
