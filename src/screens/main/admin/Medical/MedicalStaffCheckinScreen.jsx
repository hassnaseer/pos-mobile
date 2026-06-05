import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import {
  useMedicalStaffCheckins, useCreateMedicalCheckin,
  useUpdateMedicalCheckin, useDeleteMedicalCheckin, useStaffList,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const fmtTime = ts => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const EMPTY_FORM = { userId: '', date: '', clockIn: '', clockOut: '', notes: '' };

export default function MedicalStaffCheckinScreen() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [modal, setModal]   = useState(null); // null | 'add' | 'edit'
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const { data: checkins = [], isLoading } = useMedicalStaffCheckins(selectedDate);
  const { data: staffList = [] }           = useStaffList();
  const { mutateAsync: createCheckin, isPending: creating } = useCreateMedicalCheckin();
  const { mutateAsync: updateCheckin, isPending: updating } = useUpdateMedicalCheckin();
  const { mutateAsync: deleteCheckin, isPending: deleting } = useDeleteMedicalCheckin();

  const staffMap = useMemo(
    () => Object.fromEntries(staffList.map(s => [s.id, s.fullName ?? s.name ?? s.id])),
    [staffList],
  );

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: selectedDate });
    setEditId(null);
    setModal('add');
  };

  const openEdit = record => {
    setForm({
      userId:   record.user?.id ?? '',
      date:     record.date ?? selectedDate,
      clockIn:  record.clockIn ?? '',
      clockOut: record.clockOut ?? '',
      notes:    record.notes ?? '',
    });
    setEditId(record.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.userId || !form.date || !form.clockIn) {
      Alert.alert('Validation', 'Staff member, date and clock-in time are required.');
      return;
    }
    try {
      if (modal === 'add') {
        await createCheckin(form);
      } else {
        await updateCheckin({ id: editId, clockIn: form.clockIn, clockOut: form.clockOut, notes: form.notes });
      }
      setModal(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    }
  };

  const handleDelete = record => {
    Alert.alert(
      'Delete Record',
      `Remove check-in for ${staffMap[record.user?.id] ?? 'this staff member'} on ${fmtDate(record.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteCheckin(record.id); }
            catch (e) { Alert.alert('Error', e?.message ?? 'Failed to delete'); }
          },
        },
      ],
    );
  };

  // Simple date navigation
  const changeDate = offset => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <View style={styles.container}>
      {/* Date nav */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)} activeOpacity={0.7}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          <Text style={styles.dateLabel}>{fmtDate(selectedDate)}</Text>
          {selectedDate === todayStr && (
            <View style={styles.todayBadge}><Text style={styles.todayText}>Today</Text></View>
          )}
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)} activeOpacity={0.7}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Records list */}
      <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : checkins.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No check-in records for this date</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.8}>
              <Text style={styles.emptyAddText}>Add Record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          checkins.map(record => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.staffName}>
                  {record.user ? staffMap[record.user.id] ?? record.user.name ?? 'Unknown' : 'Unknown'}
                </Text>
                {record.isLeave && (
                  <View style={styles.leaveBadge}><Text style={styles.leaveText}>On Leave</Text></View>
                )}
              </View>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Clock In</Text>
                  <Text style={styles.timeItemValue}>{fmtTime(record.clockIn)}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Clock Out</Text>
                  <Text style={styles.timeItemValue}>{fmtTime(record.clockOut)}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={styles.timeItemLabel}>Hours</Text>
                  <Text style={styles.timeItemValue}>
                    {record.hoursWorked != null ? `${record.hoursWorked}h` : '—'}
                  </Text>
                </View>
              </View>
              {record.notes ? (
                <Text style={styles.notes}>{record.notes}</Text>
              ) : null}
              <View style={styles.recordActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(record)} activeOpacity={0.7}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(record)}
                  disabled={deleting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal === 'add' ? 'Add Check-in Record' : 'Edit Check-in Record'}</Text>

            {modal === 'add' && (
              <View style={styles.field}>
                <Text style={styles.label}>Staff Member *</Text>
                <ScrollView style={styles.staffPicker} nestedScrollEnabled>
                  {staffList.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.staffOption, form.userId === s.id && styles.staffOptionSelected]}
                      onPress={() => setForm(f => ({ ...f, userId: s.id }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.staffOptionText, form.userId === s.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>
                        {s.fullName ?? s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Clock In Time * (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={form.clockIn}
                onChangeText={v => setForm(f => ({ ...f, clockIn: v }))}
                placeholder="e.g. 09:00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Clock Out Time</Text>
              <TextInput
                style={styles.input}
                value={form.clockOut}
                onChangeText={v => setForm(f => ({ ...f, clockOut: v }))}
                placeholder="e.g. 17:00 (leave blank if still in)"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Optional notes…"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={creating || updating}
                activeOpacity={0.8}
              >
                {(creating || updating)
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  dateBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dateArrow: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  dateArrowText: { fontSize: 22, color: '#374151', lineHeight: 26 },
  dateLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dateLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  todayBadge: { backgroundColor: colors.primary + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  todayText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  list: { flex: 1 },
  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 16 },
  emptyAddBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  emptyAddText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  recordCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  staffName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  leaveBadge: { backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  leaveText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#92400e' },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  timeItem: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, alignItems: 'center' },
  timeItemLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 2 },
  timeItemValue: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827' },
  notes: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 8, fontStyle: 'italic' },
  recordActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn: { flex: 1, borderRadius: 6, paddingVertical: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  editBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  deleteBtn: { flex: 1, borderRadius: 6, paddingVertical: 8, backgroundColor: '#fee2e2', alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  staffPicker: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, maxHeight: 160, backgroundColor: '#fff' },
  staffOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  staffOptionSelected: { backgroundColor: colors.primary + '10' },
  staffOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#374151' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
