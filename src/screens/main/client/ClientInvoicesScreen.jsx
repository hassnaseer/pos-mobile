import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useClientInvoices, useSubmitClientProof } from '../../../services/api/posApi';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../context/CurrencyContext';
import { BASE_URL } from '../../../services/api/globalApi';
import { showToast } from '../../../utils/toast';
import colors from '../../../theme/colors';

const STATUS = {
  Paid: { bg: '#dcfce7', text: '#15803d' },
  'Payment Submitted': { bg: '#dbeafe', text: '#1d4ed8' },
  'Partially Paid': { bg: '#f3e8ff', text: '#7c3aed' },
  Draft: { bg: '#f1f5f9', text: '#475569' },
};

const uploadImage = async asset => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'proof.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Upload failed');
  return json.data?.url ?? '';
};

export default function ClientInvoicesScreen() {
  const { currency: bizCurrency } = useCurrency();
  const { data: raw = [], isLoading, isFetching, refetch } = useClientInvoices();
  const invoices = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { mutateAsync: submitProof } = useSubmitClientProof();
  const [uploadingId, setUploadingId] = useState(null);

  const fmtAmt = (amount, cur) => {
    const c = cur || bizCurrency || 'USD';
    const sym = CURRENCY_SYMBOLS[c] ?? c + ' ';
    return `${sym}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmitProof = inv => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
      if (res.didCancel || !res.assets?.length) return;
      setUploadingId(inv.id);
      try {
        const url = await uploadImage(res.assets[0]);
        if (!url) throw new Error();
        await submitProof({ invoiceId: inv.id, proofUrl: url });
      } catch {
        showToast.error('Failed to submit payment proof');
      } finally {
        setUploadingId(null);
      }
    });
  };

  return (
    <View style={s.root}>
      <View style={s.header}><Text style={s.title}>Invoices</Text><Text style={s.sub}>View your invoices and submit payment proof</Text></View>
      <FlatList
        data={invoices}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No invoices yet.</Text>}
        renderItem={({ item: inv }) => {
          const st = STATUS[inv.status] ?? { bg: '#fef3c7', text: '#b45309' };
          const canSubmit = !['Paid', 'Payment Submitted'].includes(inv.status);
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.invTotal}>Invoice — {fmtAmt(inv.total, inv.currency)}</Text>
                  <Text style={s.invDate}>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}{inv.currency ? `  ·  ${inv.currency}` : ''}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.text }]}>{inv.status}</Text></View>
              </View>

              <View style={s.items}>
                {(inv.lineItems ?? []).map((li, i) => (
                  <View key={i} style={s.itemRow}><Text style={s.itemDesc} numberOfLines={1}>{li.description}</Text><Text style={s.itemAmt}>{fmtAmt(li.amount, inv.currency)}</Text></View>
                ))}
                {parseFloat(String(inv.taxAmount || 0)) > 0 ? (
                  <View style={s.itemRow}><Text style={s.itemMuted}>Tax ({parseFloat(String(inv.taxRate || 0)).toFixed(1)}%)</Text><Text style={s.itemMuted}>{fmtAmt(inv.taxAmount, inv.currency)}</Text></View>
                ) : null}
                <View style={[s.itemRow, s.totalRow]}><Text style={s.totalLabel}>Total</Text><Text style={s.totalVal}>{fmtAmt(inv.total, inv.currency)}</Text></View>
              </View>

              {inv.notes ? <Text style={s.notes}>{inv.notes}</Text> : null}

              <View style={s.actions}>
                {inv.paymentProofUrl ? (
                  <TouchableOpacity onPress={() => Linking.openURL(inv.paymentProofUrl).catch(() => {})}><Text style={s.link}>View Payment Proof</Text></TouchableOpacity>
                ) : null}
                {canSubmit ? (
                  <TouchableOpacity style={s.proofBtn} onPress={() => handleSubmitProof(inv)} disabled={uploadingId === inv.id}>
                    {uploadingId === inv.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.proofBtnText}>Submit Payment Proof</Text>}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  invTotal: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  invDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  items: { backgroundColor: '#f8fafc', borderRadius: 8, marginTop: 10, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: '#eef2f6' },
  itemDesc: { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#475569' },
  itemAmt: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  itemMuted: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8' },
  totalRow: { backgroundColor: '#f1f5f9', borderBottomWidth: 0 },
  totalLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  totalVal: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', fontStyle: 'italic', marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  link: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  proofBtn: { marginLeft: 'auto', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  proofBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
});
