import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useMedicalAppointmentsInfinite, usePatientsList, useAppointmentTypes, flattenPages } from '../../../../services/api/posApi';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

// Status values must match the backend exactly (medical-appointment.entity.ts: Scheduled | Completed | Cancelled | No-Show).
const STATUSES = ['', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];
const STATUS_STYLE = {
  Scheduled:  { bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled' },
  Completed:  { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
  Cancelled:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
  'No-Show':  { bg: '#f3f4f6', text: '#6b7280', label: 'No Show' },
};

const useDoctorsList = () =>
  useQuery({
    queryKey: ['medical-doctors'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/medical/doctors');
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

const EMPTY_FORM = { patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', reason: '', notes: '' };

const AppointmentsScreen = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const {
    data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useMedicalAppointmentsInfinite(statusFilter ? { status: statusFilter } : {});
  const { data: patientsRaw = [] } = usePatientsList();
  const patients = Array.isArray(patientsRaw) ? patientsRaw : (patientsRaw?.data ?? []);
  const { data: doctorsRaw = [] } = useDoctorsList();
  const doctors = Array.isArray(doctorsRaw) ? doctorsRaw : (doctorsRaw?.data ?? []);
  const { data: typesRaw = [] } = useAppointmentTypes();
  const appointmentTypes = Array.isArray(typesRaw) ? typesRaw : (typesRaw?.data ?? []);
  const { mutateAsync: create, isPending: creating } = useCreateAppointment();
  const { mutateAsync: update, isPending: updating } = useUpdateAppointment();
  const { mutate: remove } = useDeleteAppointment();

  const items = flattenPages(data);
  const isSaving = creating || updating;
  const selectedPatient = patients.find(p => String(p.id) === String(form.patientId));
  const selectedDoctor = doctors.find(d => String(d.id) === String(form.doctorId));

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      patientId: r.patient?.id ? String(r.patient.id) : '',
      doctorId: r.doctor?.id ? String(r.doctor.id) : '',
      appointmentDate: r.appointmentDate ? String(r.appointmentDate).slice(0, 10) : '',
      appointmentTime: r.appointmentTime ?? '',
      reason: r.reason ?? '',
      notes: r.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patientId) { Alert.alert('Error', 'Please select a patient'); return; }
    if (!form.appointmentDate) { Alert.alert('Error', 'Appointment date is required'); return; }
    const payload = {
      patientId: form.patientId,
      doctorId: form.doctorId || undefined,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      reason: form.reason,
      notes: form.notes,
      ...(editing ? {} : { status: 'Scheduled' }),
    };
    try {
      editing ? await update({ id: editing.id, ...payload }) : await create(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Save failed'); }
  };

  const handleStatusChange = async (appt, newStatus) => {
    try { await update({ id: appt.id, status: newStatus }); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed'); }
  };

  const handleDelete = r => Alert.alert('Delete', 'Delete this appointment?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const fmtDate = (dateStr, timeStr) => {
    if (!dateStr) return '—';
    // Parse the plain 'YYYY-MM-DD' as a LOCAL date — new Date('YYYY-MM-DD') is UTC and
    // can render the previous day in timezones behind UTC.
    const localDate = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
    const datePart = localDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return timeStr ? `${datePart} · ${timeStr}` : datePart;
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Appointments</Text>
        <HeaderAddButton onPress={openAdd} label="New" />
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
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No appointments found.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.Scheduled;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName} numberOfLines={1}>{item.patient?.name ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              {item.doctor?.name && (
                <Text style={styles.doctor} numberOfLines={1}>Dr. {item.doctor.name}</Text>
              )}
              <View style={styles.cardRow}>
                {item.reason && <Text style={styles.apptType}>{item.reason}</Text>}
                <Text style={styles.dateText}>{fmtDate(item.appointmentDate, item.appointmentTime)}</Text>
              </View>
              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
              <View style={styles.btnRow}>
                {item.status === 'Scheduled' && (
                  <TouchableOpacity style={styles.completeBtn} onPress={() => handleStatusChange(item, 'Completed')}>
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
            <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Patient *</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => setShowPatientPicker(true)}>
              <Text style={[styles.pickerSelectorText, !selectedPatient && styles.pickerSelectorPlaceholder]}>
                {selectedPatient ? selectedPatient.name : 'Select patient'}
              </Text>
              <Text style={styles.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Doctor</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => setShowDoctorPicker(true)}>
              <Text style={[styles.pickerSelectorText, !selectedDoctor && styles.pickerSelectorPlaceholder]}>
                {selectedDoctor ? selectedDoctor.name : 'Select doctor (optional)'}
              </Text>
              <Text style={styles.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Appointment Type</Text>
            {appointmentTypes.length === 0 ? (
              <Text style={styles.noTypesText}>No appointment types configured</Text>
            ) : (
              <View style={styles.chips}>
                {appointmentTypes.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, form.reason === t.name && styles.chipActive]}
                    onPress={() => set('reason')(t.name)}
                  >
                    <Text style={[styles.chipText, form.reason === t.name && styles.chipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <DatePicker
                label="Appointment Date"
                value={form.appointmentDate}
                onDateChange={set('appointmentDate')}
                placeholder="Select date"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Time (24h)</Text>
                <TextInput style={styles.input} value={form.appointmentTime} onChangeText={set('appointmentTime')} placeholder="HH:MM" placeholderTextColor="#999" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={set('notes')}
              placeholder="Additional notes"
              placeholderTextColor="#999"
              multiline
            />
            </ScrollView>

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

      {/* Patient picker */}
      <Modal visible={showPatientPicker} animationType="slide" transparent onRequestClose={() => setShowPatientPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <FlatList
              data={patients}
              keyExtractor={p => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { set('patientId')(String(item.id)); setShowPatientPicker(false); }}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  {item.phone ? <Text style={styles.pickerItemSub}>{item.phone}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No patients found.</Text>}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPatientPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Doctor picker */}
      <Modal visible={showDoctorPicker} animationType="slide" transparent onRequestClose={() => setShowDoctorPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Select Doctor</Text>
            <FlatList
              data={doctors}
              keyExtractor={d => String(d.id)}
              ListHeaderComponent={(
                <TouchableOpacity style={styles.pickerItem} onPress={() => { set('doctorId')(''); setShowDoctorPicker(false); }}>
                  <Text style={styles.pickerItemName}>No doctor assigned</Text>
                </TouchableOpacity>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { set('doctorId')(String(item.id)); setShowDoctorPicker(false); }}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  {item.specialization ? <Text style={styles.pickerItemSub}>{item.specialization}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No doctors found.</Text>}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDoctorPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  pickerSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  pickerSelectorText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  pickerSelectorPlaceholder: { color: '#999' },
  pickerArrow: { fontSize: 18, color: '#999' },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerItemName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  pickerItemSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  noTypesText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#999', fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default AppointmentsScreen;
