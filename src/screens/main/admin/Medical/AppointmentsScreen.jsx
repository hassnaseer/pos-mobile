import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const STATUSES = ['', 'scheduled', 'completed', 'cancelled', 'no_show'];
const STATUS_STYLE = {
  scheduled:  { bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled' },
  completed:  { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
  no_show:    { bg: '#f3f4f6', text: '#6b7280', label: 'No Show' },
};

const useAppointments = (status = '') =>
  useQuery({
    queryKey: ['medical-appointments', status],
    queryFn: async () => {
      const p = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await apiClient.get(`/admin/medical/appointments${p}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
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

const useDeleteAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-appointments'] }),
  });
};

const EMPTY_FORM = { patientName: '', doctorName: '', appointmentType: '', scheduledAt: '', notes: '' };

const AppointmentsScreen = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useAppointments(statusFilter);
  const { mutateAsync: create, isPending: creating } = useCreateAppointment();
  const { mutateAsync: update, isPending: updating } = useUpdateAppointment();
  const { mutate: remove } = useDeleteAppointment();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      patientName: r.patientName ?? '',
      doctorName: r.doctorName ?? '',
      appointmentType: r.appointmentType ?? '',
      scheduledAt: r.scheduledAt ?? '',
      notes: r.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patientName.trim()) { Alert.alert('Error', 'Patient name is required'); return; }
    if (!form.scheduledAt) { Alert.alert('Error', 'Scheduled date/time is required'); return; }
    try {
      editing ? await update({ id: editing.id, ...form }) : await create(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleStatusChange = async (appt, newStatus) => {
    try { await update({ id: appt.id, status: newStatus }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
  };

  const handleDelete = r => Alert.alert('Delete', 'Delete this appointment?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const fmtDate = d => {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Appointments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterWrap}
        contentContainerStyle={styles.filterRow}
      >
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s ? (STATUS_STYLE[s]?.label ?? s) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No appointments found.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.scheduled;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName} numberOfLines={1}>{item.patientName ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              {item.doctorName && (
                <Text style={styles.doctor} numberOfLines={1}>Dr. {item.doctorName}</Text>
              )}
              <View style={styles.cardRow}>
                {item.appointmentType && <Text style={styles.apptType}>{item.appointmentType}</Text>}
                <Text style={styles.dateText}>{fmtDate(item.scheduledAt)}</Text>
              </View>
              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
              <View style={styles.btnRow}>
                {(item.status ?? '') === 'scheduled' && (
                  <TouchableOpacity style={styles.completeBtn} onPress={() => handleStatusChange(item, 'completed')}>
                    <Text style={styles.completeBtnText}>Complete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Appointment' : 'New Appointment'}</Text>

            <Text style={styles.fieldLabel}>Patient Name</Text>
            <TextInput style={styles.input} value={form.patientName} onChangeText={set('patientName')} placeholder="Patient name" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Doctor Name</Text>
            <TextInput style={styles.input} value={form.doctorName} onChangeText={set('doctorName')} placeholder="Doctor name" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Appointment Type</Text>
            <TextInput style={styles.input} value={form.appointmentType} onChangeText={set('appointmentType')} placeholder="e.g. General Checkup" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Scheduled At</Text>
            <TextInput style={styles.input} value={form.scheduledAt} onChangeText={set('scheduledAt')} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={set('notes')}
              placeholder="Additional notes"
              placeholderTextColor="#999"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1a1a1a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  filterChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  doctor: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary, marginBottom: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  apptType: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  dateText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  completeBtn: { flex: 1, backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  completeBtnText: { color: '#16a34a', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  editBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default AppointmentsScreen;
