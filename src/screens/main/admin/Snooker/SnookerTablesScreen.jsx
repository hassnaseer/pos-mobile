import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const STATUSES = ['Available', 'Occupied', 'Maintenance'];
const STATUS_COLOR = {
  Available:   { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
  Occupied:    { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  Maintenance: { bg: '#fefce8', text: '#b45309', dot: '#f59e0b' },
};
const EMPTY = { name: '', tableNumber: '', status: 'Available', notes: '' };

const useTables = () =>
  useQuery({
    queryKey: ['snooker-tables'],
    queryFn: async () => { const r = await apiClient.get('/admin/snooker/tables'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const SnookerTablesScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useTables();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/snooker/tables/${editing.id}`, data)
      : apiClient.post('/admin/snooker/tables', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snooker-tables'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save table'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/snooker/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snooker-tables'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = t => { setEditing(t); setForm({ name: t.name, tableNumber: t.tableNumber != null ? String(t.tableNumber) : '', status: t.status ?? 'Available', notes: t.notes ?? '' }); setShowModal(true); };
  const handleDelete = t => Alert.alert('Delete Table', `Delete "${t.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(t.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Snooker Tables</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 12 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No tables yet.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151', dot: '#6b7280' };
          return (
            <View style={[s.card, { backgroundColor: sc.bg }]}>
              <View style={s.cardTop}>
                <View style={[s.dot, { backgroundColor: sc.dot }]} />
                <Text style={[s.status, { color: sc.text }]}>{item.status}</Text>
              </View>
              <Text style={s.tableName}>{item.name}</Text>
              {item.tableNumber != null && <Text style={s.tableNum}>Table #{item.tableNumber}</Text>}
              <View style={s.cardActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Del</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Table' : 'New Table'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['tableNumber','Table Number'],['notes','Notes']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'tableNumber' ? 'number-pad' : 'default'} />
                </View>
              ))}
              <Text style={s.label}>Status</Text>
              <View style={s.chips}>
                {STATUSES.map(st => (
                  <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => set('status')(st)}>
                    <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
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
  card: { flex: 1, marginTop: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 11, fontFamily: 'Outfit-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  tableNum: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
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

export default SnookerTablesScreen;
