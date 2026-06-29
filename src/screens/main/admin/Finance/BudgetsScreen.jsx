import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtAmt = n => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PERIODS = ['monthly', 'yearly', 'custom'];
const EMPTY = { name: '', period: 'monthly', startDate: '', endDate: '', amount: '', notes: '' };

const useBudgets = () =>
  useQuery({
    queryKey: ['budgets'],
    queryFn: async () => { const r = await apiClient.get('/admin/budgets'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const BudgetsScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useBudgets();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/budgets/${editing.id}`, data)
      : apiClient.post('/admin/budgets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save budget'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = b => {
    setEditing(b);
    setForm({ name: b.name, period: b.period ?? 'monthly', startDate: b.startDate ?? '', endDate: b.endDate ?? '', amount: String(parseFloat(b.amount)), notes: b.notes ?? '' });
    setShowModal(true);
  };
  const handleDelete = b => Alert.alert('Delete Budget', `Delete "${b.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(b.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Budgets</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={b => String(b.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No budgets yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.cardLeft}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>{item.period} · {fmt(item.startDate)} – {fmt(item.endDate)}</Text>
              </View>
              <Text style={s.amount}>${fmtAmt(item.amount)}</Text>
            </View>
            {item.notes ? <Text style={s.notes} numberOfLines={1}>{item.notes}</Text> : null}
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
            <Text style={s.modalTitle}>{editing ? 'Edit Budget' : 'New Budget'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['amount','Amount *'],['startDate','Start Date (YYYY-MM-DD)'],['endDate','End Date (YYYY-MM-DD)'],['notes','Notes']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'amount' ? 'decimal-pad' : 'default'} />
                </View>
              ))}
              <Text style={s.label}>Period</Text>
              <View style={s.chips}>
                {PERIODS.map(p => (
                  <TouchableOpacity key={p} style={[s.chip, form.period === p && s.chipActive]} onPress={() => set('period')(p)}>
                    <Text style={[s.chipText, form.period === p && s.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  amount: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary, marginLeft: 8 },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default BudgetsScreen;
