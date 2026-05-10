import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const usePatients = search =>
  useQuery({
    queryKey: ['medical-patients', search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiClient.get(`/admin/medical/patients${qs}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/patients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const useUpdatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/patients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const useDeletePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const EMPTY = { name: '', phone: '', email: '', age: '', gender: '', address: '', medicalHistory: '', allergies: '', notes: '' };
const GENDERS = ['Male', 'Female', 'Other'];

const PatientsScreen = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const { data: raw = [], isLoading, refetch } = usePatients(search);
  const patients = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { mutateAsync: create, isPending: creating } = useCreatePatient();
  const { mutateAsync: update, isPending: updating } = useUpdatePatient();
  const { mutate: remove } = useDeletePatient();

  const calcAge = dob => {
    if (!dob) return '—';
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return isNaN(y) ? '—' : y;
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({
      name: p.name ?? '', phone: p.phone ?? '', email: p.email ?? '',
      age: String(calcAge(p.dateOfBirth)), gender: p.gender ?? '',
      address: p.address ?? '', medicalHistory: p.medicalHistory ?? '',
      allergies: p.allergies ?? '', notes: p.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const ageNum = parseInt(form.age) || 0;
    const payload = {
      name: form.name, phone: form.phone, email: form.email,
      gender: form.gender, address: form.address,
      medicalHistory: form.medicalHistory, allergies: form.allergies, notes: form.notes,
      ...(ageNum > 0 ? { dateOfBirth: `${new Date().getFullYear() - ageNum}-01-01` } : {}),
    };
    try {
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = p => Alert.alert('Delete Patient', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No patients yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name ?? 'P')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {[item.gender, calcAge(item.dateOfBirth) !== '—' ? `${calcAge(item.dateOfBirth)} yrs` : null, item.phone].filter(Boolean).join(' · ')}
              </Text>
              {item.medicalHistory ? <Text style={styles.rowSub} numberOfLines={1}>{item.medicalHistory}</Text> : null}
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Patient' : 'New Patient'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'name', label: 'Full Name *' },
                { key: 'age', label: 'Age', keyboard: 'number-pad' },
                { key: 'phone', label: 'Phone', keyboard: 'phone-pad' },
                { key: 'email', label: 'Email', keyboard: 'email-address' },
                { key: 'address', label: 'Address' },
                { key: 'medicalHistory', label: 'Medical History / Conditions' },
                { key: 'allergies', label: 'Allergies' },
                { key: 'notes', label: 'Notes' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={set(f.key)}
                    keyboardType={f.keyboard ?? 'default'}
                    placeholder={f.label.replace(' *', '')}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chips}>
                  {GENDERS.map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, form.gender === g && styles.chipActive]}
                      onPress={() => setForm(p => ({ ...p, gender: g }))}
                    >
                      <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
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
  topBar: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.primary, fontFamily: 'Outfit-Bold', fontSize: 15 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default PatientsScreen;
