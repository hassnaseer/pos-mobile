import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const EMPTY_MED = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };
const EMPTY_RX = { diagnosis: '', notes: '', prescribedDate: new Date().toISOString().slice(0, 10), nextVisitDate: '', medications: [{ ...EMPTY_MED }] };

const usePrescriptions = patientId =>
  useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/medical/patients/${patientId}/prescriptions`);
      return res?.data ?? res ?? [];
    },
    enabled: !!patientId,
    staleTime: 30_000,
  });

const useCreateRx = patientId => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post(`/admin/medical/patients/${patientId}/prescriptions`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', patientId] }),
  });
};

const useUpdateRx = patientId => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/prescriptions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', patientId] }),
  });
};

const useDeleteRx = patientId => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/prescriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', patientId] }),
  });
};

const PatientPrescriptionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { patientId, patientName } = route.params ?? {};

  const { data: raw = [], isLoading, refetch } = usePrescriptions(patientId);
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: createRx, isPending: creating } = useCreateRx(patientId);
  const { mutateAsync: updateRx, isPending: updating } = useUpdateRx(patientId);
  const { mutate: deleteRx } = useDeleteRx(patientId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_RX);

  const setField = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY_RX); setShowModal(true); };
  const openEdit = rx => {
    setEditing(rx);
    setForm({
      diagnosis: rx.diagnosis ?? '',
      notes: rx.notes ?? '',
      prescribedDate: rx.prescribedDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      nextVisitDate: rx.nextVisitDate?.slice(0, 10) ?? '',
      medications: rx.medications?.length ? rx.medications.map(m => ({ ...EMPTY_MED, ...m })) : [{ ...EMPTY_MED }],
    });
    setShowModal(true);
  };

  const addMed = () => setForm(p => ({ ...p, medications: [...p.medications, { ...EMPTY_MED }] }));
  const removeMed = i => setForm(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }));
  const setMedField = (i, k) => v => setForm(p => {
    const meds = [...p.medications];
    meds[i] = { ...meds[i], [k]: v };
    return { ...p, medications: meds };
  });

  const handleSave = async () => {
    if (!form.diagnosis.trim()) { Alert.alert('Error', 'Diagnosis is required'); return; }
    const payload = {
      diagnosis: form.diagnosis,
      notes: form.notes,
      prescribedDate: form.prescribedDate || new Date().toISOString().slice(0, 10),
      nextVisitDate: form.nextVisitDate || null,
      medications: form.medications.filter(m => m.name.trim()),
    };
    try {
      if (editing) await updateRx({ id: editing.id, ...payload });
      else await createRx(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Failed to save prescription'); }
  };

  const handleDelete = rx => Alert.alert('Delete Prescription', `Delete this prescription for "${rx.diagnosis}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteRx(rx.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>Prescriptions — {patientName ?? 'Patient'}</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No prescriptions yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.diagnosis}>{item.diagnosis || 'No diagnosis'}</Text>
              <Text style={s.date}>{fmt(item.prescribedDate)}</Text>
            </View>
            {item.medications?.filter(m => m.name).length > 0 && (
              <View style={s.medList}>
                {item.medications.filter(m => m.name).map((m, i) => (
                  <View key={i} style={s.medTag}>
                    <Text style={s.medName}>{m.name}</Text>
                    {m.dosage ? <Text style={s.medSub}> · {m.dosage}</Text> : null}
                    {m.frequency ? <Text style={s.medSub}> · {m.frequency}</Text> : null}
                    {m.duration ? <Text style={s.medSub}> for {m.duration}</Text> : null}
                  </View>
                ))}
              </View>
            )}
            {item.notes ? <Text style={s.notes} numberOfLines={2}>{item.notes}</Text> : null}
            {item.nextVisitDate ? (
              <Text style={s.nextVisit}>Next visit: {fmt(item.nextVisitDate)}</Text>
            ) : null}
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                <Text style={s.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}>
                <Text style={s.delText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Prescription' : 'New Prescription'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Diagnosis *</Text>
              <TextInput style={s.input} value={form.diagnosis} onChangeText={setField('diagnosis')} placeholder="e.g. Upper respiratory infection" placeholderTextColor="#999" />

              <Text style={s.label}>Prescribed Date</Text>
              <TextInput style={s.input} value={form.prescribedDate} onChangeText={setField('prescribedDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />

              <Text style={s.label}>Next Visit Date</Text>
              <TextInput style={s.input} value={form.nextVisitDate} onChangeText={setField('nextVisitDate')} placeholder="YYYY-MM-DD (optional)" placeholderTextColor="#999" />

              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={setField('notes')} placeholder="Additional notes..." placeholderTextColor="#999" multiline />

              <View style={s.medHeader}>
                <Text style={s.label}>Medications</Text>
                <TouchableOpacity onPress={addMed} style={s.addMedBtn}>
                  <Text style={s.addMedText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {form.medications.map((m, i) => (
                <View key={i} style={s.medForm}>
                  <View style={s.medFormHeader}>
                    <Text style={s.medFormLabel}>Medication {i + 1}</Text>
                    {form.medications.length > 1 && (
                      <TouchableOpacity onPress={() => removeMed(i)}>
                        <Text style={s.removeText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {[
                    { key: 'name', placeholder: 'Drug name *' },
                    { key: 'dosage', placeholder: 'Dosage (e.g. 500mg)' },
                    { key: 'frequency', placeholder: 'Frequency (e.g. twice daily)' },
                    { key: 'duration', placeholder: 'Duration (e.g. 5 days)' },
                    { key: 'instructions', placeholder: 'Instructions' },
                  ].map(f => (
                    <TextInput
                      key={f.key}
                      style={[s.input, { marginBottom: 6 }]}
                      value={m[f.key]}
                      onChangeText={setMedField(i, f.key)}
                      placeholder={f.placeholder}
                      placeholderTextColor="#999"
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  back: { padding: 4 },
  backText: { fontSize: 14, color: colors.primary, fontFamily: 'Outfit-Medium' },
  title: { flex: 1, fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 12, padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  diagnosis: { flex: 1, fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  date: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginLeft: 8 },
  medList: { gap: 4 },
  medTag: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  medName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1d4ed8' },
  medSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#4b5563' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b' },
  nextVisit: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#16a34a', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40, fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 2 },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  addMedBtn: { backgroundColor: colors.primary + '20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addMedText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  medForm: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  medFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medFormLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  removeText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#ef4444' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default PatientPrescriptionsScreen;
