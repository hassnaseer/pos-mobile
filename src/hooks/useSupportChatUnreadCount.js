import { useEffect, useState } from 'react';

let fs = null;
try { fs = require('@react-native-firebase/firestore'); } catch { fs = null; }
let authModule = null;
try { authModule = require('@react-native-firebase/auth'); } catch { authModule = null; }

/**
 * Mirrors the web app's useChatSupportBadge.ts — live count of unread support
 * conversations (business + guest) for super-admins and support-staff with
 * the chat_support permission. Returns 0 for anyone else / before auth is ready.
 */
export function useSupportChatUnreadCount(user) {
  const [authUid, setAuthUid] = useState(null);
  const [supportUnread, setSupportUnread] = useState(0);
  const [guestUnread, setGuestUnread] = useState(0);

  useEffect(() => {
    if (!authModule) return;
    const unsub = authModule.onAuthStateChanged(authModule.getAuth(), u => setAuthUid(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    setSupportUnread(0);
    setGuestUnread(0);
    if (!fs || !authUid || !user) return;

    const isSuperAdmin = user.role === 'super-admin';
    const isStaff = user.role === 'support-staff' && (user.permissionCodes?.includes('chat_support') ?? false);
    if (!isSuperAdmin && !isStaff) return;

    const db = fs.getFirestore();
    const q1 = fs.query(fs.collection(db, 'support_conversations'), fs.where('isReadBySupport', '==', false));
    const unsub1 = fs.onSnapshot(q1, snap => setSupportUnread(snap.size), () => {});

    const q2 = fs.query(fs.collection(db, 'guest_conversations'), fs.where('isReadBySupport', '==', false));
    const unsub2 = fs.onSnapshot(q2, snap => setGuestUnread(snap.size), () => {});

    return () => { unsub1(); unsub2(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUid, user?.role, user?.permissionCodes?.join(',')]);

  return supportUnread + guestUnread;
}
