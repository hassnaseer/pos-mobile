import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient, useIsFetching } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useStaffList } from '../../../../services/api/posApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const fmtTime = dateStr => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = dateStr => {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Company-wide attendance management (admin only) ─────────────────────────
const useStaffAttendanceRange = (from, to) =>
  useQuery({
    queryKey: ['staff-attendance', from, to],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/attendance/staff?from=${from}&to=${to}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

const useManualAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/attendance/manual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-attendance'] }),
    meta: { successMessage: 'Attendance record added' },
  });
};

const useUpdateAttendanceRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/attendance/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-attendance'] }),
    meta: { successMessage: 'Attendance record updated' },
  });
};

const useDeleteAttendanceRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/attendance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-attendance'] }),
    meta: { successMessage: 'Attendance record deleted' },
  });
};

const EMPTY_MANUAL_FORM = { userId: '', date: todayStr(), clockIn: '', clockOut: '', notes: '', status: '' };
const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent', 'Unpaid Leave', 'Paid Leave', 'Sick Leave', 'Half Day', 'Short Leave']
  .map(s => ({ id: s, name: s }));

function CompanyAttendanceSection() {
  // Defaults to today–today so existing single-day behavior doesn't change until the
  // admin widens the range — mirrors the web Attendance page's date-range navigator.
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MANUAL_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: rawRecords = [], isLoading } = useStaffAttendanceRange(startDate, endDate);
  const { data: rawStaff = [] } = useStaffList();
  const { mutateAsync: manualCreate, isPending: creating } = useManualAttendance();
  const { mutateAsync: updateRecord, isPending: updating } = useUpdateAttendanceRecord();
  const { mutate: deleteRecord } = useDeleteAttendanceRecord();

  const records = Array.isArray(rawRecords) ? rawRecords : (rawRecords?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));
  const isToday = startDate === todayStr() && endDate === todayStr();

  // Shifts the whole range by its own width, so a 7-day range moves a week at a time.
  const shiftRange = direction => {
    const rangeDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    const shiftBy = direction * rangeDays;
    const newStart = new Date(startDate); newStart.setDate(newStart.getDate() + shiftBy);
    const newEnd = new Date(endDate); newEnd.setDate(newEnd.getDate() + shiftBy);
    setStartDate(newStart.toISOString().slice(0, 10));
    setEndDate(newEnd.toISOString().slice(0, 10));
  };
  const resetToToday = () => { setStartDate(todayStr()); setEndDate(todayStr()); };

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_MANUAL_FORM, date: endDate }); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      userId: r.user?.id ?? '',
      date: r.date ? String(r.date).slice(0, 10) : endDate,
      clockIn: r.clockIn ? new Date(r.clockIn).toISOString().slice(11, 16) : '',
      clockOut: r.clockOut ? new Date(r.clockOut).toISOString().slice(11, 16) : '',
      notes: r.notes ?? '',
      status: r.status ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing && !form.userId) { Alert.alert('Error', 'Staff member is required'); return; }
    if (!form.clockIn) { Alert.alert('Error', 'Clock-in time is required'); return; }
    try {
      if (editing) {
        await updateRecord({
          id: editing.id,
          clockIn: `${form.date}T${form.clockIn}:00`,
          clockOut: form.clockOut ? `${form.date}T${form.clockOut}:00` : undefined,
          notes: form.notes || undefined,
          status: form.status || undefined,
        });
      } else {
        await manualCreate({
          userId: form.userId,
          date: form.date,
          clockIn: `${form.date}T${form.clockIn}:00`,
          clockOut: form.clockOut ? `${form.date}T${form.clockOut}:00` : undefined,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false);
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete Record', 'Delete this attendance record?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(r.id) },
  ]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Company Attendance</Text>
        <TouchableOpacity style={styles.manualBtn} onPress={openAdd}>
          <Text style={styles.manualBtnText}>+ Manual Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rangeRow}>
        <TouchableOpacity style={styles.rangeChevron} onPress={() => shiftRange(-1)}>
          <Text style={styles.rangeChevronText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
          <DatePicker value={startDate} onDateChange={setStartDate} placeholder="Start" style={{ flex: 1, marginBottom: 0 }} />
          <DatePicker value={endDate} onDateChange={setEndDate} placeholder="End" style={{ flex: 1, marginBottom: 0 }} />
        </View>
        <TouchableOpacity style={styles.rangeChevron} onPress={() => shiftRange(1)} disabled={endDate >= todayStr()}>
          <Text style={[styles.rangeChevronText, endDate >= todayStr() && { color: '#D0D5DD' }]}>›</Text>
        </TouchableOpacity>
      </View>
      {!isToday && (
        <TouchableOpacity onPress={resetToToday} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
          <Text style={styles.todayLink}>Today</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : records.length === 0 ? (
        <Text style={styles.emptyText}>No attendance records for the selected date range.</Text>
      ) : (
        records.map(r => (
          <TouchableOpacity key={r.id} style={styles.staffRow} onPress={() => openEdit(r)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffName}>{r.user?.fullName ?? r.user?.name ?? '—'}</Text>
              <Text style={styles.histTimes}>
                {fmtDate(r.date)} · {fmtTime(r.clockIn)} → {fmtTime(r.clockOut)} · {r.status ?? '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(r)} style={styles.staffDelBtn}>
              <Text style={styles.staffDelText}>Del</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Attendance' : 'Manual Attendance Entry'}</Text>

            {!editing && (
              <InlinePicker
                label="Staff Member"
                value={form.userId}
                options={staffOptions}
                onSelect={set('userId')}
                allowNone={false}
              />
            )}

            <DatePicker
              label="Date"
              value={form.date}
              onDateChange={set('date')}
              placeholder="Select date"
              style={{ marginBottom: 12 }}
            />

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Clock In (HH:mm)</Text>
                <TextInput style={styles.input} value={form.clockIn} onChangeText={set('clockIn')} placeholder="09:00" placeholderTextColor="#999" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Clock Out (HH:mm)</Text>
                <TextInput style={styles.input} value={form.clockOut} onChangeText={set('clockOut')} placeholder="18:00" placeholderTextColor="#999" />
              </View>
            </View>

            {editing && (
              <>
                <InlinePicker
                  label="Status (override)"
                  value={form.status}
                  options={ATTENDANCE_STATUSES}
                  onSelect={set('status')}
                  placeholder="Auto-computed from clock-in time"
                />
                <Text style={styles.statusHint}>Leave unset to auto-compute from clock-in time vs. the attendance policy.</Text>
              </>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={styles.input} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Admin/manager attendance management — company-wide only, matching the web
// Attendance page exactly (personal clock-in/out lives on the staff-side
// "My Attendance" screen, not here).
const AttendanceScreen = () => {
  const qc = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ['staff-attendance'] });
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={!!isFetching}
          onRefresh={() => qc.refetchQueries({ queryKey: ['staff-attendance'] })}
          tintColor={colors.primary}
        />
      }
    >
      <CompanyAttendanceSection />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 14, paddingBottom: 32 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, flex: 1, paddingRight: 8 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  statusBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  badgeGreenText: { color: '#16a34a' },
  badgeBlueText: { color: '#1d4ed8' },
  badgeGrayText: { color: '#6b7280' },

  statsRow: { flexDirection: 'row', backgroundColor: '#f8f9fb', borderRadius: 10, marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },

  actionBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  clockInBtn: { backgroundColor: '#16a34a' },
  clockOutBtn: { backgroundColor: '#ef4444' },
  actionBtnDisabled: { backgroundColor: '#d1d5db' },
  clockedInBtnRow: { flexDirection: 'row', gap: 10 },
  breakBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary },
  breakBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  breakSection: { marginBottom: 14 },
  breakHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  breakHeaderText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  onBreakBadge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  onBreakBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#92400e' },
  breakBarTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
  breakBarFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 999 },
  breakBarFillOver: { backgroundColor: '#ef4444' },
  breakAllowanceText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  breakAllowanceTextOver: { color: '#ef4444', fontFamily: 'Outfit-Medium' },
  noBreaksText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#d1d5db' },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fffbeb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  breakRowTime: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#b45309' },
  breakRowDuration: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#d97706' },
  actionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
  completedBanner: { backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  completedText: { color: '#1d4ed8', fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotOrange: { backgroundColor: '#f59e0b' },
  histDate: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  histTimes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  histHours: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  emptyText: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', paddingVertical: 24 },

  manualBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  manualBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  dateInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, marginBottom: 12 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rangeChevron: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  rangeChevronText: { fontSize: 18, color: '#374151', fontFamily: 'Outfit-SemiBold' },
  todayLink: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  staffName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  staffDelBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  staffDelText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 14 },
  timeRow: { flexDirection: 'row' },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5, marginTop: 10 },
  statusHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: -8, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default AttendanceScreen;
