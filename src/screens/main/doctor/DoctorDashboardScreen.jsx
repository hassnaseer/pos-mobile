import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../services/api/globalApi';
import { useAuth } from '../../../context/AuthContext';
import colors from '../../../theme/colors';

const fmtTime = t => t ? t.slice(0, 5) : '—';

const STATUS_COLOR = {
  Scheduled: { bg: '#eff6ff', text: '#1d4ed8' },
  Completed:  { bg: '#f0fdf4', text: '#16a34a' },
  Cancelled:  { bg: '#fef2f2', text: '#dc2626' },
  'No-Show':  { bg: '#f9fafb', text: '#6b7280' },
};

const DoctorDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
      const [profileRes, apptRes] = await Promise.all([
        apiClient.get('/doctor/me'),
        apiClient.get(`/doctor/appointments?date=${today}`),
      ]);
      setProfile(profileRes?.data ?? profileRes ?? null);
      setTodayAppts(apptRes?.data ?? apptRes ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const scheduled = todayAppts.filter(a => a.status === 'Scheduled').length;
  const completed = todayAppts.filter(a => a.status === 'Completed').length;

  const stats = [
    { label: "Today's Appointments", value: todayAppts.length, icon: '📅', color: '#2563eb', bg: '#eff6ff' },
    { label: 'Scheduled',            value: scheduled,          icon: '⏰', color: '#d97706', bg: '#fffbeb' },
    { label: 'Completed Today',      value: completed,          icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Specialization',       value: profile?.specialization ?? '—', icon: '🩺', color: '#7c3aed', bg: '#f5f3ff' },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.welcomeText}>Welcome, Dr. {profile?.name ?? user?.name ?? '—'}</Text>
          <Text style={s.specText}>{profile?.specialization ?? 'Doctor'}</Text>
        </View>
      </View>
      <View style={s.headerBtns}>
        <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate('DoctorAttendance')}>
          <Text style={s.outlineBtnText}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('DoctorAppointments')}>
          <Text style={s.primaryBtnText}>Appointments</Text>
        </TouchableOpacity>
      </View>

      {/* Stats — 2x2 */}
      <View style={s.statsGrid}>
        {stats.map(c => (
          <View key={c.label} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: c.bg }]}><Text style={{ fontSize: 18 }}>{c.icon}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.statLabel} numberOfLines={1}>{c.label}</Text>
              <Text style={[s.statValue, { color: c.color }]} numberOfLines={1}>{c.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Today's Schedule */}
      <View style={s.panel}>
        <View style={s.panelHead}>
          <Text style={s.panelTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointments')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
        </View>
        {loading ? (
          <Text style={s.empty}>Loading…</Text>
        ) : todayAppts.length === 0 ? (
          <Text style={s.empty}>No appointments today</Text>
        ) : (
          todayAppts.map(a => {
            const sc = STATUS_COLOR[a.status] ?? { bg: '#f9fafb', text: '#374151' };
            return (
              <View key={a.id} style={s.apptRow}>
                <Text style={s.apptTime}>{fmtTime(a.appointmentTime)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.apptPatient} numberOfLines={1}>{a.patient?.name ?? '—'}</Text>
                  {a.reason ? <Text style={s.apptReason} numberOfLines={1}>{a.reason}</Text> : null}
                </View>
                <View style={[s.badge, { backgroundColor: sc.bg }]}><Text style={[s.badgeText, { color: sc.text }]}>{a.status}</Text></View>
              </View>
            );
          })
        )}
      </View>

      {/* Quick links */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('DoctorPatients')}>
          <View style={[s.quickIcon, { backgroundColor: '#f5f3ff' }]}><Text style={{ fontSize: 18 }}>👥</Text></View>
          <View><Text style={s.quickTitle}>My Patients</Text><Text style={s.quickSub}>View assigned patients</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('DoctorAttendance')}>
          <View style={[s.quickIcon, { backgroundColor: '#f0fdf4' }]}><Text style={{ fontSize: 18 }}>🕐</Text></View>
          <View><Text style={s.quickTitle}>Attendance</Text><Text style={s.quickSub}>Clock in / Clock out</Text></View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  welcomeText: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  specText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#eee' },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  outlineBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  statCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#64748b' },
  statValue: { fontSize: 20, fontFamily: 'Outfit-Bold', marginTop: 1 },
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginHorizontal: 14, marginTop: 4 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  panelTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  viewAll: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', paddingVertical: 28 },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  apptTime: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#0f172a', width: 52 },
  apptPatient: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#0f172a' },
  apptReason: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 14 },
  quickCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  quickIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  quickSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
});

export default DoctorDashboardScreen;
