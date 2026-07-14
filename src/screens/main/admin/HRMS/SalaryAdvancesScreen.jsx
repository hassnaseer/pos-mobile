import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import {
  useSalaryAdvances, useCreateSalaryAdvance, useUpdateSalaryAdvance, useDeleteSalaryAdvance, useStaffList,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { employeeId: '', amount: '', advanceDate: new Date().toISOString().slice(0, 10), repaymentMode: 'one_time', installmentAmount: '', notes: '' };
const REPAYMENT_OPTIONS = [
  { id: 'one_time', name: 'One-time (full amount from next payroll)' },
  { id: 'installments', name: 'Installments (fixed amount each payroll)' },
];
const STATUS_OPTIONS = [
  { id: 'Active', name: 'Active' },
  { id: 'Cleared', name: 'Cleared' },
];

const SalaryAdvancesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PAYROLL);
  const { fmt } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useSalaryAdvances();
  const { data: rawStaff = [] } = useStaffList();
  const { mutateAsync: create, isPending: creating } = useCreateSalaryAdvance();
  const { mutateAsync: update, isPending: updating } = useUpdateSalaryAdvance();
  const { mutate: remove } = useDeleteSalaryAdvance();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = a => {
    setEditing(a);
    setForm({
      employeeId: a.employee?.id ?? '',
      amount: String(a.amount ?? ''),
      advanceDate: a.advanceDate?.slice(0, 10) ?? EMPTY_FORM.advanceDate,
      repaymentMode: a.repaymentMode ?? 'one_time',
      installmentAmount: a.installmentAmount != null ? String(a.installmentAmount) : '',
      notes: a.notes ?? '',
      status: a.status ?? 'Active',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing && !form.employeeId) { Alert.alert('Error', 'Employee is required'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!editing && form.repaymentMode === 'installments' && (!form.installmentAmount || isNaN(parseFloat(form.installmentAmount)))) {
      Alert.alert('Error', 'Enter a valid installment amount'); return;
    }
    try {
      if (editing) {
        await update({
          id: editing.id,
          installmentAmount: form.installmentAmount ? parseFloat(form.installmentAmount) : undefined,
          status: form.status,
          notes: form.notes || undefined,
        });
      } else {
        await create({
          employeeId: form.employeeId,
          amount: parseFloat(form.amount),
          advanceDate: form.advanceDate,
          repaymentMode: form.repaymentMode,
          installmentAmount: form.repaymentMode === 'installments' ? parseFloat(form.installmentAmount) : undefined,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save salary advance');
    }
  };

  const handleDelete = a => Alert.alert('Delete Salary Advance', `Delete this advance for ${a.employee?.name ?? 'this employee'}? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(a.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Salary Advances</Text>
          <Text style={styles.subHeading}>Advances given to employees, deducted from payroll</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Advance</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const cleared = item.status === 'Cleared';
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.employee?.name ?? '—'}</Text>
                <Text style={styles.rowSub}>
                  Given {new Date(item.advanceDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                  {'  ·  '}{item.repaymentMode === 'one_time' ? 'One-time deduction' : `Installments of ${fmt(item.installmentAmount ?? 0)}`}
                </Text>
                {item.notes ? <Text style={styles.rowSub} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>{fmt(item.amount)} total</Text>
                <Text style={styles.pending}>{fmt(item.pendingBalance)} pending</Text>
                <View style={[styles.badge, { backgroundColor: cleared ? '#d1fae5' : '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: cleared ? '#065f46' : '#92400e' }]}>{item.status}</Text>
                </View>
                {canManage && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                      <Text style={styles.delText}>Del</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No salary advances recorded yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Advance' : 'Add Salary Advance'}</Text>

            {!editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Employee *</Text>
                <InlinePicker options={staffOptions} value={form.employeeId} onSelect={set('employeeId')} placeholder="Select employee" allowNone={false} />
              </View>
            )}
            {!editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
            )}
            {!editing && (
              <DatePicker
                label="Advance Date *"
                value={form.advanceDate}
                onDateChange={set('advanceDate')}
                placeholder="Select advance date"
              />
            )}
            {!editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Repayment Mode *</Text>
                <InlinePicker options={REPAYMENT_OPTIONS} value={form.repaymentMode} onSelect={set('repaymentMode')} placeholder="Select mode" allowNone={false} />
              </View>
            )}
            {(form.repaymentMode === 'installments' || editing?.repaymentMode === 'installments') && (
              <View style={styles.field}>
                <Text style={styles.label}>Installment Amount (per payroll run) *</Text>
                <TextInput style={styles.input} value={form.installmentAmount} onChangeText={set('installmentAmount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
            )}
            {editing && (
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <InlinePicker options={STATUS_OPTIONS} value={form.status} onSelect={set('status')} placeholder="Select status" allowNone={false} />
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Add Advance'}</Text>}
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
  rowRight:     { alignItems: 'flex-end', gap: 4 },
  amount:       { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  pending:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#b45309' },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
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

export default SalaryAdvancesScreen;
