import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import apiClient from '../../../services/api/globalApi';
import { useAuth } from '../../../context/AuthContext';
import colors from '../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
const fmtTime = t => t ? t.slice(0, 5) : '—';

const STATUS_COLOR = {
  Scheduled: { bg: '#eff6ff', text: '#1d4ed8' },
  Completed:  { bg: '#f0fdf4', text: '#16a34a' },
  Cancelled:  { bg: '#fef2f2', text: '#dc2626' },
  'No-Show':  { bg: '#f9fafb', text: '#6b7280' },
};

const DoctorDashboardScreen = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [profileRes, apptRes, attRes] = await Promise.all([
        apiClient.get('/doctor/me'),
        apiClient.get(`/doctor/appointments?date=${today}`),
        apiClient.get('/doctor/attendance/today'),
      ]);
      setProfile(profileRes?.data ?? profileRes ?? null);
      setTodayAppts(apptRes?.data ?? apptRes ?? []);
      const att = attRes?.data ?? attRes;
      setClockedIn(!!(att?.clockIn && !att?.clockOut));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleClock = async () => {
    setClockLoading(true);
    try {
      if (clockedIn) await apiClient.post('/doctor/attendance/clock-out');
      else await apiClient.post('/doctor/attendance/clock-in');
      await load();
    } catch { /* ignore */ }
    finally { setClockLoading(false); }
  };

  const scheduled = todayAppts.filter(a => a.status === 'Scheduled').length;
  const completed  = todayAppts.filter(a => a.status === 'Completed').length;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{(profile?.name ?? user?.name ?? 'D')[0].toUpperCase()}</Text></View>
        <View style={s.headerInfo}>
          <Text style={s.welcomeText}>Dr. {profile?.name ?? user?.name ?? '—'}</Text>
          <Text style={s.specText}>{profile?.specialization ?? 'Doctor'}</Text>
        </View>
        <TouchableOpacity style={[s.clockBtn, clockedIn ? s.clockOutBtn : s.clockInBtn]} onPress={handleClock} disabled={clockLoading}>
          {clockLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.clockBtnText}>{clockedIn ? 'Clock Out' : 'Clock In'}</Text>}
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{todayAppts.length}</Text>
          <Text style={s.statLabel}>Today's Appts</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: '#2563eb' }]}>{scheduled}</Text>
          <Text style={s.statLabel}>Scheduled</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: '#16a34a' }]}>{completed}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Today's Appointments</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
      ) : todayAppts.length === 0 ? (
        <Text style={s.empty}>No appointments today.</Text>
      ) : (
        todayAppts.map(a => {
          const sc = STATUS_COLOR[a.status] ?? { bg: '#f9fafb', text: '#374151' };
          return (
            <View key={a.id} style={s.apptCard}>
              <View style={s.apptLeft}>
                <Text style={s.apptTime}>{fmtTime(a.appointmentTime)}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.text }]}>{a.status}</Text>
                </View>
              </View>
              <View style={s.apptRight}>
                <Text style={s.apptPatient}>{a.patient?.name ?? '—'}</Text>
                {a.reason ? <Text style={s.apptReason} numberOfLines={1}>{a.reason}</Text> : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, gap: 12, borderBottomWidth: 1, borderColor: '#eee' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold' },
  headerInfo: { flex: 1 },
  welcomeText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  specText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  clockBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  clockInBtn: { backgroundColor: '#16a34a' },
  clockOutBtn: { backgroundColor: '#dc2626' },
  clockBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  statNum: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.primary },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a', marginHorizontal: 14, marginTop: 4, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 20 },
  apptCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 12, gap: 12, borderWidth: 1, borderColor: '#eee' },
  apptLeft: { alignItems: 'center', gap: 6, minWidth: 60 },
  apptTime: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  apptRight: { flex: 1 },
  apptPatient: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  apptReason: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
});

export default DoctorDashboardScreen;
