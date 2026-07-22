import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useMyAttendance, useClockIn, useClockOut, useBreakStart, useBreakEnd } from '../../../services/api/posApi';
import DateRangePicker from '../../../components/Ui/DateRangePicker';
import colors from '../../../theme/colors';
import { parseDateOnly } from '../../../utils/formatDate';

const STATUS_COLOR = {
  Present: '#10B981', Late: '#EF4444', Absent: '#9CA3AF', 'Half Day': '#F59E0B',
  'Unpaid Leave': '#9CA3AF', 'Paid Leave': '#6366F1', 'Sick Leave': '#8B5CF6', 'Short Leave': '#F59E0B',
};

const fmtTime = ts => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = ts => (ts ? parseDateOnly(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '—');
const fmtBreakDuration = minutes => {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};
// Show decimal hours (e.g. 9.5) as "9 hrs 30 mins".
const fmtHours = hours => {
  if (!hours) return '—';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} hr${h === 1 ? '' : 's'}`);
  if (m > 0) parts.push(`${m} min${m === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' ') : '0 mins';
};
// Green when the employee worked at least their scheduled shift, red when short; neutral when unknown.
const timeColor = (worked, scheduled) => {
  if (worked == null || scheduled == null) return '#111827';
  return worked >= scheduled ? '#16a34a' : '#dc2626';
};
// Clock-in: red if late (after shift start), green if early/on-time; neutral when unknown.
const clockInColor = late => (late == null ? '#111827' : late ? '#dc2626' : '#16a34a');
// Clock-out: red if early (before shift end), green if on-time/overtime; neutral when unknown.
const clockOutColor = early => (early == null ? '#111827' : early ? '#dc2626' : '#16a34a');
// Local calendar day, not UTC — toISOString() rolls over to the previous day (relative to the
// device's own clock) for anyone in a timezone ahead of UTC during early-morning hours, which
// broke "today's" clock-in record matching below.
const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MyAttendanceScreen = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: raw = [], isLoading, refetch } = useMyAttendance(from || to ? { from, to } : {});
  const { mutate: clockIn, isPending: clockingIn } = useClockIn();
  const { mutate: clockOut, isPending: clockingOut } = useClockOut();
  const { mutate: breakStart, isPending: breakStarting } = useBreakStart();
  const { mutate: breakEnd, isPending: breakEnding } = useBreakEnd();

  const records = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const today = records.find(r => r.date?.slice(0, 10) === todayStr()) ?? null;
  const isClockedIn = !!today && !today.clockOut;
  const isCompleted = !!today && !!today.clockOut;
  const isOnBreak = !!today?.isOnBreak;
  const breaks = today?.breaks ?? [];
  const breakAllowance = today?.breakMinutesAllowed ?? null;
  const openBreak = breaks.find(b => !b.breakEnd);
  const actionLoading = clockingIn || clockingOut || breakStarting || breakEnding;

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isOnBreak) return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isOnBreak]);

  const liveUsedMinutes = breaks.reduce((sum, b) => {
    const end = b.breakEnd ? new Date(b.breakEnd).getTime() : Date.now();
    return sum + (end - new Date(b.breakStart).getTime()) / 60000;
  }, 0);
  const usedBreakMinutes = isOnBreak ? liveUsedMinutes : (today?.totalBreakMinutes ?? 0);
  const breakAllowanceUsedUp = breakAllowance !== null && usedBreakMinutes >= breakAllowance;

  const handleClockIn = () => clockIn(undefined, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Clock-in failed') });
  const handleClockOut = () => clockOut(undefined, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Clock-out failed') });
  const handleBreakStart = () => breakStart(undefined, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to start break') });
  const handleBreakEnd = () => breakEnd(undefined, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to end break') });

  return (
    <View style={styles.root}>
      <FlatList
        data={records}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Attendance</Text>
              {isClockedIn && <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}><Text style={[styles.badgeText, { color: '#15803d' }]}>Clocked In</Text></View>}
              {isCompleted && <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}><Text style={[styles.badgeText, { color: '#1e40af' }]}>Shift Complete</Text></View>}
              {!today && !isLoading && <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}><Text style={[styles.badgeText, { color: '#6b7280' }]}>Not Started</Text></View>}
            </View>

            {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeBox}><Text style={styles.timeLabel}>Clock In</Text><Text style={[styles.timeValue, { color: clockInColor(today?.lateClockIn) }]}>{fmtTime(today?.clockIn)}</Text></View>
                  <View style={styles.timeBox}><Text style={styles.timeLabel}>Clock Out</Text><Text style={[styles.timeValue, { color: clockOutColor(today?.earlyClockOut) }]}>{fmtTime(today?.clockOut)}</Text></View>
                  <View style={styles.timeBox}><Text style={styles.timeLabel}>Time</Text><Text style={[styles.timeValue, { color: timeColor(today?.hoursWorked, today?.scheduledHours) }]}>{fmtHours(today?.hoursWorked)}</Text></View>
                </View>

                {(isClockedIn || isCompleted) && (
                  <View style={styles.breakSection}>
                    <View style={styles.breakHeaderRow}>
                      <Text style={styles.breakHeaderText}>Breaks{breaks.length > 0 ? ` (${fmtBreakDuration(Math.round(usedBreakMinutes))} total)` : ''}</Text>
                      {isOnBreak && openBreak && <View style={styles.onBreakBadge}><Text style={styles.onBreakBadgeText}>On Break</Text></View>}
                    </View>
                    {breakAllowance !== null && (
                      <>
                        <View style={styles.breakBarTrack}>
                          <View style={[styles.breakBarFill, { width: `${Math.min(100, (usedBreakMinutes / breakAllowance) * 100)}%` }, breakAllowanceUsedUp && styles.breakBarFillOver]} />
                        </View>
                        <Text style={[styles.breakAllowanceText, breakAllowanceUsedUp ? styles.breakAllowanceTextOver : styles.breakAllowanceTextOk]}>
                          {Math.round(usedBreakMinutes)} / {breakAllowance} min used{breakAllowanceUsedUp ? ' — daily allowance used up' : ''}
                        </Text>
                      </>
                    )}
                    {breaks.length === 0 ? <Text style={styles.noBreaksText}>No breaks taken</Text> : breaks.map(b => (
                      <View key={b.id} style={styles.breakRow}>
                        <Text style={styles.breakRowTime}>{fmtTime(b.breakStart)} – {b.breakEnd ? fmtTime(b.breakEnd) : 'in progress'}</Text>
                        <Text style={styles.breakRowDuration}>{b.breakEnd ? fmtBreakDuration(Math.round((new Date(b.breakEnd) - new Date(b.breakStart)) / 60000)) : '…'}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {isCompleted ? (
                  <View style={styles.completedBanner}><Text style={styles.completedText}>Shift complete — {fmtHours(today.hoursWorked)} worked</Text></View>
                ) : isClockedIn ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.clockOutBtn]} onPress={handleClockOut} disabled={actionLoading}>
                      {clockingOut ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Clock Out</Text>}
                    </TouchableOpacity>
                    {isOnBreak ? (
                      <TouchableOpacity style={[styles.actionBtn, styles.breakBtn]} onPress={handleBreakEnd} disabled={actionLoading}>
                        {breakEnding ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.breakBtnText}>End Break</Text>}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.actionBtn, styles.breakBtn, breakAllowanceUsedUp && styles.actionBtnDisabled]} onPress={handleBreakStart} disabled={actionLoading || breakAllowanceUsedUp}>
                        {breakStarting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.breakBtnText}>{breakAllowanceUsedUp ? 'Break Limit Reached' : 'Start Break'}</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, styles.clockInBtn]} onPress={handleClockIn} disabled={actionLoading}>
                    {clockingIn ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Clock In</Text>}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>History</Text>
            <DateRangePicker
              from={from}
              to={to}
              onChangeFrom={setFrom}
              onChangeTo={setTo}
              fromPlaceholder="From"
              toPlaceholder="To"
              style={styles.rangeRow}
            />
            {(from || to) && (
              <TouchableOpacity onPress={() => { setFrom(''); setTo(''); }} style={styles.clearRangeBtn}>
                <Text style={styles.clearRangeText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
          </>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowDate}>{fmtDate(item.date)}</Text>
              <Text style={styles.rowTime}>In: <Text style={{ color: clockInColor(item.lateClockIn), fontFamily: 'Outfit-SemiBold' }}>{fmtTime(item.clockIn)}</Text>  ·  Out: <Text style={{ color: clockOutColor(item.earlyClockOut), fontFamily: 'Outfit-SemiBold' }}>{fmtTime(item.clockOut)}</Text></Text>
              {item.hoursWorked != null && <Text style={[styles.rowMeta, { color: timeColor(item.hoursWorked, item.scheduledHours), fontFamily: 'Outfit-SemiBold' }]}>{fmtHours(item.hoursWorked)}</Text>}
            </View>
            <View style={[styles.historyBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
              <Text style={[styles.historyBadgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'Present'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No attendance records found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  loader: { marginVertical: 20 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  timeBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, alignItems: 'center' },
  timeLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  timeValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 2 },
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
  breakAllowanceTextOk: { color: '#16a34a', fontFamily: 'Outfit-Medium' },
  noBreaksText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#d1d5db' },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fffbeb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  breakRowTime: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#b45309' },
  breakRowDuration: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#d97706' },
  completedBanner: { backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  completedText: { color: '#1d4ed8', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: '#d1d5db', borderColor: '#d1d5db' },
  actionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  clockInBtn: { backgroundColor: '#16a34a' },
  clockOutBtn: { backgroundColor: '#dc2626' },
  breakBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary },
  breakBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  historyHeader: { marginHorizontal: 12, marginTop: 8 },
  historyTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rangeRow: { gap: 8 },
  clearRangeBtn: { alignSelf: 'flex-start', marginTop: 6 },
  clearRangeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo: { flex: 1 },
  rowDate: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowTime: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  historyBadgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyAttendanceScreen;
