import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import {
  useEmailAccounts, useConnectSmtpAccount, useDeleteEmailAccount, useSetDefaultEmailAccount,
} from '../../../../services/api/posApi';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const EMPTY_SMTP = { emailAddress: '', displayName: '', host: '', port: '587', username: '', password: '' };

export default function EmailAccountsScreen() {
  const { data: raw = [], isLoading, isFetching, refetch } = useEmailAccounts();
  const { mutateAsync: connectSmtp, isPending: connecting } = useConnectSmtpAccount();
  const { mutateAsync: remove } = useDeleteEmailAccount();
  const { mutateAsync: setDefault } = useSetDefaultEmailAccount();

  const accounts = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [smtpModal, setSmtpModal] = useState(false);
  const [form, setForm] = useState(EMPTY_SMTP);
  const [oauthLoading, setOauthLoading] = useState(null);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const connectOAuth = async provider => {
    setOauthLoading(provider);
    try {
      const res = await apiClient.get(`/admin/email-accounts/${provider}/auth-url`);
      const url = res?.data?.url ?? res?.url ?? res?.data ?? res;
      if (typeof url !== 'string' || !url.startsWith('http')) throw new Error('No auth URL');
      await Linking.openURL(url);
      Alert.alert('Continue in browser', `Finish connecting your ${provider === 'gmail' ? 'Gmail' : 'Outlook'} account in the browser, then return and pull down to refresh.`);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : `Could not start ${provider} connection`);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSmtp = async () => {
    if (!form.emailAddress.trim() || !form.host.trim() || !form.username.trim() || !form.password) {
      Alert.alert('Required', 'Email, host, username and password are required'); return;
    }
    try {
      await connectSmtp({
        emailAddress: form.emailAddress.trim(),
        displayName: form.displayName.trim() || undefined,
        host: form.host.trim(),
        port: parseInt(form.port, 10) || 587,
        username: form.username.trim(),
        password: form.password,
      });
      setSmtpModal(false);
      setForm(EMPTY_SMTP);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to connect SMTP account');
    }
  };

  const handleDelete = acc => {
    Alert.alert('Remove Account', `Disconnect "${acc.emailAddress}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(acc.id).catch(() => Alert.alert('Error', 'Failed to remove')) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Email Accounts</Text>
        <Text style={styles.sub}>Connect Gmail, Outlook, or SMTP to send from your own address</Text>
      </View>

      <View style={styles.connectRow}>
        <TouchableOpacity style={styles.connectBtn} onPress={() => connectOAuth('gmail')} disabled={oauthLoading === 'gmail'}>
          {oauthLoading === 'gmail' ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.connectText}>Connect Gmail</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.connectBtn} onPress={() => connectOAuth('outlook')} disabled={oauthLoading === 'outlook'}>
          {oauthLoading === 'outlook' ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.connectText}>Connect Outlook</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.connectBtn, styles.smtpBtn]} onPress={() => { setForm(EMPTY_SMTP); setSmtpModal(true); }}>
          <Text style={[styles.connectText, { color: '#fff' }]}>+ SMTP</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={a => String(a.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{item.emailAddress}</Text>
                {item.isDefault ? <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View> : null}
              </View>
              <Text style={styles.cardMeta}>{(item.provider ?? 'smtp').toUpperCase()}{item.isActive === false ? ' · inactive' : ''}</Text>
            </View>
            {!item.isDefault && (
              <TouchableOpacity style={styles.smallBtn} onPress={() => setDefault(item.id).catch(() => Alert.alert('Error', 'Failed'))}>
                <Text style={styles.smallBtnText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delText}>✕</Text></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No email accounts connected yet.</Text>}
      />

      <Modal visible={smtpModal} transparent animationType="slide" onRequestClose={() => setSmtpModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect SMTP Account</Text>
            <View style={styles.field}><Text style={styles.label}>Email Address *</Text>
              <TextInput style={styles.input} value={form.emailAddress} onChangeText={set('emailAddress')} placeholder="you@example.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" /></View>
            <View style={styles.field}><Text style={styles.label}>Display Name</Text>
              <TextInput style={styles.input} value={form.displayName} onChangeText={set('displayName')} placeholder="Your Business" placeholderTextColor="#999" /></View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 2 }]}><Text style={styles.label}>SMTP Host *</Text>
                <TextInput style={styles.input} value={form.host} onChangeText={set('host')} placeholder="smtp.gmail.com" placeholderTextColor="#999" autoCapitalize="none" /></View>
              <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>Port</Text>
                <TextInput style={styles.input} value={form.port} onChangeText={set('port')} placeholder="587" placeholderTextColor="#999" keyboardType="number-pad" /></View>
            </View>
            <View style={styles.field}><Text style={styles.label}>Username *</Text>
              <TextInput style={styles.input} value={form.username} onChangeText={set('username')} placeholder="SMTP username" placeholderTextColor="#999" autoCapitalize="none" /></View>
            <View style={styles.field}><Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} value={form.password} onChangeText={set('password')} placeholder="SMTP password / app password" placeholderTextColor="#999" secureTextEntry /></View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSmtpModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSmtp} disabled={connecting}>
                {connecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Connect</Text>}
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
  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  connectRow: { flexDirection: 'row', gap: 8, padding: 12 },
  connectBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  smtpBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  connectText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  cardMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  defaultBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#15803d' },
  smallBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
