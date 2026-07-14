import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../services/api/globalApi';
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

const useSnookerDashboard = () =>
  useQuery({ queryKey: ['snooker-dashboard'], queryFn: async () => { const r = await apiClient.get('/admin/snooker/dashboard'); return r?.data ?? r ?? null; } });

export default function SnookerDashboardScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useSnookerDashboard();
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 60_000); return () => clearInterval(t); }, []);

  const [startTableId, setStartTableId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const startSession = useMutation({
    mutationFn: () => apiClient.post('/admin/snooker/sessions/start', { tableId: startTableId, customerName: customerName.trim() || null, notes: notes.trim() || null }),
    onSuccess: () => { setStartTableId(null); qc.invalidateQueries({ queryKey: ['snooker-dashboard'] }); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to start session'),
  });

  if (isLoading || !data) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const stats = data.stats ?? {};
  const tables = data.tables ?? [];
  const activeSessions = tables.filter(t => t.activeSession).map(t => ({ ...t.activeSession, tableName: t.name }));

  const startTable = tables.find(t => t.id === startTableId);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Snooker Dashboard</Text>
          <Text style={styles.subHeading}>Live table status and session overview</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}><Text style={styles.refreshText}>⟳</Text></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.linkRow}>
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('SnookerSessions')}><Text style={styles.linkBtnText}>All Sessions</Text></TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('SnookerTables')}><Text style={styles.linkBtnText}>Manage Tables</Text></TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.activeSessions ?? 0}</Text><Text style={styles.statLabel}>Active Sessions</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.availableTables ?? 0}</Text><Text style={styles.statLabel}>Available Tables</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.occupiedTables ?? 0}</Text><Text style={styles.statLabel}>Occupied</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>Rs. {fmt(stats.todayRevenue)}</Text><Text style={styles.statLabel}>Today's Revenue</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Table Status</Text>
        {tables.length === 0 ? (
          <Text style={styles.empty}>No tables yet.</Text>
        ) : (
          <View style={styles.tableGrid}>
            {tables.map(table => {
              const sc = STATUS_STYLE[table.status] ?? STATUS_STYLE.Available;
              return (
                <View key={table.id} style={[styles.tableCard, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                  <View style={styles.tableCardHeader}>
                    <View>
                      <Text style={styles.tableName}>{table.name}</Text>
                      {table.tableNumber ? <Text style={styles.tableNum}>#{table.tableNumber}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.badge }]}>
                      <View style={[styles.dot, { backgroundColor: sc.dot }]} />
                      <Text style={[styles.badgeText, { color: sc.badgeText }]}>{table.status}</Text>
                    </View>
                  </View>
                  {table.activeSession && (
                    <View style={styles.activeInfo}>
                      {table.activeSession.customerName ? <Text style={styles.activeCustomer}>{table.activeSession.customerName}</Text> : null}
                      <Text style={styles.activeElapsed}>{elapsed(table.activeSession.startTime)} elapsed</Text>
                    </View>
                  )}
                  <View style={styles.tableCardFooter}>
                    {table.status === 'Available' && (
                      <TouchableOpacity style={styles.startBtn} onPress={() => { setStartTableId(table.id); setCustomerName(''); setNotes(''); }}>
                        <Text style={styles.startBtnText}>+ Start Session</Text>
                      </TouchableOpacity>
                    )}
                    {table.status === 'Occupied' && (
                      <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('SnookerSessions')}>
                        <Text style={styles.manageBtnText}>Manage Session</Text>
                      </TouchableOpacity>
                    )}
                    {table.status === 'Maintenance' && <Text style={styles.maintText}>🔧 Under maintenance</Text>}
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
                  <Text style={styles.sessionTable}>{s.tableName}</Text>
                  <Text style={styles.sessionCustomer}>{s.customerName ?? s.player1Name ?? '—'}</Text>
                </View>
                <Text style={styles.sessionElapsed}>{elapsed(s.startTime)}</Text>
                <TouchableOpacity style={styles.manageBtnSm} onPress={() => navigation.navigate('SnookerSessions')}>
                  <Text style={styles.manageBtnSmText}>Manage</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!startTableId} animationType="slide" transparent onRequestClose={() => setStartTableId(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Session</Text>
            <Text style={styles.label}>Table</Text>
            <Text style={styles.tableValue}>{startTable?.name ?? '—'}</Text>
            <Text style={styles.label}>Customer (optional)</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor="#999" />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor="#999" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStartTableId(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
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
