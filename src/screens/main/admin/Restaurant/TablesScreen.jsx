import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const TABLE_STATUSES = ['available', 'occupied', 'reserved'];
const STATUS_COLORS = {
  available: { bg: '#dcfce7', text: '#16a34a' },
  occupied:  { bg: '#fee2e2', text: '#dc2626' },
  reserved:  { bg: '#fef9c3', text: '#b45309' },
};

const useTables = () =>
  useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/restaurant/tables');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useCreateTable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/restaurant/tables', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-tables'] }),
  });
};

const useUpdateTable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/restaurant/tables/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-tables'] }),
  });
};

const useDeleteTable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/restaurant/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-tables'] }),
  });
};

const EMPTY = { tableNumber: '', capacity: '', status: 'available', notes: '' };

const TablesScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const { data: raw = [], isLoading, refetch } = useTables();
  const tables = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { mutateAsync: create, isPending: creating } = useCreateTable();
  const { mutateAsync: update, isPending: updating } = useUpdateTable();
  const { mutate: remove } = useDeleteTable();

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = t => {
    setEditing(t);
    setForm({ tableNumber: String(t.tableNumber ?? ''), capacity: String(t.capacity ?? ''), status: t.status ?? 'available', notes: t.notes ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.tableNumber.trim()) { Alert.alert('Error', 'Table number is required'); return; }
    const payload = { tableNumber: form.tableNumber, capacity: parseInt(form.capacity) || 0, status: form.status, notes: form.notes };
    try {
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = t => Alert.alert('Delete Table', `Delete Table #${t.tableNumber}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(t.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Tables</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tables}
        keyExtractor={t => String(t.id)}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        columnWrapperStyle={{ gap: 10 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No tables yet.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.available;
          return (
            <TouchableOpacity style={styles.tableCard} onPress={() => openEdit(item)}>
              <Text style={styles.tableNum}>Table #{item.tableNumber}</Text>
              <Text style={styles.tableCap}>{item.capacity ?? '—'} seats</Text>
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
              </View>
              <TouchableOpacity style={styles.delBtnSmall} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Table' : 'New Table'}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Table Number *</Text>
              <TextInput style={styles.input} value={form.tableNumber} onChangeText={set('tableNumber')} placeholder="e.g. 1, A1" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Capacity (seats)</Text>
              <TextInput style={styles.input} value={form.capacity} onChangeText={set('capacity')} placeholder="4" placeholderTextColor="#999" keyboardType="number-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.chips}>
                {TABLE_STATUSES.map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, form.status === s && styles.chipActive]} onPress={() => setForm(f => ({ ...f, status: s }))}>
                    <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={form.notes} onChangeText={set('notes')} placeholder="Notes" placeholderTextColor="#999" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  tableCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'center', position: 'relative' },
  tableNum: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 4 },
  tableCap: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 10 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  delBtnSmall: { position: 'absolute', top: 8, right: 8, padding: 4 },
  delText: { fontSize: 12, color: '#ef4444', fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default TablesScreen;
