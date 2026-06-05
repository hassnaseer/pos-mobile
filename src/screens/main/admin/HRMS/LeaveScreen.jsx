import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useDeleteLeaveRequest } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { employeeName: '', leaveType: 'Annual', startDate: '', endDate: '', reason: '' };
const STATUS_COLOR = { Pending: '#F59E0B', Approved: '#10B981', Rejected: '#EF4444', pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444' };
const STATUS_BG    = { Pending: '#FEF3C7', Approved: '#D1FAE5', Rejected: '#FEE2E2', pending: '#FEF3C7', approved: '#D1FAE5', rejected: '#FEE2E2' };
const FILTER_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected'];

const LeaveScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_LEAVE);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState('All');
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useLeaveRequests();
  const { mutateAsync: create, isPending: creating } = useCreateLeaveRequest();
  const { mutateAsync: update, isPending: updating } = useUpdateLeaveRequest();
  const { mutate: remove } = useDeleteLeaveRequest();

  const allItems = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const items = statusFilter === 'All'
    ? allItems
    : allItems.filter(i => (i.status ?? '').toLowerCase() === statusFilter.toLowerCase());
  const isSaving = creating || updating;

  const pendingCount  = allItems.filter(i => (i.status ?? '').toLowerCase() === 'pending').length;
  const approvedCount = allItems.filter(i => (i.status ?? '').toLowerCase() === 'approved').length;
  const rejectedCount = allItems.filter(i => (i.status ?? '').toLowerCase() === 'rejected').length;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({ employeeName: r.employeeName ?? '', leaveType: r.leaveType ?? 'Annual', startDate: r.startDate ?? '', endDate: r.endDate ?? '', reason: r.reason ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim()) { Alert.alert('Error', 'Employee name is required'); return; }
    if (!form.startDate.trim())    { Alert.alert('Error', 'Start date is required'); return; }
    try {
      editing ? await update({ id: editing.id, ...form }) : await create(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete Leave', `Delete this leave request?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const handleApprove = async r => {
    try { await update({ id: r.id, status: 'approved' }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Leave Requests</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats bar */}
      <View style={styles.statsRow}>
        {[
          { label: 'Pending',  count: pendingCount,  color: '#F59E0B', bg: '#FEF3C7' },
          { label: 'Approved', count: approvedCount, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Rejected', count: rejectedCount, color: '#EF4444', bg: '#FEE2E2' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
            <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.employeeName ?? item.employee?.name ?? '—'}</Text>
              <Text style={styles.rowSub}>{item.leaveType}  ·  {item.startDate} → {item.endDate}</Text>
              {item.reason ? <Text style={styles.rowSub} numberOfLines={1}>{item.reason}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                  {item.status ?? 'pending'}
                </Text>
              </View>
              {canManage && (
                <View style={styles.actions}>
                  {item.status === 'pending' && (
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                  )}
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
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leave requests.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Leave' : 'New Leave Request'}</Text>
            {[
              { key: 'employeeName', label: 'Employee Name *' },
              { key: 'leaveType',    label: 'Leave Type (Annual / Sick / Other)' },
              { key: 'startDate',    label: 'Start Date * (YYYY-MM-DD)' },
              { key: 'endDate',      label: 'End Date (YYYY-MM-DD)' },
              { key: 'reason',       label: 'Reason' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={set(f.key)} placeholder={f.label.replace(' *', '')} placeholderTextColor="#999" />
              </View>
            ))}
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
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:          { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 8 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', gap: 6 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:      { flexDirection: 'row', gap: 6 },
  approveBtn:   { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  approveText:  { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#059669' },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  statCard:     { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, borderLeftWidth: 3 },
  statCount:    { fontSize: 20, fontFamily: 'Outfit-Bold' },
  statLabel:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', flexGrow: 0, maxHeight: 48 },
  filterRow:    { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', marginTop: 8 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:   { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6B7280' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
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

export default LeaveScreen;
