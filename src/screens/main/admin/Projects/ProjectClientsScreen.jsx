import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const EMPTY = { name: '', email: '', phone: '', company: '', address: '', notes: '' };

const useClients = () =>
  useQuery({
    queryKey: ['project-clients'],
    queryFn: async () => { const r = await apiClient.get('/admin/project-clients'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const ProjectClientsScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useClients();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/project-clients/${editing.id}`, data)
      : apiClient.post('/admin/project-clients', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-clients'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save client'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/project-clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-clients'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = c => { setEditing(c); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', company: c.company ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setShowModal(true); };
  const handleDelete = c => Alert.alert('Delete Client', `Delete "${c.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(c.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Project Clients</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No clients yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.avatar}><Text style={s.avatarText}>{(item.name ?? 'C')[0].toUpperCase()}</Text></View>
            <View style={s.info}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>{[item.company, item.email, item.phone].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Del</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Client' : 'New Client'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['company','Company'],['email','Email'],['phone','Phone'],['address','Address'],['notes','Notes']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'email' ? 'email-address' : k === 'phone' ? 'phone-pad' : 'default'} autoCapitalize="none" />
                </View>
              ))}
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.primary, fontFamily: 'Outfit-Bold', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default ProjectClientsScreen;
