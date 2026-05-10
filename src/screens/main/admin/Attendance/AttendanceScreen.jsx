import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const useAttendanceHistory = () =>
  useQuery({
    queryKey: ['attendance-history'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/attendance/history');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/admin/attendance/clock-in', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-history'] }),
  });
};

const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/admin/attendance/clock-out', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-history'] }),
  });
};

const fmtTime = dateStr => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = dateStr => {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const AttendanceScreen = () => {
  const { data: rawHistory = [], isLoading, refetch } = useAttendanceHistory();
  const history = Array.isArray(rawHistory) ? rawHistory : (rawHistory?.data ?? []);

  const { mutate: clockIn, isPending: clockingIn } = useClockIn();
  const { mutate: clockOut, isPending: clockingOut } = useClockOut();

  const today = history.find(r => r.date?.slice(0, 10) === todayStr()) ?? null;
  const isClockedIn  = !!today && !today.clockOut;
  const isCompleted  = !!today && !!today.clockOut;
  const actionLoading = clockingIn || clockingOut;

  const handleClockIn = useCallback(() => {
    clockIn(undefined, {
      onError: err => Alert.alert('Error', err?.message ?? 'Clock-in failed'),
    });
  }, [clockIn]);

  const handleClockOut = useCallback(() => {
    clockOut(undefined, {
      onError: err => Alert.alert('Error', err?.message ?? 'Clock-out failed'),
    });
  }, [clockOut]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Today's card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today — {fmtDate(new Date().toISOString())}</Text>
          <View style={[
            styles.statusBadge,
            isClockedIn ? styles.badgeGreen : isCompleted ? styles.badgeBlue : styles.badgeGray,
          ]}>
            <Text style={[
              styles.statusBadgeText,
              isClockedIn ? styles.badgeGreenText : isCompleted ? styles.badgeBlueText : styles.badgeGrayText,
            ]}>
              {isClockedIn ? 'Clocked In' : isCompleted ? 'Completed' : 'Not Started'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Clock In</Text>
                <Text style={styles.statValue}>{fmtTime(today?.clockIn)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Clock Out</Text>
                <Text style={styles.statValue}>{fmtTime(today?.clockOut)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Hours</Text>
                <Text style={styles.statValue}>
                  {today?.hoursWorked != null ? `${today.hoursWorked}h` : '—'}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            {!isClockedIn && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.clockInBtn, isCompleted && styles.actionBtnDisabled]}
                onPress={handleClockIn}
                disabled={actionLoading || isCompleted}
              >
                {clockingIn
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.actionBtnText}>Clock In</Text>}
              </TouchableOpacity>
            )}
            {isClockedIn && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.clockOutBtn]}
                onPress={handleClockOut}
                disabled={actionLoading}
              >
                {clockingOut
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.actionBtnText}>Clock Out</Text>}
              </TouchableOpacity>
            )}
            {isCompleted && (
              <View style={styles.completedBanner}>
                <Text style={styles.completedText}>
                  Shift complete — {today.hoursWorked}h worked
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance History</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records yet.</Text>
        ) : (
          history.map(record => (
            <View key={record.id} style={styles.histRow}>
              <View style={[styles.dot, record.clockOut ? styles.dotGreen : styles.dotOrange]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.histDate}>{fmtDate(record.date)}</Text>
                <Text style={styles.histTimes}>
                  {fmtTime(record.clockIn)} → {fmtTime(record.clockOut)}
                </Text>
              </View>
              <Text style={[styles.histHours, !record.clockOut && { color: '#f59e0b' }]}>
                {record.hoursWorked != null ? `${record.hoursWorked}h` : 'In progress'}
              </Text>
            </View>
          ))
        )}
      </View>
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
});

export default AttendanceScreen;
