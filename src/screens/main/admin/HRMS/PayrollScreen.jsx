import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  usePayrollRuns, useRunPayroll, useDeletePayrollRun,
  usePayrollSlips, useStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// ─── Slips modal ──────────────────────────────────────────────────────────────
const SlipsModal = ({ runId, runLabel, onClose, fmt }) => {
  const { data: rawSlips = [], isLoading } = usePayrollSlips(runId);
  const slips = Array.isArray(rawSlips) ? rawSlips : (rawSlips?.data ?? []);
  return (
    <Modal visible={!!runId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payroll Slips — {runLabel}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : slips.length === 0 ? (
            <Text style={styles.empty}>No slips found.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {slips.map(s => (
                <View key={s.id} style={styles.slipRow}>
                  <View style={styles.slipInfo}>
                    <Text style={styles.slipName}>{s.employee?.name ?? s.employeeName ?? '—'}</Text>
                    <Text style={styles.slipSub}>
                      Base: {fmt(s.baseSalary ?? 0)}  ·  Claims: {fmt(s.claimsTotal ?? 0)}
                    </Text>
                  </View>
                  <Text style={styles.slipNet}>{fmt(s.netSalary ?? 0)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Run Payroll modal ───────────────────────────────────────────────────────
const RunPayrollModal = ({ visible, onClose }) => {
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: runPayroll, isPending } = useRunPayroll();
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year:  String(CURRENT_YEAR),
    employeeId: '',
  });
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleRun = async () => {
    try {
      await runPayroll({
        month:      Number(form.month),
        year:       Number(form.year),
        employeeId: form.employeeId || undefined,
      });
      Alert.alert('Success', 'Payroll processed successfully');
      onClose();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to run payroll');
    }
  };

  const MonthPicker = () => {
    const [open, setOpen] = useState(false);
    const label = MONTHS[Number(form.month) - 1];
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Month</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={styles.selectText}>{label}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              <ScrollView>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity key={i} style={styles.pickerOption} onPress={() => { set('month')(String(i + 1)); setOpen(false); }}>
                    <Text style={[styles.pickerText, form.month === String(i + 1) && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const YearPicker = () => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Year</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={styles.selectText}>{form.year}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              {YEARS.map(y => (
                <TouchableOpacity key={y} style={styles.pickerOption} onPress={() => { set('year')(String(y)); setOpen(false); }}>
                  <Text style={[styles.pickerText, form.year === String(y) && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const StaffPicker = () => {
    const [open, setOpen] = useState(false);
    const selected = staffList.find(s => s.id === form.employeeId);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Employee (optional — leave blank for all)</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={[styles.selectText, !selected && { color: '#999' }]}>{selected?.name ?? selected?.fullName ?? 'All Employees'}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              <ScrollView>
                <TouchableOpacity style={styles.pickerOption} onPress={() => { set('employeeId')(''); setOpen(false); }}>
                  <Text style={styles.pickerText}>All Employees</Text>
                </TouchableOpacity>
                {staffList.map(s => (
                  <TouchableOpacity key={s.id} style={styles.pickerOption} onPress={() => { set('employeeId')(s.id); setOpen(false); }}>
                    <Text style={[styles.pickerText, form.employeeId === s.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{s.name ?? s.fullName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Run Payroll</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.runDesc}>Calculate net pay based on base salary and approved claims for the selected period.</Text>
          <MonthPicker />
          <YearPicker />
          <StaffPicker />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleRun} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Run Payroll</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const PayrollScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PAYROLL);
  const { fmt } = useCurrency();

  const [runOpen, setRunOpen] = useState(false);
  const [slipsRunId, setSlipsRunId] = useState(null);
  const [slipsRunLabel, setSlipsRunLabel] = useState('');

  const { data: rawRuns = [], isLoading, refetch } = usePayrollRuns();
  const { mutate: deleteRun, isPending: deleting } = useDeletePayrollRun();

  const runs = Array.isArray(rawRuns) ? rawRuns : (rawRuns?.data ?? []);

  const handleDelete = run => Alert.alert('Delete Payroll Run', `Delete ${MONTHS[run.month - 1]} ${run.year} payroll run?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteRun(run.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Payroll</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setRunOpen(true)}>
            <Text style={styles.addBtnText}>▶ Run Payroll</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={runs}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>$</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{MONTHS[(item.month ?? 1) - 1]} {item.year}</Text>
              <Text style={styles.rowSub}>
                {item.processedBy?.name ? `By ${item.processedBy.name}` : ''}
                {item.createdAt ? `  ·  ${new Date(item.createdAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.badgeText, { color: '#059669' }]}>{item.status ?? 'processed'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.slipsBtn}
                onPress={() => { setSlipsRunId(item.id); setSlipsRunLabel(`${MONTHS[(item.month ?? 1) - 1]} ${item.year}`); }}
              >
                <Text style={styles.slipsBtnText}>Slips</Text>
              </TouchableOpacity>
              {canManage && (
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)} disabled={deleting}>
                  <Text style={styles.delText}>Del</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>$</Text>
            <Text style={styles.empty}>No payroll runs yet.{canManage ? '\nTap "Run Payroll" to process your first payroll.' : ''}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <RunPayrollModal visible={runOpen} onClose={() => setRunOpen(false)} />
      <SlipsModal runId={slipsRunId} runLabel={slipsRunLabel} onClose={() => { setSlipsRunId(null); setSlipsRunLabel(''); }} fmt={fmt} />
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:     { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:      { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row:         { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:    { width: 38, height: 38, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText:    { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#059669' },
  rowInfo:     { flex: 1 },
  rowName:     { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:      { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:   { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:     { flexDirection: 'row', gap: 6 },
  slipsBtn:    { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  slipsBtnText:{ fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:      { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText:     { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  emptyWrap:   { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyIcon:   { fontSize: 40, color: '#E5E7EB', marginBottom: 12 },
  empty:       { textAlign: 'center', color: '#9CA3AF', fontFamily: 'Outfit-Regular', fontSize: 14, lineHeight: 22 },
  // Modal
  modalBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeX:      { fontSize: 18, color: '#6B7280', padding: 4 },
  modalTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111' },
  runDesc:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 16 },
  field:       { marginBottom: 14 },
  fieldLabel:  { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  selectBtn:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  selectText:  { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chevron:     { fontSize: 12, color: '#6B7280' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 300, padding: 8 },
  pickerOption:{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerText:  { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:     { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:    { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  // Slips
  slipRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', gap: 10 },
  slipInfo:    { flex: 1 },
  slipName:    { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  slipSub:     { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  slipNet:     { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#059669' },
});

export default PayrollScreen;
