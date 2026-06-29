import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtAmt = n => n ? parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const STATUS_COLOR = {
  Planning:  { bg: '#eff6ff', text: '#1d4ed8' },
  Active:    { bg: '#f0fdf4', text: '#16a34a' },
  'On Hold': { bg: '#fefce8', text: '#b45309' },
  Completed: { bg: '#f9fafb', text: '#6b7280' },
  Cancelled: { bg: '#fef2f2', text: '#dc2626' },
};
const EMPTY = { name: '', description: '', status: 'Active', startDate: '', endDate: '', estimatedBudget: '', projectClientId: '' };

const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => { const r = await apiClient.get('/admin/projects'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const useClients = () =>
  useQuery({
    queryKey: ['project-clients'],
    queryFn: async () => { const r = await apiClient.get('/admin/project-clients'); return r?.data ?? r ?? []; },
    staleTime: 60_000,
  });

const ProjectsScreen = () => {
  const qc = useQueryClient();
  const { data: raw = [], isLoading, refetch } = useProjects();
  const { data: clientRaw = [] } = useClients();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const clients = Array.isArray(clientRaw) ? clientRaw : (clientRaw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/projects/${editing.id}`, data)
      : apiClient.post('/admin/projects', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save project'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', status: p.status ?? 'Active', startDate: p.startDate ?? '', endDate: p.endDate ?? '', estimatedBudget: p.estimatedBudget ? String(parseFloat(p.estimatedBudget)) : '', projectClientId: p.projectClient?.id ?? '' });
    setShowModal(true);
  };
  const handleDelete = p => Alert.alert('Delete Project', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(p.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Projects</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No projects yet.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151' };
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  {item.projectClient?.name && <Text style={s.cardSub}>{item.projectClient.name}</Text>}
                  <Text style={s.cardSub}>{fmt(item.startDate)} – {fmt(item.endDate)}</Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}><Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text></View>
                  {item.estimatedBudget && <Text style={s.budget}>${fmtAmt(item.estimatedBudget)}</Text>}
                </View>
              </View>
              {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
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
            <Text style={s.modalTitle}>{editing ? 'Edit Project' : 'New Project'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['description','Description'],['startDate','Start Date (YYYY-MM-DD)'],['endDate','End Date (YYYY-MM-DD)'],['estimatedBudget','Estimated Budget']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'estimatedBudget' ? 'decimal-pad' : 'default'} />
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
              {clients.length > 0 && (
                <>
                  <Text style={s.label}>Client</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.chip, !form.projectClientId && s.chipActive]} onPress={() => set('projectClientId')('')}>
                        <Text style={[s.chipText, !form.projectClientId && s.chipTextActive]}>None</Text>
                      </TouchableOpacity>
                      {clients.map(c => (
                        <TouchableOpacity key={c.id} style={[s.chip, form.projectClientId === c.id && s.chipActive]} onPress={() => set('projectClientId')(c.id)}>
                          <Text style={[s.chipText, form.projectClientId === c.id && s.chipTextActive]}>{c.name}</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  budget: { fontSize: 13, fontFamily: 'Outfit-Bold', color: colors.primary },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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

export default ProjectsScreen;
