import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import {
  useDashboardReport, useOrders, useProducts, useTickets,
} from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const PERIODS = [
  { value: '7d',  label: '7D'  },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y',  label: '1Y'  },
  { value: 'all', label: 'All' },
];

const PERIOD_LABELS = {
  '7d':  'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  '1y':  'Last Year',
  all:   'All Time',
};

const StatCard = ({ label, value, sub, color = colors.primary }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardValue}>{value ?? '—'}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
    {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
  </View>
);

const DashboardScreen = () => {
  const { user } = useAuth();
  const { fmt }  = useCurrency();
  const [period, setPeriod] = useState('7d');

  const { data: report = {}, isLoading: reportLoading, refetch: refetchReport } = useDashboardReport(period);
  const { data: rawOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders({ page: 1, limit: 4 });
  const { data: rawProducts = [] } = useProducts({ limit: 100 });
  const { data: rawTickets = [] }  = useTickets({ limit: 1, status: 'New' });

  const orders   = Array.isArray(rawOrders)   ? rawOrders   : (rawOrders?.data   ?? []);
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data ?? []);
  const ticketTotal = rawTickets?.total ?? (Array.isArray(rawTickets) ? rawTickets.length : 0);
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold ?? 10)).length;
  const topProducts = report?.topProducts ?? [];

  const isLoading = reportLoading || ordersLoading;
  const refetchAll = () => { refetchReport(); refetchOrders(); };

  const periodLabel = PERIOD_LABELS[period];

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor={colors.primary} />}
    >
      {/* Welcome header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'User'}</Text>
        <Text style={styles.subGreeting}>Here's your business overview for today</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        <Text style={styles.periodLabel}>Showing: <Text style={styles.periodLabelBold}>{periodLabel}</Text></Text>
        <View style={styles.periodPills}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.pill, period === p.value && styles.pillActive]}
              onPress={() => setPeriod(p.value)}
            >
              <Text style={[styles.pillText, period === p.value && styles.pillTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stat cards */}
      {reportLoading && !report?.totalRevenue ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.grid}>
          <StatCard
            label="Revenue"
            value={fmt((report?.totalRevenue ?? 0) + (report?.ticketRevenue ?? 0))}
            sub={periodLabel}
            color="#22c55e"
          />
          <StatCard
            label="Orders"
            value={report?.totalOrders ?? 0}
            sub={periodLabel}
            color={colors.primary}
          />
          <StatCard
            label="Open Tickets"
            value={ticketTotal}
            sub="currently pending"
            color="#f97316"
          />
          <StatCard
            label="Low Stock"
            value={lowStockCount}
            sub="below threshold"
            color={colors.warning}
          />
        </View>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products</Text>
          {topProducts.map((p, i) => (
            <View key={p.id ?? i} style={styles.topProductRow}>
              <View style={styles.topRank}>
                <Text style={styles.topRankText}>{i + 1}</Text>
              </View>
              <View style={styles.topInfo}>
                <Text style={styles.topName}>{p.name}</Text>
                <Text style={styles.topSub}>{p.qty} sold</Text>
              </View>
              <Text style={styles.topRevenue}>{fmt(p.revenue ?? 0)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {ordersLoading && orders.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>No recent orders.</Text>
        ) : (
          orders.slice(0, 4).map(o => (
            <View key={o.id} style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderNum}>{o.orderNumber ?? `#${o.id}`}</Text>
                <Text style={styles.orderCustomer}>{o.customer?.name ?? 'Walk-in'}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>{fmt(o.totalAmount ?? 0)}</Text>
                <View style={[styles.orderBadge, { backgroundColor: statusBg(o.status) }]}>
                  <Text style={[styles.orderBadgeText, { color: statusColor(o.status) }]}>{o.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {user?.isTrialExpired && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>Your trial has expired. Please upgrade to continue using all features.</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const statusBg = s => {
  switch ((s ?? '').toLowerCase()) {
    case 'completed': return '#dcfce7';
    case 'pending':   return '#fef3c7';
    case 'cancelled': return '#fee2e2';
    default:          return '#f0f0f0';
  }
};
const statusColor = s => {
  switch ((s ?? '').toLowerCase()) {
    case 'completed': return '#16a34a';
    case 'pending':   return '#d97706';
    case 'cancelled': return '#dc2626';
    default:          return '#6b7280';
  }
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#fff' },
  subGreeting: { fontSize: 13, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  periodLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  periodLabelBold: { fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  periodPills: { flexDirection: 'row', gap: 4, backgroundColor: '#fff', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#eee' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  pillActive: { backgroundColor: colors.primary },
  pillText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  pillTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 4, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardValue: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 2 },
  cardLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  cardSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 12 },
  topProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5', gap: 10 },
  topRank: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EBF0F5', alignItems: 'center', justifyContent: 'center' },
  topRankText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: colors.primary },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack },
  topSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  topRevenue: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#22c55e' },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  orderInfo: { flex: 1 },
  orderNum: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  orderCustomer: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  orderBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  orderBadgeText: { fontSize: 11, fontFamily: 'Outfit-Medium' },
  emptyText: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', paddingVertical: 16 },
  trialBanner: { margin: 16, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F59E0B' },
  trialText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#92400E', lineHeight: 20 },
});

export default DashboardScreen;
