import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../services/api/globalApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const fmt = n => (n == null ? '0.00' : parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtDuration = minutes => {
  if (!minutes) return '—';
  const m = parseFloat(minutes), h = Math.floor(m / 60), r = Math.round(m % 60);
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};
const fmtTime = iso => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

const STATUS_STYLE = {
  Active:    { bg: '#dcfce7', text: '#15803d', label: 'Active' },
  Completed: { bg: '#fef3c7', text: '#92400e', label: 'Pending Payment' },
  Paid:      { bg: '#dbeafe', text: '#1d4ed8', label: 'Paid' },
};
const FILTERS = ['All', 'Active', 'Completed', 'Paid'];

const useSessions = () =>
  useQuery({ queryKey: ['arcade-sessions'], queryFn: async () => { const r = await apiClient.get('/admin/arcade/sessions'); return r?.data ?? r ?? []; } });
const useStations = () =>
  useQuery({ queryKey: ['arcade-stations'], queryFn: async () => { const r = await apiClient.get('/admin/arcade/stations'); return r?.data ?? r ?? []; } });
const useSessionTypes = () =>
  useQuery({ queryKey: ['arcade-session-types'], queryFn: async () => { const r = await apiClient.get('/admin/arcade/session-types'); return r?.data ?? r ?? []; } });

function CustomerSearchField({ label, value, onSelect }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/admin/customers?search=${encodeURIComponent(search)}&limit=8`);
        const data = res?.data?.items ?? res?.data ?? res ?? [];
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.selectedChip}>
          <Text style={styles.selectedChipText} numberOfLines={1}>{value.name}</Text>
          <TouchableOpacity onPress={() => onSelect(null)}><Text style={styles.selectedChipClear}>✕</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search by name or phone…" placeholderTextColor="#999" />
          {results.length > 0 && (
            <View style={styles.dropdown}>
              {results.map(c => (
                <TouchableOpacity key={c.id} style={styles.dropdownRow} onPress={() => { onSelect(c); setSearch(''); setResults([]); }}>
                  <Text style={styles.dropdownText}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function ArcadeSessionsScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { data: rawSessions = [], isFetching, refetch } = useSessions();
  const { data: rawStations = [] } = useStations();
  const { data: rawTypes = [] } = useSessionTypes();

  const sessions = Array.isArray(rawSessions) ? rawSessions : (rawSessions?.data ?? []);
  const stations = Array.isArray(rawStations) ? rawStations : (rawStations?.data ?? []);
  const sessionTypes = Array.isArray(rawTypes) ? rawTypes : (rawTypes?.data ?? []);
  const availableStations = stations.filter(t => t.status === 'Available');
  const activeTypes = sessionTypes.filter(t => t.isActive);

  const [statusFilter, setStatusFilter] = useState('All');
  const [startOpen, setStartOpen] = useState(false);
  const [stationId, setStationId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [customer, setCustomer] = useState(null);
  const [notes, setNotes] = useState('');

  const startMut = useMutation({
    mutationFn: () => apiClient.post('/admin/arcade/sessions/start', {
      tableId: stationId, sessionTypeId: sessionTypeId || undefined,
      player1Id: customer?.id ?? null, customerName: customer?.name ?? null, notes: notes.trim() || null,
    }),
    onSuccess: () => { setStartOpen(false); qc.invalidateQueries({ queryKey: ['arcade-sessions'] }); qc.invalidateQueries({ queryKey: ['arcade-stations'] }); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to start session'),
  });

  const deleteMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/arcade/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arcade-sessions'] }); qc.invalidateQueries({ queryKey: ['arcade-stations'] }); },
    onError: () => Alert.alert('Error', 'Failed to delete session'),
  });

  const openStart = () => {
    setStationId(availableStations[0]?.id ?? '');
    setSessionTypeId(activeTypes[0]?.id ?? '');
    setCustomer(null); setNotes('');
    setStartOpen(true);
  };

  const handleStart = () => {
    if (!stationId) { Alert.alert('Error', 'Please select a station'); return; }
    startMut.mutate();
  };

  const handleDelete = s => Alert.alert('Delete Session', s.status === 'Active' ? `Delete active session on "${s.table?.name}"? The station will be freed.` : `Delete session on "${s.table?.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(s.id) },
  ]);

  const activeCount = sessions.filter(s => s.status === 'Active').length;
  const pendingCount = sessions.filter(s => s.status === 'Completed').length;
  const filtered = statusFilter === 'All' ? sessions : sessions.filter(s => s.status === statusFilter);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Sessions</Text>
            <Text style={styles.subHeading}>Start, manage and collect payment</Text>
          </View>
          <TouchableOpacity style={[styles.startBtn, availableStations.length === 0 && styles.startBtnDisabled]} onPress={openStart} disabled={availableStations.length === 0}>
            <Text style={styles.startBtnText}>▶ Start Session</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
              <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
                {f === 'Completed' ? 'Pending Payment' : f}{f !== 'All' ? ` (${f === 'Completed' ? pendingCount : f === 'Active' ? activeCount : sessions.filter(s => s.status === f).length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No sessions found.</Text>}
        renderItem={({ item }) => {
          const badge = STATUS_STYLE[item.status] ?? STATUS_STYLE.Active;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTable}>{item.table?.name ?? '—'}</Text>
                  <Text style={styles.cardCustomer} numberOfLines={1}>{item.customerName ?? '—'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text></View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>{fmtTime(item.startTime)} · {item.endTime ? fmtDuration(item.durationMinutes) : 'Active'}</Text>
                <Text style={styles.cardBill}>{item.status === 'Active' ? 'In progress' : `Rs. ${fmt(item.totalAmount)}`}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('ArcadeSessionDetail', { sessionId: item.id })}>
                  <Text style={styles.manageBtnText}>{item.status === 'Active' ? 'Manage' : 'View'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.delBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={startOpen} animationType="slide" transparent onRequestClose={() => setStartOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start New Session</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Station *</Text>
              <InlinePicker options={availableStations.map(t => ({ id: t.id, name: t.tableNumber ? `${t.name} (#${t.tableNumber})` : t.name }))} value={stationId} onSelect={setStationId} placeholder="Select station" allowNone={false} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Session Type</Text>
              <InlinePicker options={[{ id: '', name: 'No rate — free play (items only)' }, ...activeTypes.map(t => ({ id: t.id, name: `${t.name} — Rs. ${fmt(t.rate)}` }))]} value={sessionTypeId} onSelect={setSessionTypeId} placeholder="Select session type" allowNone={false} />
            </View>
            <CustomerSearchField label="Customer (optional)" value={customer} onSelect={setCustomer} />
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor="#999" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStartOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleStart} disabled={startMut.isPending}>
                {startMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Start Session</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  startBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  startBtnDisabled: { backgroundColor: '#D0D5DD' },
  startBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  filterText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterTextActive: { color: '#111827', fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTable: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  cardCustomer: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMetaText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  cardBill: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#15803d' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  manageBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  manageBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  delBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  selectedChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  selectedChipText: { flex: 1, fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1e40af' },
  selectedChipClear: { fontSize: 14, color: '#60a5fa', paddingLeft: 8 },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 160 },
  dropdownRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  dropdownText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
