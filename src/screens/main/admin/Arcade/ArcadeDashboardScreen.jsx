import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../services/api/globalApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const fmt = n => (n == null ? '0.00' : parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const elapsed = startTime => {
  const ms = Date.now() - new Date(startTime).getTime();
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const STATUS_STYLE = {
  Available:   { bg: '#f0fdf4', border: '#bbf7d0', badge: '#dcfce7', badgeText: '#15803d', dot: '#22c55e' },
  Occupied:    { bg: '#fef2f2', border: '#fecaca', badge: '#fee2e2', badgeText: '#b91c1c', dot: '#ef4444' },
  Maintenance: { bg: '#fffbeb', border: '#fde68a', badge: '#fef3c7', badgeText: '#92400e', dot: '#f59e0b' },
};

const useArcadeDashboard = () =>
  useQuery({ queryKey: ['arcade-dashboard'], queryFn: async () => { const r = await apiClient.get('/admin/arcade/dashboard'); return r?.data ?? r ?? null; } });
const useArcadeSessionTypes = () =>
  useQuery({ queryKey: ['arcade-session-types'], queryFn: async () => { const r = await apiClient.get('/admin/arcade/session-types'); return r?.data ?? r ?? []; } });

export default function ArcadeDashboardScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useArcadeDashboard();
  const { data: rawTypes = [] } = useArcadeSessionTypes();
  const sessionTypes = Array.isArray(rawTypes) ? rawTypes : (rawTypes?.data ?? []);
  const activeTypes = sessionTypes.filter(t => t.isActive);
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 60_000); return () => clearInterval(t); }, []);

  const [startStationId, setStartStationId] = useState(null);
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const startSession = useMutation({
    mutationFn: () => apiClient.post('/admin/arcade/sessions/start', {
      tableId: startStationId, sessionTypeId: sessionTypeId || undefined,
      customerName: customerName.trim() || null, notes: notes.trim() || null,
    }),
    onSuccess: () => { setStartStationId(null); qc.invalidateQueries({ queryKey: ['arcade-dashboard'] }); qc.invalidateQueries({ queryKey: ['arcade-sessions'] }); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to start session'),
  });

  if (isLoading || !data) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const stats = data.stats ?? {};
  const stations = data.tables ?? [];
  const activeSessions = stations.filter(t => t.activeSession).map(t => ({ ...t.activeSession, stationName: t.name }));
  const startStation = stations.find(t => t.id === startStationId);

  const openStart = stationId => {
    setStartStationId(stationId);
    setSessionTypeId(activeTypes[0]?.id ?? '');
    setCustomerName(''); setNotes('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Arcade Dashboard</Text>
          <Text style={styles.subHeading}>Live station status and session overview</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}><Text style={styles.refreshText}>⟳</Text></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.linkRow}>
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('ArcadeSessions')}><Text style={styles.linkBtnText}>All Sessions</Text></TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('ArcadeStations')}><Text style={styles.linkBtnText}>Manage Stations</Text></TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.activeSessions ?? 0}</Text><Text style={styles.statLabel}>Active Sessions</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.availableTables ?? 0}</Text><Text style={styles.statLabel}>Available Stations</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.occupiedTables ?? 0}</Text><Text style={styles.statLabel}>Occupied</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>Rs. {fmt(stats.todayRevenue)}</Text><Text style={styles.statLabel}>Today's Revenue</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Station Status</Text>
        {stations.length === 0 ? (
          <Text style={styles.empty}>No stations yet.</Text>
        ) : (
          <View style={styles.tableGrid}>
            {stations.map(station => {
              const sc = STATUS_STYLE[station.status] ?? STATUS_STYLE.Available;
              return (
                <View key={station.id} style={[styles.tableCard, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                  <View style={styles.tableCardHeader}>
                    <View>
                      <Text style={styles.tableName}>{station.name}</Text>
                      {station.tableNumber ? <Text style={styles.tableNum}>#{station.tableNumber}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.badge }]}>
                      <View style={[styles.dot, { backgroundColor: sc.dot }]} />
                      <Text style={[styles.badgeText, { color: sc.badgeText }]}>{station.status}</Text>
                    </View>
                  </View>
                  {station.activeSession && (
                    <View style={styles.activeInfo}>
                      {station.activeSession.customerName ? <Text style={styles.activeCustomer}>{station.activeSession.customerName}</Text> : null}
                      <Text style={styles.activeElapsed}>{elapsed(station.activeSession.startTime)} elapsed</Text>
                    </View>
                  )}
                  <View style={styles.tableCardFooter}>
                    {station.status === 'Available' && (
                      <TouchableOpacity style={styles.startBtn} onPress={() => openStart(station.id)}>
                        <Text style={styles.startBtnText}>+ Start Session</Text>
                      </TouchableOpacity>
                    )}
                    {station.status === 'Occupied' && station.activeSession && (
                      <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('ArcadeSessionDetail', { sessionId: station.activeSession.id })}>
                        <Text style={styles.manageBtnText}>Manage Session</Text>
                      </TouchableOpacity>
                    )}
                    {station.status === 'Maintenance' && <Text style={styles.maintText}>🔧 Under maintenance</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeSessions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            {activeSessions.map(s => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTable}>{s.stationName}</Text>
                  <Text style={styles.sessionCustomer}>{s.customerName ?? '—'}</Text>
                </View>
                <Text style={styles.sessionElapsed}>{elapsed(s.startTime)}</Text>
                <TouchableOpacity style={styles.manageBtnSm} onPress={() => navigation.navigate('ArcadeSessionDetail', { sessionId: s.id })}>
                  <Text style={styles.manageBtnSmText}>Manage</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!startStationId} animationType="slide" transparent onRequestClose={() => setStartStationId(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Session</Text>
            <Text style={styles.label}>Station</Text>
            <Text style={styles.tableValue}>{startStation?.name ?? '—'}</Text>
            <Text style={styles.label}>Session Type (billing rate)</Text>
            <InlinePicker
              options={[{ id: '', name: 'No rate — free play (items only)' }, ...activeTypes.map(t => ({ id: t.id, name: `${t.name} — Rs. ${fmt(t.rate)}${t.billingMethod === 'per_hour' ? '/hr' : t.billingMethod === 'per_minute' ? '/min' : '/game'}` }))]}
              value={sessionTypeId}
              onSelect={setSessionTypeId}
              placeholder="Select session type"
              allowNone={false}
            />
            <Text style={styles.label}>Customer (optional)</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor="#999" />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor="#999" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStartStationId(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => startSession.mutate()} disabled={startSession.isPending}>
                {startSession.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Start Session</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  refreshBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 16, color: '#6b7280' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  linkRow: { flexDirection: 'row', gap: 8 },
  linkBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  linkBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  statValue: { fontSize: 19, fontFamily: 'Outfit-Bold', color: '#111827' },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  empty: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tableCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 2, padding: 12, gap: 8 },
  tableCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tableName: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827' },
  tableNum: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  activeInfo: { borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.06)', paddingTop: 6 },
  activeCustomer: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  activeElapsed: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  tableCardFooter: { marginTop: 2 },
  startBtn: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  startBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  manageBtn: { borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  manageBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  maintText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#92400e', textAlign: 'center' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 },
  sessionTable: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  sessionCustomer: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  sessionElapsed: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  manageBtnSm: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  manageBtnSmText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  tableValue: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 12 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
