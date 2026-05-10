import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];
const STATUS_COLORS = {
  scheduled: { bg: '#dbeafe', text: '#1d4ed8' },
  completed: { bg: '#dcfce7', text: '#16a34a' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  'no-show':  { bg: '#fef9c3', text: '#b45309' },
};

const useAppointments = (date, status) =>
  useQuery({
    queryKey: ['medical-appointments', date, status],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (date) p.set('date', date);
      if (status) p.set('status', status);
      const res = await apiClient.get(`/admin/medical/appointments${p.toString() ? `?${p}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const usePatientsList = () =>
  useQuery({
    queryKey: ['medical-patients', ''],
    queryFn: async () => {
      const res = await apiClient.get('/admin/medical/patients');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

const useDoctorsList = () =>
  useQuery({
    queryKey: ['medical-doctors'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/medical/doctors');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

const useCreateAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/appointments', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-appointments'] }),
  });
};

const useUpdateAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/appointments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-appointments'] }),
  });
};

const EMPTY = { patientId: '', doctorId: '', date: '', time: '', notes: '', status: 'scheduled' };

const AppointmentsScreen = () => {
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const today = new Date().toISOString().slice(0, 10);

  const { data: raw = [], isLoading, refetch } = useAppointments('', filterStatus);
  const appointments = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { data: pRaw = [] } = usePatientsList();
  const patients = Array.isArray(pRaw) ? pRaw : (pRaw?.data ?? []);

  const { data: dRaw = [] } = useDoctorsList();
  const doctors = Array.isArray(dRaw) ? dRaw : (dRaw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateAppointment();
  const { mutateAsync: update, isPending: updating } = useUpdateAppointment();

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, date: today }); setShowModal(true); };
  const openEdit = a => {
    setEditing(a);
    setForm({
      patientId: String(a.patient?.id ?? a.patientId ?? ''),
      doctorId: String(a.doctor?.id ?? a.doctorId ?? ''),
      date: a.date?.slice(0, 10) ?? '',
      time: a.time ?? '',
      notes: a.notes ?? '',
      status: a.status ?? 'scheduled',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date) { Alert.alert('Error', 'Date is required'); return; }
    try {
      const payload = { ...form, patientId: form.patientId || undefined, doctorId: form.doctorId || undefined };
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const isSaving = creating || updating;
  const sc = STATUS_COLORS;

  return (
    <View style={styles.root}>
      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...STATUSES].map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={appointments}
        keyExtractor={a => String(a.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No appointments found.</Text>}
        renderItem={({ item }) => {
          const col = sc[item.status] ?? sc.scheduled;
          return (
            <TouchableOpacity style={styles.row} onPress={() => openEdit(item)}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowDate}>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</Text>
                {item.time ? <Text style={styles.rowTime}>{item.time}</Text> : null}
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.patient?.name ?? 'Patient'}</Text>
                {item.doctor?.name ? <Text style={styles.rowSub}>Dr. {item.doctor.name}</Text> : null}
                {item.notes ? <Text style={styles.rowSub} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={[styles.badge, { backgroundColor: col.bg }]}>
                <Text style={[styles.badgeText, { color: col.text }]}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Appointment' : 'New Appointment'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Patient picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Patient</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {patients.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pickerChip, form.patientId === String(p.id) && styles.pickerChipActive]}
                      onPress={() => setForm(f => ({ ...f, patientId: String(p.id) }))}
                    >
                      <Text style={[styles.pickerText, form.patientId === String(p.id) && styles.pickerTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* Doctor picker */}
              <View style={styles.field}>
                <Text style={styles.label}>Doctor</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {doctors.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.pickerChip, form.doctorId === String(d.id) && styles.pickerChipActive]}
                      onPress={() => setForm(f => ({ ...f, doctorId: String(d.id) }))}
                    >
                      <Text style={[styles.pickerText, form.doctorId === String(d.id) && styles.pickerTextActive]}>Dr. {d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Date *</Text>
                <TextInput style={styles.input} value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Time</Text>
                <TextInput style={styles.input} value={form.time} onChangeText={set('time')} placeholder="e.g. 10:30 AM" placeholderTextColor="#999" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.chips}>
                  {STATUSES.map(s => (
                    <TouchableOpacity key={s} style={[styles.chip, form.status === s && styles.chipActive]} onPress={() => setForm(f => ({ ...f, status: s }))}>
                      <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput style={[styles.input, { height: 70 }]} value={form.notes} onChangeText={set('notes')} placeholder="Notes" placeholderTextColor="#999" multiline />
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
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 54 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  filterTextActive: { color: '#fff' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 4 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10 },
  rowLeft: { alignItems: 'center', minWidth: 50 },
  rowDate: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, textAlign: 'center' },
  rowTime: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', marginTop: 2 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', marginRight: 6 },
  pickerChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  pickerText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  pickerTextActive: { color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default AppointmentsScreen;
