import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import {
  useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useDeleteLeaveRequest,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const STATUSES = ['', 'pending', 'approved', 'rejected', 'cancelled'];
const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  approved:  { bg: '#dcfce7', text: '#16a34a', label: 'Approved' },
  rejected:  { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
};
const LEAVE_TYPES = ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid'];

const EMPTY_FORM = { employeeName: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' };

const LeaveScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_LEAVE);

  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useLeaveRequests({ status: statusFilter || undefined });
  const { mutateAsync: create, isPending: creating } = useCreateLeaveRequest();
  const { mutateAsync: update, isPending: updating } = useUpdateLeaveRequest();
  const { mutate: remove } = useDeleteLeaveRequest();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      employeeName: r.employeeName ?? '',
      leaveType: r.leaveType ?? 'annual',
      startDate: r.startDate ?? '',
      endDate: r.endDate ?? '',
      reason: r.reason ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim()) { Alert.alert('Error', 'Employee name is required'); return; }
    if (!form.startDate || !form.endDate) { Alert.alert('Error', 'Start and end dates are required'); return; }
    try {
      editing ? await update({ id: editing.id, ...form }) : await create(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleApprove = async r => {
    try { await update({ id: r.id, status: 'approved' }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
  };

  const handleReject = async r => {
    try { await update({ id: r.id, status: 'rejected' }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
  };

  const handleDelete = r => Alert.alert('Delete', 'Delete this leave request?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const fmtDate = d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Leave Requests</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
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
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leave requests.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.empName} numberOfLines={1}>{item.employeeName ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.leaveType}>{item.leaveType ?? '—'}</Text>
                <Text style={styles.dates}>{fmtDate(item.startDate)} – {fmtDate(item.endDate)}</Text>
              </View>
              {item.reason ? <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text> : null}
              {(item.status ?? '').toLowerCase() === 'pending' && canManage && (
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
              {canManage && (item.status ?? '').toLowerCase() !== 'pending' && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Leave Request' : 'New Leave Request'}</Text>

            <Text style={styles.fieldLabel}>Employee Name</Text>
            <TextInput style={styles.input} value={form.employeeName} onChangeText={set('employeeName')} placeholder="Employee name" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.leaveType === t && styles.typeChipActive]}
                  onPress={() => set('leaveType')(t)}
                >
                  <Text style={[styles.typeChipText, form.leaveType === t && { color: '#fff' }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TextInput style={styles.input} value={form.startDate} onChangeText={set('startDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <TextInput style={styles.input} value={form.endDate} onChangeText={set('endDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.reason}
              onChangeText={set('reason')}
              placeholder="Reason for leave"
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
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  filterChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  filterChipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  empName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  leaveType: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary, textTransform: 'capitalize' },
  dates: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  reason: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  approveBtnText: { color: '#16a34a', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  rejectBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rejectBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  editBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { color: '#374151', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  deleteBtn: { marginTop: 8, borderWidth: 1, borderColor: '#fee2e2', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontFamily: 'Outfit-Medium', fontSize: 12 },
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
  dateRow: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default LeaveScreen;
