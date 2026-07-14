import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  Active:   { bg: '#d1fae5', text: '#065f46' },
  Inactive: { bg: '#f3f4f6', text: '#6b7280' },
  Trial:    { bg: '#fef9c3', text: '#a16207' },
  Expired:  { bg: '#fee2e2', text: '#b91c1c' },
};

const useConsolidatedBranches = () =>
  useQuery({
    queryKey: ['branches-consolidated'],
    queryFn: async () => { const res = await apiClient.get('/admin/branches/consolidated'); return res?.data ?? res ?? []; },
  });

function BranchCard({ b, fmt, totalRevenue }) {
  const share = totalRevenue > 0 ? ((b.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
  const badge = STATUS_STYLE[b.status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <View style={styles.branchCard}>
      <View style={styles.branchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{b.name}</Text>
          {b.email ? <Text style={styles.branchEmail}>{b.email}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{b.status}</Text>
        </View>
      </View>

      <View style={styles.revenueBox}>
        <View>
          <Text style={styles.revenueLabel}>Revenue</Text>
          <Text style={styles.revenueValue}>{fmt(b.revenue)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.shareLabel}>Share</Text>
          <Text style={styles.shareValue}>{share}%</Text>
        </View>
      </View>
      <View style={styles.shareTrack}><View style={[styles.shareFill, { width: `${share}%` }]} /></View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}><Text style={styles.statPillValue}>{b.orders}</Text><Text style={styles.statPillLabel}>Orders</Text></View>
        <View style={styles.statPill}><Text style={styles.statPillValue}>{b.staff}</Text><Text style={styles.statPillLabel}>Staff</Text></View>
        <View style={styles.statPill}><Text style={styles.statPillValue}>{b.products}</Text><Text style={styles.statPillLabel}>Products</Text></View>
      </View>
    </View>
  );
}

export default function MultiBranchViewScreen() {
  const { fmt } = useCurrency();
  const { data: raw = [], isLoading, isFetching, refetch } = useConsolidatedBranches();
  const branches = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const totals = branches.reduce((acc, b) => ({
    revenue: acc.revenue + (b.revenue ?? 0), orders: acc.orders + (b.orders ?? 0), staff: acc.staff + (b.staff ?? 0),
  }), { revenue: 0, orders: 0, staff: 0 });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Multi-Branch View</Text>
        <Text style={styles.subHeading}>Performance breakdown by branch</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : branches.length === 0 ? (
        <Text style={styles.empty}>No branches found.</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total Branches</Text><Text style={styles.summaryValue}>{branches.length}</Text></View>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total Revenue</Text><Text style={styles.summaryValue}>{fmt(totals.revenue)}</Text></View>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total Orders</Text><Text style={styles.summaryValue}>{totals.orders}</Text></View>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Total Staff</Text><Text style={styles.summaryValue}>{totals.staff}</Text></View>
          </View>

          {branches.map(b => <BranchCard key={b.id} b={b} fmt={fmt} totalRevenue={totals.revenue} />)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  summaryValue: { fontSize: 19, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 3 },
  branchCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  branchHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  branchName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  branchEmail: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  revenueBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 10 },
  revenueLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#16a34a' },
  revenueValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#15803d', marginTop: 2 },
  shareLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  shareValue: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 2 },
  shareTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  shareFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 999 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, paddingVertical: 8 },
  statPillValue: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827' },
  statPillLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
});
