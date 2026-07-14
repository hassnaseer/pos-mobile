import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useMyLeaveRequests, useApplyLeave, useMyLeaveUsage, flattenPages } from '../../../services/api/posApi';
import InlinePicker from '../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../components/Ui/DatePicker';
import colors from '../../../theme/colors';

const EMPTY_FORM = { quotaId: '', leaveType: '', startDate: '', endDate: '', reason: '' };
const STATUS_COLOR = { pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444', cancelled: '#9CA3AF' };
const STATUS_FILTERS = ['', 'Pending', 'Approved', 'Rejected'];

const daysBetween = (start, end) => {
  if (!start) return 1;
  const ms = new Date(end ?? start) - new Date(start);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

const MyLeaveScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const {
    data: pagesData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useMyLeaveRequests(statusFilter);
  const { data: rawUsage = [] } = useMyLeaveUsage();
  const { mutateAsync: apply, isPending: applying } = useApplyLeave();

  const items = flattenPages(pagesData);
  const statusCounts = pagesData?.pages?.[0]?.statusCounts ?? {};
  const myUsage = Array.isArray(rawUsage) ? rawUsage : (rawUsage?.data ?? []);
  const quotaOptions = myUsage.map(q => ({
    id: q.id,
    name: q.isFull ? `${q.title} — Full` : `${q.title} (${q.remainingDays} day${q.remainingDays !== 1 ? 's' : ''} left)`,
  }));
  const selectedQuota = myUsage.find(q => q.id === form.quotaId);

  const openApply = () => { setForm(EMPTY_FORM); setShowModal(true); };

  const handleApply = async () => {
    if (!form.quotaId) { Alert.alert('Error', 'Please select a leave type'); return; }
    if (!form.startDate.trim() || !form.endDate.trim()) { Alert.alert('Error', 'Start and end dates are required'); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { Alert.alert('Error', 'End date cannot be before start date'); return; }
    if (selectedQuota?.isFull) { Alert.alert('Error', `Your "${selectedQuota.title}" quota is full (${selectedQuota.totalDays}/${selectedQuota.totalDays} days used).`); return; }
    try {
      await apply({
        quotaId: form.quotaId,
        leaveType: selectedQuota?.title ?? form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      // e.g. "Employees on probation cannot apply for leave. Please contact your admin."
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to apply');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>My Leave</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={openApply}>
          <Text style={styles.applyBtnText}>+ Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: STATUS_COLOR.pending }]}>{statusCounts.Pending ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: STATUS_COLOR.approved }]}>{statusCounts.Approved ?? 0}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: STATUS_COLOR.rejected }]}>{statusCounts.Rejected ?? 0}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s || 'all'} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.quota?.title ?? item.leaveType ?? 'Leave'}</Text>
              <Text style={styles.rowSub}>{item.startDate} → {item.endDate ?? item.startDate} · {daysBetween(item.startDate, item.endDate)} day{daysBetween(item.startDate, item.endDate) !== 1 ? 's' : ''}</Text>
              {item.reason ? <Text style={styles.rowSub} numberOfLines={1}>{item.reason}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[(item.status ?? '').toLowerCase()] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[(item.status ?? '').toLowerCase()] ?? '#9CA3AF' }]}>{item.status ?? 'Pending'}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leave requests yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>

            {myUsage.length > 0 ? (
              <View style={styles.field}>
                <Text style={styles.label}>Leave Type *</Text>
                <InlinePicker options={quotaOptions} value={form.quotaId} onSelect={set('quotaId')} placeholder="Select leave type" allowNone={false} />
                {selectedQuota && !selectedQuota.isFull ? (
                  <Text style={styles.quotaHint}>{selectedQuota.usedDays}/{selectedQuota.totalDays} days used · {selectedQuota.remainingDays} remaining</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.noQuotaHint}>No leave quotas defined. Contact your HR admin.</Text>
            )}

            <View style={styles.dateRow}>
              <DatePicker
                label="Start Date *"
                value={form.startDate}
                onDateChange={set('startDate')}
                placeholder="Select start date"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <View style={{ width: 12 }} />
              <DatePicker
                label="End Date *"
                value={form.endDate}
                onDateChange={set('endDate')}
                placeholder="Select end date"
                minimumDate={form.startDate || undefined}
                style={{ flex: 1, marginBottom: 0 }}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Reason</Text>
              <TextInput style={[styles.input, { height: 70 }]} value={form.reason} onChangeText={set('reason')} placeholder="Brief reason for leave..." placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying}>
                {applying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:        { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  applyBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  applyBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  statsRow:       { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 10, paddingVertical: 12 },
  statBox:        { flex: 1, alignItems: 'center' },
  statVal:        { fontSize: 18, fontFamily: 'Outfit-Bold' },
  statLabel:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  filterRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  filterChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  filterChipTextActive: { color: '#fff' },
  row:            { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:        { flex: 1 },
  rowName:        { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:         { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:       { alignItems: 'flex-end', gap: 6 },
  badge:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  empty:          { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:     { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:          { marginBottom: 12 },
  label:          { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:          { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  quotaHint:      { fontSize: 11, fontFamily: 'Outfit-Medium', color: colors.primary, marginTop: 4 },
  noQuotaHint:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12 },
  dateRow:        { flexDirection: 'row' },
  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCancelText:{ fontFamily: 'Outfit-Medium', color: '#6B7280' },
  submitBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default MyLeaveScreen;
