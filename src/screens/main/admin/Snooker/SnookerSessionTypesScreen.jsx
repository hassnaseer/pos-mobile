import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const BILLING_METHODS = ['per_hour', 'per_minute', 'per_game'];
const BILLING_LABELS  = { per_hour: 'Per Hour', per_minute: 'Per Minute', per_game: 'Per Game' };
const BILLING_UNITS   = { per_hour: '/hr', per_minute: '/min', per_game: '/game' };
const EMPTY = { name: '', billingMethod: 'per_hour', rate: '', description: '', isActive: true };

const useSessionTypes = () =>
  useQuery({
    queryKey: ['snooker-session-types'],
    queryFn: async () => { const r = await apiClient.get('/admin/snooker/session-types'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const SnookerSessionTypesScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useSessionTypes();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/snooker/session-types/${editing.id}`, data)
      : apiClient.post('/admin/snooker/session-types', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snooker-session-types'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save session type'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/snooker/session-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snooker-session-types'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = st => { setEditing(st); setForm({ name: st.name, billingMethod: st.billingMethod, rate: String(parseFloat(st.rate)), description: st.description ?? '', isActive: st.isActive !== false }); setShowModal(true); };
  const handleDelete = st => Alert.alert('Delete', `Delete "${st.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(st.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Session Types</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={st => String(st.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No session types yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.cardLeft}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>{BILLING_LABELS[item.billingMethod] ?? item.billingMethod}</Text>
              </View>
              <View style={s.cardRight}>
                <Text style={s.rate}>${parseFloat(item.rate).toFixed(2)}<Text style={s.unit}>{BILLING_UNITS[item.billingMethod]}</Text></Text>
                <View style={[s.badge, { backgroundColor: item.isActive !== false ? '#f0fdf4' : '#f9fafb' }]}>
                  <Text style={[s.badgeText, { color: item.isActive !== false ? '#16a34a' : '#6b7280' }]}>{item.isActive !== false ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            </View>
            {item.description ? <Text style={s.desc} numberOfLines={1}>{item.description}</Text> : null}
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
            <Text style={s.modalTitle}>{editing ? 'Edit Session Type' : 'New Session Type'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['rate','Rate *'],['description','Description']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'rate' ? 'decimal-pad' : 'default'} />
                </View>
              ))}
              <Text style={s.label}>Billing Method</Text>
              <View style={s.chips}>
                {BILLING_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[s.chip, form.billingMethod === m && s.chipActive]} onPress={() => set('billingMethod')(m)}>
                    <Text style={[s.chipText, form.billingMethod === m && s.chipTextActive]}>{BILLING_LABELS[m]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.row}>
                <Text style={s.label}>Active</Text>
                <TouchableOpacity style={[s.toggle, form.isActive && s.toggleOn]} onPress={() => set('isActive')(!form.isActive)}>
                  <Text style={[s.toggleText, form.isActive && s.toggleTextOn]}>{form.isActive ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={() => save.mutate({ ...form, rate: parseFloat(form.rate) })} disabled={save.isPending}>
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
  rate: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary },
  unit: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#64748b' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  toggleTextOn: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SnookerSessionTypesScreen;
