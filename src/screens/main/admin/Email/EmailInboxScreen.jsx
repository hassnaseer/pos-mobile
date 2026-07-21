import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import {
  useEmailThreads, useThreadMessages, useSendThreadReply,
  useEmailAccounts, useEmailTemplates,
} from '../../../../services/api/posApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const stripHtml = html => (html ? String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '');

const timeAgo = iso => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function EmailInboxScreen() {
  const { data: threadsRaw = [], isLoading: threadsLoading, isFetching, refetch } = useEmailThreads();
  const { data: accountsRaw = [] } = useEmailAccounts();
  const { data: templatesRaw = [] } = useEmailTemplates();
  const threads = Array.isArray(threadsRaw) ? threadsRaw : (threadsRaw?.data ?? []);
  const accounts = (Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw?.data ?? [])).filter(a => a.isActive);
  const templates = Array.isArray(templatesRaw) ? templatesRaw : (templatesRaw?.data ?? []);

  const [active, setActive] = useState(null); // active thread object
  const { data: msgsRaw = [], isLoading: msgsLoading } = useThreadMessages(active?.threadKey);
  const messages = Array.isArray(msgsRaw) ? msgsRaw : (msgsRaw?.data ?? []);
  const { mutateAsync: sendReply, isPending: sending } = useSendThreadReply();

  const [accountId, setAccountId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => { if (!accountId && accounts.length) setAccountId(accounts[0].id); }, [accounts, accountId]);

  const openThread = t => {
    setActive(t);
    setSubject(t.lastSubject?.startsWith('Re:') ? t.lastSubject : `Re: ${t.lastSubject ?? ''}`);
    setBody('');
  };

  const applyTemplate = id => {
    const t = templates.find(tt => tt.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  const handleSend = async () => {
    if (!active?.threadKey || !accountId || !subject || !body) return;
    try {
      await sendReply({ threadKey: active.threadKey, accountId, subject, body });
      setBody('');
    } catch { /* toast handled */ }
  };

  // ── Conversation view ──
  if (active) {
    return (
      <View style={s.root}>
        <View style={s.convHeader}>
          <TouchableOpacity onPress={() => setActive(null)} style={s.back}><Text style={s.backText}>← Inbox</Text></TouchableOpacity>
          <Text style={s.convName} numberOfLines={1}>{active.counterpartName || active.counterpartEmail}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {msgsLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : messages.map(m => (
            <View key={m.id} style={[s.msg, m.direction === 'outbound' ? s.msgOut : s.msgIn]}>
              <View style={s.msgMeta}>
                <Text style={s.msgFrom}>{m.direction === 'outbound' ? 'You' : (m.counterpartName || m.counterpartEmail)}</Text>
                <Text style={s.msgTime}>{timeAgo(m.occurredAt)}</Text>
              </View>
              {m.subject ? <Text style={s.msgSubject}>{m.subject}</Text> : null}
              <Text style={s.msgBody}>{stripHtml(m.bodyHtml)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.composer}>
          {accounts.length > 0 && (
            <InlinePicker
              options={accounts.map(a => ({ id: a.id, name: a.emailAddress }))}
              value={accountId} onSelect={setAccountId} allowNone={false} placeholder="From account"
            />
          )}
          {templates.length > 0 && (
            <InlinePicker
              options={templates.map(t => ({ id: t.id, name: t.name }))}
              value="" onSelect={applyTemplate} placeholder="Use a template"
            />
          )}
          <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#999" />
          <TextInput style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="Write your reply..." placeholderTextColor="#999" multiline />
          <TouchableOpacity style={[s.sendBtn, (!accountId || !subject || !body) && { opacity: 0.5 }]} onPress={handleSend} disabled={sending || !accountId || !subject || !body}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendText}>Send</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Thread list ──
  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Inbox</Text>
        <Text style={s.sub}>Emails sent & received through your connected accounts</Text>
      </View>
      {!accounts.length && !threadsLoading ? (
        <Text style={s.notice}>No email account connected yet. Connect one in Settings → Email Accounts.</Text>
      ) : null}
      <FlatList
        data={threads}
        keyExtractor={t => t.threadKey}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!threadsLoading && <Text style={s.empty}>No conversations yet — replies will show up here.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.threadRow} onPress={() => openThread(item)}>
            <View style={s.threadTop}>
              <Text style={s.threadName} numberOfLines={1}>{item.counterpartName || item.counterpartEmail}</Text>
              {item.unreadCount > 0 ? <View style={s.badge}><Text style={s.badgeText}>{item.unreadCount}</Text></View> : null}
            </View>
            <Text style={s.threadSubject} numberOfLines={1}>{item.lastSubject}</Text>
            <Text style={s.threadSnippet} numberOfLines={1}>{stripHtml(item.lastSnippet)}</Text>
            <Text style={s.threadTime}>{timeAgo(item.occurredAt)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  notice: { margin: 12, padding: 12, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 8, color: '#92400e', fontFamily: 'Outfit-Regular', fontSize: 12.5 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  threadRow: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  threadName: { flex: 1, fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },
  threadSubject: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginTop: 2 },
  threadSnippet: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  threadTime: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#cbd5e1', marginTop: 3 },
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  back: { padding: 4 },
  backText: { fontSize: 14, color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  convName: { flex: 1, fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  msg: { borderRadius: 10, padding: 10, marginBottom: 10, maxWidth: '88%' },
  msgIn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', alignSelf: 'flex-start' },
  msgOut: { backgroundColor: '#eff6ff', alignSelf: 'flex-end' },
  msgMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 3 },
  msgFrom: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#64748b' },
  msgTime: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8' },
  msgSubject: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0f172a', marginBottom: 2 },
  msgBody: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  composer: { borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff', padding: 12, gap: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', backgroundColor: '#fff' },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  sendText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});
