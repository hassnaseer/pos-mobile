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

const STATUS_COLOR = {
  Draft:   { bg: '#f9fafb', text: '#6b7280' },
  Pending: { bg: '#fefce8', text: '#b45309' },
  Partial: { bg: '#eff6ff', text: '#1d4ed8' },
  Paid:    { bg: '#f0fdf4', text: '#16a34a' },
  Overdue: { bg: '#fef2f2', text: '#dc2626' },
};
const EMPTY = { title: '', amount: '', issueDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '' };

const useBills = () =>
  useQuery({
    queryKey: ['supplier-bills'],
    queryFn: async () => { const r = await apiClient.get('/admin/supplier-bills'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => { const r = await apiClient.get('/admin/suppliers?limit=100'); return r?.data?.items ?? r?.data ?? r ?? []; },
    staleTime: 60_000,
  });

const SupplierBillsScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useBills();
  const { data: supplierRaw = [] } = useSuppliers();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const suppliers = Array.isArray(supplierRaw) ? supplierRaw : (supplierRaw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, supplierId: '' });
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/supplier-bills/${editing.id}`, data)
      : apiClient.post('/admin/supplier-bills', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-bills'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save bill'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/supplier-bills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-bills'] }),
  });

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, supplierId: '' }); setShowModal(true); };
  const openEdit = b => {
    setEditing(b);
    setForm({ title: b.title, amount: String(parseFloat(b.amount)), issueDate: b.issueDate ?? '', dueDate: b.dueDate ?? '', notes: b.notes ?? '', supplierId: b.supplier?.id ?? '' });
    setShowModal(true);
  };
  const handleDelete = b => Alert.alert('Delete Bill', `Delete "${b.title}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(b.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Supplier Bills</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={b => String(b.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No supplier bills yet.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151' };
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={s.cardLeft}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardSub}>Due: {fmt(item.dueDate)}{item.supplier?.name ? ` · ${item.supplier.name}` : ''}</Text>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.amount}>${fmtAmt(item.amount)}</Text>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}><Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text></View>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Bill' : 'New Bill'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['title','Title *'],['amount','Amount *'],['issueDate','Issue Date (YYYY-MM-DD)'],['dueDate','Due Date (YYYY-MM-DD)'],['notes','Notes']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'amount' ? 'decimal-pad' : 'default'} />
                </View>
              ))}
              {suppliers.length > 0 && (
                <>
                  <Text style={s.label}>Supplier</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.chip, !form.supplierId && s.chipActive]} onPress={() => set('supplierId')('')}>
                        <Text style={[s.chipText, !form.supplierId && s.chipTextActive]}>None</Text>
                      </TouchableOpacity>
                      {suppliers.map(su => (
                        <TouchableOpacity key={su.id} style={[s.chip, form.supplierId === su.id && s.chipActive]} onPress={() => set('supplierId')(su.id)}>
                          <Text style={[s.chipText, form.supplierId === su.id && s.chipTextActive]}>{su.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
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

export default SupplierBillsScreen;
