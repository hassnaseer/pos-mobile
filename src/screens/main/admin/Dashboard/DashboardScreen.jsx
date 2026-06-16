import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity, Dimensions,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import {
  useDashboardReport, useOrders, useProducts, useTickets, useStaff,
} from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 48;
const CHART_H = 100;

const PERIODS = [
  { value: '7d',  label: '7D'  },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y',  label: '1Y'  },
  { value: 'all', label: 'All' },
];

const PERIOD_LABEL = {
  '7d': 'Last 7 days', '30d': 'Last 30 days',
  '90d': 'Last 90 days', '1y': 'Last year', all: 'All time',
};

const Sparkline = ({ data = [], color = colors.primary }) => {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => (typeof d === 'object' ? (d.revenue ?? d.amount ?? d.value ?? 0) : d));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = CHART_W / (vals.length - 1);
  const points = vals.map((v, i) => {
    const x = i * step;
    const y = CHART_H - ((v - min) / range) * (CHART_H - 16) - 8;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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

const DashboardScreen = () => {
  const { user } = useAuth();
  const { fmt }  = useCurrency();
  const navigation = useNavigation();
  const [period, setPeriod] = useState('7d');

  const hasPOS     = !!user?.permissionCodes?.includes('pos_sales');
  const hasTickets = !!user?.permissionCodes?.includes('create_tickets');

  const { data: report = {}, isLoading: reportLoading, refetch: refetchReport } = useDashboardReport(period);
  const { data: rawOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders({ page: 1, limit: 4 });
  const { data: rawProducts = [] } = useProducts({ limit: 100 });
  const { data: rawTickets = [] }  = useTickets({ limit: 1, status: 'New' });
  const { data: rawStaff = [] }    = useStaff();

  const orders      = Array.isArray(rawOrders)   ? rawOrders   : (rawOrders?.data   ?? []);
  const products    = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data ?? []);
  const staffList   = Array.isArray(rawStaff)    ? rawStaff    : (rawStaff?.data    ?? []);
  const ticketTotal = rawTickets?.total ?? (Array.isArray(rawTickets) ? rawTickets.length : 0);

  const lowStockCount  = products.filter(p => p.stock <= (p.lowStockThreshold ?? 10)).length;
  const topProducts    = report?.topProducts ?? [];
  const salesChartData = report?.revenueByDay ?? report?.salesByDay ?? report?.salesChart ?? report?.dailySales ?? [];

  const totalRevenue  = (report?.totalRevenue ?? 0) + (report?.ticketRevenue ?? 0);
  const revenueChange = report?.revenueChangePercent ?? report?.revenueChange ?? null;
  const ordersChange  = report?.ordersChangePercent  ?? report?.ordersChange  ?? null;

  const isLoading = reportLoading || ordersLoading;
  const refetchAll = () => { refetchReport(); refetchOrders(); };

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.heading}>Dashboard</Text>
            <Text style={styles.subHeading}>
              Hello, {user?.name?.split(' ')[0] ?? 'User'} · {user?.businessName ?? ''}
            </Text>
          </View>
          <View style={styles.quickActions}>
            {hasPOS && (
              <TouchableOpacity style={styles.qaBtnPrimary} onPress={() => navigation.navigate('POS')}>
                <Text style={styles.qaBtnPrimaryText}>New Sale</Text>
              </TouchableOpacity>
            )}
            {hasTickets && (
              <TouchableOpacity style={styles.qaBtnOutline} onPress={() => navigation.navigate('Tickets')}>
                <Text style={styles.qaBtnOutlineText}>New Ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Period pills */}
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

      {reportLoading && !report?.totalRevenue ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <>
          {/* ── Stat cards row 1 ── */}
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.cardPrimary]}>
              <Text style={styles.cardLabelLight}>Total Sales</Text>
              <Text style={styles.cardValueLight}>{fmt(totalRevenue)}</Text>
              {revenueChange !== null && (
                <View style={styles.changeChipLight}>
                  <Text style={styles.changeChipTextLight}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardsCol}>
              {hasPOS && (
                <View style={styles.cardSm}>
                  <Text style={styles.cardLabelSm}>Total Orders</Text>
                  <Text style={styles.cardValueSm}>{report?.totalOrders ?? 0}</Text>
                  {ordersChange !== null && (
                    <View style={[styles.changeChip, { backgroundColor: ordersChange >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={[styles.changeChipText, { color: ordersChange >= 0 ? '#16a34a' : '#dc2626' }]}>
                        {ordersChange >= 0 ? '+' : ''}{ordersChange}%
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={[styles.cardSm, !hasPOS && { flex: 1 }]}>
                <Text style={styles.cardLabelSm}>Total Customers</Text>
                <Text style={styles.cardValueSm}>{report?.totalCustomers ?? 0}</Text>
              </View>
            </View>
          </View>

          {/* ── Secondary stat row ── */}
          <View style={styles.statRowContainer}>
            {hasTickets && (
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>Open Tickets</Text>
                <Text style={styles.statCardValue}>{ticketTotal}</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Low Stock</Text>
              <Text style={[styles.statCardValue, lowStockCount > 0 && { color: '#ef4444' }]}>{lowStockCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Products</Text>
              <Text style={styles.statCardValue}>{products.length}</Text>
            </View>
          </View>

          {/* ── Sales Overview chart ── */}
          {salesChartData.length > 1 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sales Overview</Text>
                <Text style={styles.sectionSub}>{PERIOD_LABEL[period] ?? period}</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Sparkline data={salesChartData} color={colors.primary} />
              </View>
              <Text style={styles.chartPeak}>{fmt(Math.max(...salesChartData.map(d => typeof d === 'object' ? (d.revenue ?? d.amount ?? 0) : d)))}</Text>
            </View>
          )}

          {/* ── Staff Activity ── */}
          {staffList.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Staff</Text>
                <Text style={styles.sectionSub}>{staffList.length} total</Text>
              </View>
              {staffList.slice(0, 6).map((s, i) => {
                const initial = (s.fullName ?? s.name ?? '?')[0].toUpperCase();
                const role    = s.role ?? s.roleName ?? '';
                return (
                  <View key={s.id ?? i} style={styles.listRow}>
                    <View style={styles.avatarBubble}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{s.fullName ?? s.name ?? '—'}</Text>
                      {!!role && <Text style={styles.listSub}>{role}</Text>}
                    </View>
                    <View style={[styles.activeBadge, { backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={[styles.activeBadgeText, { color: s.isActive ? '#16a34a' : '#dc2626' }]}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Staff')}>
                <Text style={styles.viewAllText}>View All Staff</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Top Products ── */}
          {topProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Products</Text>
              {topProducts.map((p, i) => (
                <View key={p.id ?? i} style={styles.listRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.listSub}>{p.qty ?? 0} sold</Text>
                  </View>
                  <Text style={styles.listAmount}>{fmt(p.revenue ?? 0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Recent Orders ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {ordersLoading && orders.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>No recent orders.</Text>
            ) : (
              orders.slice(0, 4).map(o => (
                <View key={o.id} style={styles.listRow}>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{o.orderNumber ?? `#${o.id}`}</Text>
                    <Text style={styles.listSub}>{o.customer?.name ?? 'Walk-in'}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.listAmount}>{fmt(o.totalAmount ?? 0)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(o.status) }]}>
                      <Text style={[styles.statusText, { color: statusColor(o.status) }]}>{o.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {user?.isTrialExpired && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>Your trial has expired. Please upgrade to continue using all features.</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f9fc' },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heading: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  quickActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  qaBtnPrimary: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  qaBtnPrimaryText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  qaBtnOutline: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  qaBtnOutlineText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },

  periodPills: { flexDirection: 'row', gap: 4, marginTop: 12, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4, alignSelf: 'flex-start' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pillActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  pillText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#9ca3af' },
  pillTextActive: { color: '#111827', fontFamily: 'Outfit-SemiBold' },

  cardRow: { flexDirection: 'row', padding: 16, gap: 12 },
  cardPrimary: {
    flex: 1.4, backgroundColor: colors.primary, borderRadius: 16, padding: 18,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  card: { borderRadius: 16, padding: 18 },
  cardLabelLight: { fontSize: 13, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)' },
  cardValueLight: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#fff', marginTop: 6, marginBottom: 8 },
  changeChipLight: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  changeChipTextLight: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  cardsCol: { flex: 1, gap: 12 },
  cardSm: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabelSm: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  cardValueSm: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 4, marginBottom: 4 },
  changeChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  changeChipText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },

  statRowContainer: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
  statCardLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center' },
  statCardValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 2 },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  sectionSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  chartPeak: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 4 },

  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5', gap: 10 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: colors.primary },
  listInfo: { flex: 1 },
  listName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  listSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  listAmount: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontFamily: 'Outfit-Medium' },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', paddingVertical: 16 },

  avatarBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  activeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  viewAllBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' },
  viewAllText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  trialBanner: { margin: 16, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F59E0B' },
  trialText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#92400E', lineHeight: 20 },
});

export default DashboardScreen;
