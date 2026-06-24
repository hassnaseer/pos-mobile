import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import {
  useMedicalReminders, useCreateMedicalReminder, useUpdateMedicalReminder, useDeleteMedicalReminder,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUSES = ['', 'pending', 'sent', 'acknowledged', 'cancelled'];
const STATUS_STYLE = {
  pending:      { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  sent:         { bg: '#dbeafe', text: '#1d4ed8', label: 'Sent' },
  acknowledged: { bg: '#dcfce7', text: '#16a34a', label: 'Acknowledged' },
  cancelled:    { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
};
const TYPES = ['appointment', 'medication', 'followup', 'checkup'];

const EMPTY_FORM = { patientName: '', type: 'appointment', scheduledAt: '', message: '' };

const RemindersScreen = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useMedicalReminders('', statusFilter);
  const { mutateAsync: create, isPending: creating } = useCreateMedicalReminder();
  const { mutateAsync: update, isPending: updating } = useUpdateMedicalReminder();
  const { mutate: remove } = useDeleteMedicalReminder();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      patientName: r.patientName ?? '',
      type: r.type ?? 'appointment',
      scheduledAt: r.scheduledAt ?? '',
      message: r.message ?? '',
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

  const handleDelete = r => Alert.alert('Delete', 'Delete this reminder?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const fmtDate = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Reminders</Text>
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
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
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
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No reminders found.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName} numberOfLines={1}>{item.patientName ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.typeText}>{item.type ?? '—'}</Text>
                <Text style={styles.dateText}>{fmtDate(item.scheduledAt)}</Text>
              </View>
              {item.message ? <Text style={styles.message} numberOfLines={2}>{item.message}</Text> : null}
              <View style={styles.btnRow}>
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
            <Text style={styles.modalTitle}>{editing ? 'Edit Reminder' : 'New Reminder'}</Text>

            <Text style={styles.fieldLabel}>Patient Name</Text>
            <TextInput style={styles.input} value={form.patientName} onChangeText={set('patientName')} placeholder="Patient name" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => set('type')(t)}
                >
                  <Text style={[styles.typeChipText, form.type === t && { color: '#fff' }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Scheduled At</Text>
            <TextInput style={styles.input} value={form.scheduledAt} onChangeText={set('scheduledAt')} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.message}
              onChangeText={set('message')}
              placeholder="Reminder message"
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
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  typeText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary, textTransform: 'capitalize' },
  dateText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  message: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
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
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f4f6f9' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RemindersScreen;
