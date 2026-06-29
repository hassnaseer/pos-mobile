import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../services/api/globalApi';
import colors from '../../../theme/colors';

const calcAge = dob => { if (!dob) return null; const y = new Date().getFullYear() - new Date(dob).getFullYear(); return isNaN(y) ? null : `${y} yrs`; };

const DoctorPatientsScreen = () => {
  const navigation = useNavigation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/doctor/patients');
      setPatients(res?.data ?? res ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search))
    : patients;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TextInput style={s.search} placeholder="Search patients..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!loading && <Text style={s.empty}>No patients found.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.avatar}><Text style={s.avatarText}>{(item.name ?? 'P')[0].toUpperCase()}</Text></View>
            <View style={s.info}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>
                {[item.gender, calcAge(item.dateOfBirth), item.phone].filter(Boolean).join(' · ')}
              </Text>
              {item.allergies ? <Text style={s.sub} numberOfLines={1}>Allergies: {item.allergies}</Text> : null}
            </View>
            <TouchableOpacity style={s.rxBtn} onPress={() => navigation.navigate('DoctorPatientPrescriptions', { patientId: item.id, patientName: item.name })}>
              <Text style={s.rxText}>Rx</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.primary, fontFamily: 'Outfit-Bold', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  rxBtn: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  rxText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default DoctorPatientsScreen;
