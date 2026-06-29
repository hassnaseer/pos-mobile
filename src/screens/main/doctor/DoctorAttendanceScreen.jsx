import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import apiClient from '../../../services/api/globalApi';
import colors from '../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

const DoctorAttendanceScreen = () => {
  const [records, setRecords] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [attRes, todayRes] = await Promise.all([
        apiClient.get('/doctor/attendance'),
        apiClient.get('/doctor/attendance/today'),
      ]);
      setRecords(attRes?.data ?? attRes ?? []);
      setToday(todayRes?.data ?? todayRes ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const isClockedIn = !!(today?.clockIn && !today?.clockOut);

  const handleClock = async () => {
    setClockLoading(true);
    try {
      if (isClockedIn) await apiClient.post('/doctor/attendance/clock-out');
      else await apiClient.post('/doctor/attendance/clock-in');
      await load();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to update attendance');
    } finally { setClockLoading(false); }
  };

  return (
    <View style={s.root}>
      <View style={s.todayCard}>
        <View>
          <Text style={s.todayLabel}>Today</Text>
          <Text style={s.todayDate}>{fmt(new Date().toISOString())}</Text>
          <View style={s.timesRow}>
            <Text style={s.timeItem}>In: <Text style={s.timeVal}>{fmtTime(today?.clockIn)}</Text></Text>
            <Text style={s.timeItem}>Out: <Text style={s.timeVal}>{fmtTime(today?.clockOut)}</Text></Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.clockBtn, isClockedIn ? s.clockOutBtn : s.clockInBtn]}
          onPress={handleClock}
          disabled={clockLoading}
        >
          {clockLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.clockBtnText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Attendance History</Text>
      <FlatList
        data={records}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!loading && <Text style={s.empty}>No attendance records yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View>
              <Text style={s.rowDate}>{fmt(item.date)}</Text>
              <Text style={s.rowSub}>
                In: {fmtTime(item.clockIn)}  ·  Out: {fmtTime(item.clockOut) ?? '—'}
              </Text>
            </View>
            {item.totalHours != null && (
              <View style={s.hoursBadge}>
                <Text style={s.hoursText}>{parseFloat(item.totalHours).toFixed(1)}h</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  todayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  todayLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  todayDate: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#0f172a', marginTop: 2 },
  timesRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  timeItem: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b' },
  timeVal: { fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  clockBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  clockInBtn: { backgroundColor: '#16a34a' },
  clockOutBtn: { backgroundColor: '#dc2626' },
  clockBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginHorizontal: 14, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' },
  rowDate: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  hoursBadge: { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  hoursText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: colors.primary },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default DoctorAttendanceScreen;
