import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useMedicalReminders, useCreateMedicalReminder,
  useUpdateMedicalReminder, useDeleteMedicalReminder,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUSES = ['pending', 'sent', 'cancelled'];
const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', text: '#b45309' },
  sent:      { bg: '#dcfce7', text: '#16a34a' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
};
const TYPES = ['appointment', 'follow-up', 'medication', 'general'];
const EMPTY = { patientName: '', type: 'appointment', reminderDate: '', notes: '', status: 'pending' };

const RemindersScreen = () => {
  const [filterStatus, setFilterStatus] = useState('');
  const { data: raw = [], isLoading, refetch } = useMedicalReminders('', filterStatus);
  const reminders = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateMedicalReminder();
  const { mutateAsync: update, isPending: updating } = useUpdateMedicalReminder();
  const { mutateAsync: remove } = useDeleteMedicalReminder();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, reminderDate: new Date().toISOString().slice(0, 10) }); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({ patientName: r.patientName ?? r.patient?.name ?? '', type: r.type ?? 'appointment', reminderDate: r.reminderDate?.slice(0, 10) ?? '', notes: r.notes ?? '', status: r.status ?? 'pending' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.reminderDate) { Alert.alert('Error', 'Date is required'); return; }
    try {
      if (editing) await update({ id: editing.id, ...form });
      else await create(form);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = r =>
    Alert.alert('Delete', 'Delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await remove(r.id); } catch { Alert.alert('Error', 'Delete failed'); } } },
    ]);

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...STATUSES].map(s => (
          <TouchableOpacity key={s || 'all'} style={[styles.chip, filterStatus === s && styles.chipActive]} onPress={() => setFilterStatus(s)}>
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={reminders}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No reminders.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
          return (
            <TouchableOpacity style={styles.row} onPress={() => openEdit(item)}>
              <View style={styles.dateBox}>
                <Text style={styles.dateText}>{item.reminderDate ? new Date(item.reminderDate).toLocaleDateString('en', { day: '2-digit', month: 'short' }) : '—'}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.patientName ?? item.patient?.name ?? 'Patient'}</Text>
                <Text style={styles.rowSub}>{item.type ?? 'general'}</Text>
                {item.notes ? <Text style={styles.rowSub} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.right}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{item.status}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
                  <Text style={styles.delText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Reminder' : 'New Reminder'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}><Text style={styles.label}>Patient Name</Text><TextInput style={styles.input} value={form.patientName} onChangeText={set('patientName')} placeholder="Patient name" placeholderTextColor="#999" /></View>
              <View style={styles.field}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.chips}>{TYPES.map(t => (<TouchableOpacity key={t} style={[styles.typeChip, form.type === t && styles.typeChipActive]} onPress={() => setForm(f => ({ ...f, type: t }))}><Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>{t}</Text></TouchableOpacity>))}</View>
              </View>
              <View style={styles.field}><Text style={styles.label}>Date *</Text><TextInput style={styles.input} value={form.reminderDate} onChangeText={set('reminderDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" /></View>
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.chips}>{STATUSES.map(s => (<TouchableOpacity key={s} style={[styles.typeChip, form.status === s && styles.typeChipActive]} onPress={() => setForm(f => ({ ...f, status: s }))}><Text style={[styles.typeText, form.status === s && styles.typeTextActive]}>{s}</Text></TouchableOpacity>))}</View>
              </View>
              <View style={styles.field}><Text style={styles.label}>Notes</Text><TextInput style={[styles.input, { height: 70 }]} value={form.notes} onChangeText={set('notes')} placeholder="Notes" placeholderTextColor="#999" multiline /></View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 4 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10 },
  dateBox: { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, textAlign: 'center' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  delBtn: { padding: 4 },
  delText: { fontSize: 12, color: '#dc2626' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  typeTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RemindersScreen;
