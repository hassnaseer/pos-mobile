import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import {
  useFines, useCreateFine, useUpdateFine, useDeleteFine, useStaffList,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  Applied:  { bg: '#d1fae5', text: '#065f46' },
  Pending:  { bg: '#fef3c7', text: '#92400e' },
  Recorded: { bg: '#f3f4f6', text: '#6b7280' },
};

const EMPTY_FORM = { employeeId: '', amount: '', fineDate: new Date().toISOString().slice(0, 10), reason: '', deductionMethod: 'salary' };
const DEDUCTION_OPTIONS = [
  { id: 'salary', name: 'From Salary (next payroll run)' },
  { id: 'manual', name: 'By Hand (already collected)' },
];

const FinesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PAYROLL);
  const { fmt } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useFines();
  const { data: rawStaff = [] } = useStaffList();
  const { mutateAsync: create, isPending: creating } = useCreateFine();
  const { mutateAsync: update, isPending: updating } = useUpdateFine();
  const { mutate: remove } = useDeleteFine();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = f => {
    setEditing(f);
    setForm({ employeeId: f.employee?.id ?? '', amount: String(f.amount ?? ''), fineDate: f.fineDate?.slice(0, 10) ?? EMPTY_FORM.fineDate, reason: f.reason ?? '', deductionMethod: f.deductionMethod ?? 'salary' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing && !form.employeeId) { Alert.alert('Error', 'Employee is required'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!form.reason.trim()) { Alert.alert('Error', 'Reason is required'); return; }
    try {
      if (editing) {
        await update({ id: editing.id, amount: parseFloat(form.amount), reason: form.reason.trim() });
      } else {
        await create({
          employeeId: form.employeeId,
          amount: parseFloat(form.amount),
          fineDate: form.fineDate,
          reason: form.reason.trim(),
          deductionMethod: form.deductionMethod,
        });
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save fine');
    }
  };

  const handleDelete = f => Alert.alert('Delete Fine', `Delete this fine for ${f.employee?.name ?? 'this employee'}? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(f.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Fines</Text>
          <Text style={styles.subHeading}>Deducted from next payroll run, or recorded if already collected</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Apply Fine</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const badge = STATUS_STYLE[item.status] ?? STATUS_STYLE.Recorded;
          const locked = item.status === 'Applied';
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.employee?.name ?? '—'}</Text>
                <Text style={styles.rowSub}>
                  {new Date(item.fineDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                  {'  ·  '}{item.deductionMethod === 'salary' ? 'Deducted from salary' : 'Collected by hand'}
                </Text>
                {item.reason ? <Text style={styles.rowSub} numberOfLines={1}>{item.reason}</Text> : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>{fmt(item.amount)}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
                {canManage && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.editBtn, locked && styles.disabledBtn]} onPress={() => !locked && openEdit(item)} disabled={locked}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.delBtn, locked && styles.disabledBtn]} onPress={() => !locked && handleDelete(item)} disabled={locked}>
                      <Text style={styles.delText}>Del</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No fines recorded yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Fine' : 'Apply Fine'}</Text>

            {!editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Employee *</Text>
                <InlinePicker options={staffOptions} value={form.employeeId} onSelect={set('employeeId')} placeholder="Select employee" allowNone={false} />
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
            </View>
            {!editing && (
              <DatePicker
                label="Fine Date *"
                value={form.fineDate}
                onDateChange={set('fineDate')}
                placeholder="Select fine date"
              />
            )}
            <View style={styles.field}>
              <Text style={styles.label}>Reason *</Text>
              <TextInput style={styles.input} value={form.reason} onChangeText={set('reason')} placeholder="Why is this fine being issued?" placeholderTextColor="#999" multiline />
            </View>
            {!editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Deduct This Fine *</Text>
                <InlinePicker options={DEDUCTION_OPTIONS} value={form.deductionMethod} onSelect={set('deductionMethod')} placeholder="Select method" allowNone={false} />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Apply Fine'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading:   { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row:          { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 8 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', gap: 6 },
  amount:       { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:      { flexDirection: 'row', gap: 6 },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  disabledBtn:  { opacity: 0.4 },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default FinesScreen;
