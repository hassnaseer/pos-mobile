import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const PERIODS = ['week', 'month', 'year'];

const useAnalytics = period =>
  useQuery({
    queryKey: ['advanced-analytics', period],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/reports/analytics?period=${period}`);
      return res?.data ?? res ?? null;
    },
  });

function StatCard({ label, value, change, color }) {
  const positive = change >= 0;
  return (
    <View style={styles.statCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={[styles.statChange, { color: positive ? '#16a34a' : '#dc2626' }]}>
          {positive ? '▲' : '▼'} {Math.abs(change)}% vs last month
        </Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: color }]} />
    </View>
  );
}

function BarChart({ data, title, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={{ gap: 10 }}>
        {data.map((d, i) => (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(d.value / max) * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.barValue}>{d.value.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AdvancedAnalyticsScreen() {
  const [period, setPeriod] = useState('month');
  const { data, isLoading, isFetching, refetch } = useAnalytics(period);

  const metrics = [
    { label: 'Total Revenue', value: data ? `$${(data.revenue ?? 0).toLocaleString()}` : '—', change: data?.revenueChange ?? 0, color: '#22C55E' },
    { label: 'Orders', value: data ? (data.orders ?? 0).toLocaleString() : '—', change: data?.ordersChange ?? 0, color: '#3B82F6' },
    { label: 'New Customers', value: data ? (data.newCustomers ?? 0).toLocaleString() : '—', change: data?.customersChange ?? 0, color: '#A855F7' },
    { label: 'Products Sold', value: data ? (data.productsSold ?? 0).toLocaleString() : '—', change: data?.productsChange ?? 0, color: '#F97316' },
  ];

  const revenueByMonth = data?.revenueByMonth ?? [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 0 }, { label: 'Jun', value: 0 },
  ];
  const topProducts = (data?.topProducts ?? []).map(p => ({ label: p.name, value: p.sold ?? p.revenue ?? 0 })).slice(0, 8);
  const salesByCategory = (data?.salesByCategory ?? []).map(c => ({ label: c.name, value: c.total ?? 0 })).slice(0, 6);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Advanced Analytics</Text>
        <Text style={styles.subHeading}>Deep business insights and performance trends</Text>
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          <View style={styles.statsGrid}>
            {metrics.map(m => <StatCard key={m.label} {...m} />)}
          </View>

          <BarChart data={revenueByMonth} title="Revenue by Period" color="#3B82F6" />
          {topProducts.length > 0 && <BarChart data={topProducts} title="Top Products" color="#A855F7" />}
          {salesByCategory.length > 0 && <BarChart data={salesByCategory} title="Sales by Category" color="#22C55E" />}

          {!data && (
            <Text style={styles.unavailable}>Analytics data unavailable — the backend endpoint may not be wired up yet.</Text>
          )}
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
  periodRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 12 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 7 },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  statValue: { fontSize: 19, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 3 },
  statChange: { fontSize: 10, fontFamily: 'Outfit-SemiBold', marginTop: 4 },
  statIcon: { width: 30, height: 30, borderRadius: 9 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  chartTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1f2937', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', width: 70 },
  barTrack: { flex: 1, height: 16, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#374151', width: 50, textAlign: 'right' },
  unavailable: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', fontSize: 13, marginTop: 20 },
});
