import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';
import colors from '../../../../theme/colors';

const WALLET_NAMES = ['EasyPaisa', 'JazzCash', 'NayaPay', 'SadaPay', 'Raast'];
const BANK_NAMES = ['Alfalah Bank', 'HBL', 'MCB', 'UBL', 'Meezan Bank', 'Bank Al-Habib', 'Habib Metro', 'Allied Bank', 'Faysal Bank', 'Standard Chartered'];
const EMPTY = { type: 'bank', bankName: '', accountTitle: '', accountNumber: '', iban: '' };

const useAccounts = () =>
  useQuery({
    queryKey: ['payment-accounts'],
    queryFn: async () => { const r = await apiClient.get('/admin/payment-accounts'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const PaymentAccountsScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useAccounts();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/payment-accounts/${editing.id}`, data)
      : apiClient.post('/admin/payment-accounts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-accounts'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save account'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => apiClient.patch(`/admin/payment-accounts/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-accounts'] }),
    onError: () => Alert.alert('Error', 'Failed to update status'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/payment-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-accounts'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = a => {
    setEditing(a);
    setForm({ type: a.type ?? 'bank', bankName: a.bankName ?? '', accountTitle: a.accountTitle ?? '', accountNumber: a.accountNumber ?? '', iban: a.iban ?? '' });
    setShowModal(true);
  };
  const handleSave = () => {
    if (!form.bankName.trim() || !form.accountTitle.trim() || !form.accountNumber.trim()) {
      Alert.alert('Error', `${form.type === 'wallet' ? 'Wallet' : 'Bank'} name, account title, and account number are required`);
      return;
    }
    save.mutate({
      type: form.type, bankName: form.bankName.trim(), accountTitle: form.accountTitle.trim(),
      accountNumber: form.accountNumber.trim(), iban: form.type === 'bank' ? (form.iban.trim() || null) : null,
      isActive: editing?.isActive ?? true,
    });
  };
  const handleDelete = a => Alert.alert('Delete Payment Account', `Delete "${a.bankName} — ${a.accountTitle}"? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(a.id) },
  ]);

  const nameOptions = form.type === 'wallet' ? WALLET_NAMES : BANK_NAMES;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View>
          <Text style={s.heading}>Payment Accounts</Text>
          <Text style={s.subheading}>Bank accounts and wallets shown to customers for direct payment</Text>
        </View>
        <HeaderAddButton onPress={openAdd} label="Add" />
      </View>

      <FlatList
        data={list}
        keyExtractor={a => String(a.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No payment accounts added yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.cardLeft}>
                <View style={s.titleRow}>
                  <Text style={s.icon}>{item.type === 'wallet' ? '📱' : '🏦'}</Text>
                  <Text style={s.cardTitle}>{item.bankName}</Text>
                </View>
                <View style={[s.typeBadge, { backgroundColor: item.type === 'wallet' ? '#f3e8ff' : '#dbeafe' }]}>
                  <Text style={[s.typeBadgeText, { color: item.type === 'wallet' ? '#7c3aed' : '#1d4ed8' }]}>{item.type === 'wallet' ? 'Mobile Wallet' : 'Bank Account'}</Text>
                </View>
                <Text style={s.cardSub}>{item.accountTitle}</Text>
                <Text style={s.cardMono}>{item.accountNumber}</Text>
                {item.iban ? <Text style={s.cardMono}>{item.iban}</Text> : null}
              </View>
              <TouchableOpacity
                style={[s.statusBadge, { backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6' }]}
                onPress={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
              >
                <Text style={[s.statusText, { color: item.isActive ? '#16a34a' : '#6b7280' }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Payment Account' : 'Add Payment Account'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Account Type *</Text>
              <View style={s.chips}>
                {[{ key: 'bank', label: 'Bank Account' }, { key: 'wallet', label: 'Mobile Wallet' }].map(t => (
                  <TouchableOpacity key={t.key} style={[s.chip, form.type === t.key && s.chipActive]} onPress={() => setForm(p => ({ ...p, type: t.key, bankName: '' }))}>
                    <Text style={[s.chipText, form.type === t.key && s.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>{form.type === 'wallet' ? 'Wallet Name' : 'Bank Name'} *</Text>
              <View style={s.chips}>
                {nameOptions.map(n => (
                  <TouchableOpacity key={n} style={[s.chip, form.bankName === n && s.chipActive]} onPress={() => set('bankName')(n)}>
                    <Text style={[s.chipText, form.bankName === n && s.chipTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Account Title *</Text>
              <TextInput style={s.input} value={form.accountTitle} onChangeText={set('accountTitle')} placeholder="e.g. John's Bakery" placeholderTextColor="#999" />

              <Text style={s.label}>{form.type === 'wallet' ? 'Phone / Account Number' : 'Account Number'} *</Text>
              <TextInput style={s.input} value={form.accountNumber} onChangeText={set('accountNumber')} placeholder={form.type === 'wallet' ? 'e.g. 03001234567' : 'e.g. 1234567890123'} placeholderTextColor="#999" />

              {form.type === 'bank' && (
                <>
                  <Text style={s.label}>IBAN (optional)</Text>
                  <TextInput style={s.input} value={form.iban} onChangeText={set('iban')} placeholder="e.g. PK36SCBL0000001123456702" placeholderTextColor="#999" autoCapitalize="characters" />
                </>
              )}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save Changes' : 'Add Account'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  subheading: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2, maxWidth: 220 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  icon: { fontSize: 14 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  typeBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b' },
  cardMono: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default PaymentAccountsScreen;
