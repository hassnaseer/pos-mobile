import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import apiClient from '../../../services/api/globalApi';
import colors from '../../../theme/colors';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
const fmtTime = t => t ? t.slice(0, 5) : '—';

const STATUSES = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];
const STATUS_COLOR = {
  Scheduled: { bg: '#eff6ff', text: '#1d4ed8' },
  Completed:  { bg: '#f0fdf4', text: '#16a34a' },
  Cancelled:  { bg: '#fef2f2', text: '#dc2626' },
  'No-Show':  { bg: '#f9fafb', text: '#6b7280' },
};

const DoctorAppointmentsScreen = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('All');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (status !== 'All') params.set('status', status);
      const res = await apiClient.get(`/doctor/appointments?${params}`);
      setAppointments(res?.data ?? res ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [date, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? appointments.filter(a => a.patient?.name?.toLowerCase().includes(search.toLowerCase()))
    : appointments;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TextInput style={s.search} placeholder="Search patient..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        <TextInput style={s.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999" value={date} onChangeText={setDate} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipContent}>
        {STATUSES.map(st => (
          <TouchableOpacity key={st} style={[s.chip, status === st && s.chipActive]} onPress={() => setStatus(st)}>
            <Text style={[s.chipText, status === st && s.chipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={a => String(a.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!loading && <Text style={s.empty}>No appointments found.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151' };
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.timeBlock}>
                  <Text style={s.time}>{fmtTime(item.appointmentTime)}</Text>
                  <Text style={s.dateTxt}>{fmtDate(item.appointmentDate)}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.patientName}>{item.patient?.name ?? '—'}</Text>
                  {item.patient?.phone ? <Text style={s.sub}>{item.patient.phone}</Text> : null}
                  {item.reason ? <Text style={s.sub} numberOfLines={1}>{item.reason}</Text> : null}
                  {item.appointmentType?.name ? <Text style={s.sub}>{item.appointmentType.name}</Text> : null}
                </View>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              {item.notes ? <Text style={s.notes} numberOfLines={2}>{item.notes}</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
};

import { ScrollView } from 'react-native';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  dateInput: { width: 120, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: 'Outfit-Regular' },
  chipRow: { maxHeight: 46, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  chipContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  timeBlock: { alignItems: 'center', minWidth: 52 },
  time: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  dateTxt: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#94a3b8', textAlign: 'center' },
  info: { flex: 1 },
  patientName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 8, borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 6 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default DoctorAppointmentsScreen;
