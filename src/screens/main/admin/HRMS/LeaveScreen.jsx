import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import {
  useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest,
  useStaffList, useLeaveQuotas, useCreateLeaveQuota, useCreateStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import QuickCreateModal from '../../../../components/QuickCreateModal/QuickCreateModal';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const STATUSES = ['', 'pending', 'approved', 'rejected'];
const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  approved:  { bg: '#dcfce7', text: '#16a34a', label: 'Approved' },
  rejected:  { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' },
};

const DURATION_OPTIONS = [
  { id: 'full_day', name: 'Full Day(s)' },
  { id: 'half_day', name: 'Half Day' },
  { id: 'custom_hours', name: 'Custom Hours' },
];

// Trusts the server's computed daysConsumed/hours instead of recomputing — the server is the
// only place that knows the employee's shift length (Half Day / Custom Hours are measured
// against each employee's own shift, not a fixed 8h).
const formatLeaveDuration = item => {
  if (item.durationType === 'half_day') return `Half Day${item.hours != null ? ` (${item.hours}h)` : ''}`;
  if (item.durationType === 'custom_hours') return `${item.hours ?? '?'}h`;
  const d = item.daysConsumed ?? Math.max(1, Math.round((new Date(item.endDate) - new Date(item.startDate)) / 86400000) + 1);
  return `${d} day${d === 1 ? '' : 's'}`;
};

const EMPTY_FORM = { staffId: '', quotaId: '', leaveType: '', startDate: '', endDate: '', reason: '', durationType: 'full_day', hours: '' };

const LeaveScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_LEAVE);

  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [staffQuickCreateOpen, setStaffQuickCreateOpen] = useState(false);
  const [quotaQuickCreateOpen, setQuotaQuickCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useLeaveRequests({ status: statusFilter || undefined });
  const { data: rawStaff = [] }   = useStaffList();
  const { data: rawQuotas = [] }  = useLeaveQuotas();
  const { mutateAsync: create, isPending: creating }   = useCreateLeaveRequest();
  const { mutateAsync: approve, isPending: approving } = useApproveLeaveRequest();
  const { mutateAsync: reject, isPending: rejecting }  = useRejectLeaveRequest();
  const { mutateAsync: createStaff }  = useCreateStaff();
  const { mutateAsync: createQuota }  = useCreateLeaveQuota();

  const items       = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const staffList   = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const quotas      = Array.isArray(rawQuotas) ? rawQuotas : (rawQuotas?.data ?? []);
  const quotaOptions = quotas.map(q => ({ id: q.id, name: q.title }));
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));

  const openAdd = () => { setForm(EMPTY_FORM); setShowModal(true); };
  const isPartialDay = form.durationType !== 'full_day';

  const handleSave = async () => {
    if (!form.staffId) { Alert.alert('Error', 'Staff member is required'); return; }
    if (!form.quotaId) { Alert.alert('Error', 'Leave type is required'); return; }
    if (!form.startDate) { Alert.alert('Error', 'Date is required'); return; }
    if (!isPartialDay) {
      if (!form.endDate) { Alert.alert('Error', 'Start and end dates are required'); return; }
      if (new Date(form.endDate) < new Date(form.startDate)) { Alert.alert('Error', 'End date cannot be before start date'); return; }
    }
    if (form.durationType === 'custom_hours' && (!form.hours || Number(form.hours) <= 0)) {
      Alert.alert('Error', 'Enter how many hours'); return;
    }
    const quota = quotas.find(q => q.id === form.quotaId);
    try {
      await create({
        staffId: form.staffId,
        quotaId: form.quotaId,
        leaveType: quota?.title ?? form.leaveType,
        startDate: form.startDate,
        endDate: isPartialDay ? form.startDate : form.endDate,
        reason: form.reason || undefined,
        durationType: form.durationType,
        ...(form.durationType === 'custom_hours' ? { hours: Number(form.hours) } : {}),
      });
      setShowModal(false);
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Save failed'); }
  };

  const openReview = r => { setReviewTarget(r); setAdminNotes(''); };
  const closeReview = () => { setReviewTarget(null); setAdminNotes(''); };

  const handleApprove = async () => {
    try { await approve({ id: reviewTarget.id, adminNotes }); closeReview(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to approve leave'); }
  };

  const handleReject = async () => {
    try { await reject({ id: reviewTarget.id, adminNotes }); closeReview(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to reject leave'); }
  };

  const handleAddStaff = async values => {
    const created = await createStaff({ fullName: values.fullName, email: values.email, phoneNumber: values.phoneNumber, password: values.password });
    const staff = created?.data ?? created;
    setForm(p => ({ ...p, staffId: staff?.id ?? '' }));
    return staff;
  };

  const handleAddQuota = async values => {
    const created = await createQuota({ title: values.title, totalDays: values.totalDays });
    const quota = created?.data ?? created;
    setForm(p => ({ ...p, quotaId: quota?.id ?? '' }));
    return quota;
  };

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
                <Text style={styles.empName} numberOfLines={1}>{item.user?.name ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.leaveType}>{item.quota?.title ?? item.leaveType ?? '—'}</Text>
                <Text style={styles.dates}>
                  {item.durationType && item.durationType !== 'full_day' ? fmtDate(item.startDate) : `${fmtDate(item.startDate)} – ${fmtDate(item.endDate)}`}
                  {'  ·  '}{formatLeaveDuration(item)}
                </Text>
              </View>
              {item.reason ? <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text> : null}
              {(item.status ?? '').toLowerCase() === 'pending' && canManage && (
                <TouchableOpacity style={styles.reviewBtn} onPress={() => openReview(item)}>
                  <Text style={styles.reviewBtnText}>Review</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Leave for Staff</Text>

            <InlinePicker
              label="Staff Member"
              value={form.staffId}
              options={staffOptions}
              onSelect={set('staffId')}
              allowNone={false}
              onAddNew={() => setStaffQuickCreateOpen(true)}
            />

            <InlinePicker
              label="Leave Type"
              value={form.quotaId}
              options={quotaOptions}
              onSelect={set('quotaId')}
              allowNone={false}
              onAddNew={() => setQuotaQuickCreateOpen(true)}
            />

            <InlinePicker
              label="Duration"
              value={form.durationType}
              options={DURATION_OPTIONS}
              onSelect={v => setForm(p => ({ ...p, durationType: v, endDate: v === 'full_day' ? p.endDate : '', hours: v === 'custom_hours' ? p.hours : '' }))}
              allowNone={false}
            />

            <View style={styles.dateRow}>
              <DatePicker
                label={isPartialDay ? 'Date' : 'Start Date'}
                value={form.startDate}
                onDateChange={set('startDate')}
                placeholder="Select date"
                style={{ flex: 1, marginBottom: 0 }}
              />
              {!isPartialDay && (
                <>
                  <View style={{ width: 12 }} />
                  <DatePicker
                    label="End Date"
                    value={form.endDate}
                    onDateChange={set('endDate')}
                    placeholder="Select end date"
                    minimumDate={form.startDate || undefined}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                </>
              )}
            </View>

            {form.durationType === 'custom_hours' && (
              <>
                <Text style={styles.fieldLabel}>Hours</Text>
                <TextInput
                  style={styles.input}
                  value={form.hours}
                  onChangeText={set('hours')}
                  placeholder="e.g. 3"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </>
            )}

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
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <QuickCreateModal
        visible={staffQuickCreateOpen}
        title="Add New Staff Member"
        fields={[
          { key: 'fullName', label: 'Full Name *', placeholder: 'Jane Smith' },
          { key: 'email', label: 'Email *', placeholder: 'jane@example.com' },
          { key: 'phoneNumber', label: 'Phone', type: 'phone', required: false },
          { key: 'password', label: 'Password *', placeholder: 'Min 6 characters' },
        ]}
        onClose={() => setStaffQuickCreateOpen(false)}
        onCreate={handleAddStaff}
      />

      <QuickCreateModal
        visible={quotaQuickCreateOpen}
        title="Add New Leave Type"
        fields={[
          { key: 'title', label: 'Leave Type Name *', placeholder: 'e.g. Annual' },
          { key: 'totalDays', label: 'Total Days *', placeholder: 'e.g. 14', keyboardType: 'numeric' },
        ]}
        onClose={() => setQuotaQuickCreateOpen(false)}
        onCreate={handleAddQuota}
      />

      <Modal visible={!!reviewTarget} animationType="fade" transparent onRequestClose={closeReview}>
        <View style={styles.overlay}>
          <View style={styles.reviewCard}>
            <Text style={styles.modalTitle}>Review Leave Request</Text>
            {reviewTarget && (
              <>
                <View style={styles.reviewInfoBox}>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Employee Name</Text><Text style={styles.reviewInfoValue}>{reviewTarget.user?.name ?? '—'}</Text></View>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Department</Text><Text style={styles.reviewInfoValue}>{reviewTarget.user?.department ?? '—'}</Text></View>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Employee ID</Text><Text style={styles.reviewInfoValue}>{reviewTarget.user?.employeeId ?? '—'}</Text></View>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Type</Text><Text style={styles.reviewInfoValue}>{reviewTarget.quota?.title ?? reviewTarget.leaveType ?? '—'}</Text></View>
                  <View style={styles.reviewInfoRow}>
                    <Text style={styles.reviewInfoLabel}>Dates</Text>
                    <Text style={styles.reviewInfoValue}>{fmtDate(reviewTarget.startDate)} → {fmtDate(reviewTarget.endDate)}</Text>
                  </View>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Duration</Text><Text style={styles.reviewInfoValueBold}>{formatLeaveDuration(reviewTarget)}</Text></View>
                  {reviewTarget.reason ? (
                    <View style={styles.reviewReasonBox}>
                      <Text style={styles.reviewInfoLabel}>Reason</Text>
                      <Text style={styles.reviewReasonText}>{reviewTarget.reason}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Add a note for the staff member…"
                  placeholderTextColor="#999"
                  multiline
                />

                <View style={styles.reviewActions}>
                  <TouchableOpacity style={styles.reviewCancelBtn} onPress={closeReview}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reviewRejectBtn} onPress={handleReject} disabled={rejecting || approving}>
                    {rejecting ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reviewApproveBtn} onPress={handleApprove} disabled={approving || rejecting}>
                    {approving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Approve</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  reviewBtn: { backgroundColor: colors.primary + '15', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 10 },
  reviewBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  rejectBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, margin: 20, padding: 20 },
  reviewInfoBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, gap: 8, marginBottom: 14 },
  reviewInfoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewInfoLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  reviewInfoValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111' },
  reviewInfoValueBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111' },
  reviewReasonBox: { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  reviewReasonText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#374151', marginTop: 2 },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  reviewCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  reviewRejectBtn: { flex: 1, borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  reviewApproveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  dateRow: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default LeaveScreen;
