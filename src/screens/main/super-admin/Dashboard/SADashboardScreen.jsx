import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSADashboard } from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_TABS = ['Platform Earnings', 'Business Revenue'];
const STATUS_FILTERS = ['', 'Active', 'Trial', 'Expired', 'Blocked'];

const GREETING_KEY = 'sa_greeted';

const SADashboardScreen = () => {
  const { user } = useAuth();
  const { fmt, currency } = useCurrency();
  const [year, setYear]           = useState(new Date().getFullYear());
  const [chartTab, setChartTab]   = useState(0);
  const [showGreeting, setShowGreeting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: summary, isLoading, refetch } = useSADashboard({ year, status: statusFilter || undefined });

  useEffect(() => {
    AsyncStorage.getItem(GREETING_KEY).then(val => {
      if (!val) {
        setShowGreeting(true);
        AsyncStorage.setItem(GREETING_KEY, 'true');
      }
    });
  }, []);

  const chartData = chartTab === 0
    ? (summary?.monthlyRevenue ?? Array(12).fill(0))
    : (summary?.monthlyBusinessRevenue ?? Array(12).fill(0));
  const maxVal = Math.max(...chartData, 1);

  const subStatuses = [
    { label: 'Active',  count: summary?.activeSubscriptions ?? 0, color: '#22c55e' },
    { label: 'Trial',   count: summary?.trialBusinesses ?? 0,     color: '#3b82f6' },
    { label: 'Expired', count: summary?.expiredBusinesses ?? 0,   color: '#ef4444' },
    { label: 'Blocked', count: summary?.blockedBusinesses ?? 0,   color: '#9ca3af' },
  ];
  const subTotal = subStatuses.reduce((s, x) => s + x.count, 0) || 1;

  const statCards = [
    {
      label: 'Total Businesses',
      value: String(summary?.totalBusinesses ?? 0),
      sub: `+${summary?.newThisMonth ?? 0} this month`,
      sub2: 'new this month',
      color: '#3b82f6',
      icon: '🏢',
    },
    {
      label: 'Active Subscriptions',
      value: String(summary?.activeSubscriptions ?? 0),
      sub: 'paid plan, not expired',
      sub2: 'active rate',
      color: '#22c55e',
      icon: '✅',
    },
    {
      label: 'Trial Businesses',
      value: String(summary?.trialBusinesses ?? 0),
      sub: `${summary?.trialBusinesses ?? 0} expired`,
      sub2: 'on trial',
      color: '#f59e0b',
      icon: '⏳',
    },
    {
      label: 'Platform Earnings',
      value: fmt(summary?.platformEarnings ?? 0),
      sub: 'from subscription',
      sub2: 'paid to platform',
      color: '#22c55e',
      icon: '💰',
    },
    {
      label: 'Total Revenue',
      value: fmt(summary?.totalRevenue ?? 0),
      sub: 'all businesses',
      sub2: 'customer payments',
      color: '#06b6d4',
      icon: '💵',
    },
  ];

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* First-time greeting banner */}
      {showGreeting && (
        <View style={styles.greetingBanner}>
          <Text style={styles.greetingText}>
            👋 Welcome, {user?.name?.split(' ')[0] ?? 'Super Admin'}! You're logged in as Super Admin.
          </Text>
          <TouchableOpacity onPress={() => setShowGreeting(false)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.greetingClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filters ── */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map(s => (
            <TouchableOpacity
              key={s || 'all'}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s || 'All Status'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.currencyTag}>
          <Text style={styles.currencyText}>{currency ?? 'USD'}</Text>
        </View>
      </View>

      {/* ── Stat Cards ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {statCards.map(c => (
          <View key={c.label} style={[styles.statCard, { borderTopColor: c.color }]}>
            <Text style={styles.statIcon}>{c.icon}</Text>
            <View style={styles.statTrend}>
              <Text style={[styles.statTrendText, { color: c.color }]}>▲ 25%</Text>
            </View>
            <Text style={[styles.statValue, c.value.length > 6 && { fontSize: 18 }]}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
            <Text style={styles.statSub}>{c.sub} · <Text style={styles.statSub2}>{c.sub2}</Text></Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Monthly Revenue Chart ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Revenue</Text>
          <View style={styles.yearRow}>
            <TouchableOpacity onPress={() => setYear(y => y - 1)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.yearArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.yearText}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(y => y + 1)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.yearArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          {CHART_TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, chartTab === i && styles.tabActive]}
              onPress={() => setChartTab(i)}
            >
              <Text style={[styles.tabText, chartTab === i && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartArea}>
            {chartData.map((val, i) => {
              const barH = Math.max((val / maxVal) * 100, val > 0 ? 6 : 0);
              const barColor = chartTab === 0 ? '#22c55e' : '#3b82f6';
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barVal}>
                    {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)) : ''}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[styles.bar, { height: barH, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.barLabel}>{MONTHS[i]}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Subscription Status ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Status</Text>

        {subStatuses.map(s => {
          const pct = Math.round((s.count / subTotal) * 100);
          return (
            <View key={s.label} style={styles.subRow}>
              <Text style={styles.subLabel}>{s.label}</Text>
              <View style={styles.subBarBg}>
                <View style={[styles.subBar, { width: `${pct}%`, backgroundColor: s.color }]} />
              </View>
              <Text style={[styles.subPct, { color: s.color }]}>{pct}%</Text>
            </View>
          );
        })}

        <View style={styles.subCounts}>
          {subStatuses.map(s => (
            <View key={s.label} style={styles.subCountItem}>
              <Text style={[styles.subCountVal, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.subCountLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Recently Added Businesses ── */}
      <View style={[styles.section, { marginBottom: 24 }]}>
        <Text style={styles.sectionTitle}>Recently Added Businesses</Text>
        {(summary?.recentBusinesses ?? []).length === 0 && !isLoading && (
          <Text style={styles.empty}>No recent businesses.</Text>
        )}
        {(summary?.recentBusinesses ?? []).map(biz => {
          const dateStr = biz.createdAt ?? biz.signupDate;
          const label = biz.status === 'Trial' ? 'Trial started'
            : biz.status === 'Active' ? 'Active'
            : 'New signup';
          const statusColor = biz.status === 'Active' ? '#22c55e' : biz.status === 'Trial' ? '#f59e0b' : '#9ca3af';
          return (
            <View key={biz.id} style={styles.bizRow}>
              <View style={[styles.bizAvatar, { backgroundColor: statusColor }]}>
                <Text style={styles.bizAvatarText}>{(biz.name ?? 'B')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.bizInfo}>
                <Text style={styles.bizName}>{biz.name}</Text>
                <Text style={[styles.bizSub, { color: statusColor }]}>{label}</Text>
              </View>
              {dateStr ? (
                <Text style={styles.bizDate}>
                  {new Date(dateStr).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },

  greetingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12,
  },
  greetingText: { flex: 1, color: '#fff', fontFamily: 'Outfit-Medium', fontSize: 14 },
  greetingClose: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginLeft: 12 },

  // Stat cards
  cardsRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderTopWidth: 3, width: 160,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statTrend: { position: 'absolute', top: 12, right: 12 },
  statTrendText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  statValue: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 4 },
  statSub: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 3 },
  statSub2: { fontFamily: 'Outfit-Medium', color: '#6b7280' },

  // Section
  section: {
    marginHorizontal: 12, marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827' },

  // Year selector
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearArrow: { fontSize: 20, color: colors.primary, fontFamily: 'Outfit-Bold' },
  yearText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', minWidth: 40, textAlign: 'center' },

  // Chart tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e5e7eb',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  // Bar chart
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140, paddingBottom: 4 },
  barCol: { alignItems: 'center', width: 28 },
  barVal: { fontSize: 8, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 2, height: 12 },
  barBg: { width: 18, height: 100, justifyContent: 'flex-end', backgroundColor: '#f4f6f9', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },

  // Subscription status
  subRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  subLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', width: 60 },
  subBarBg: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  subBar: { height: '100%', borderRadius: 4 },
  subPct: { fontSize: 12, fontFamily: 'Outfit-SemiBold', width: 36, textAlign: 'right' },
  subCounts: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#f3f4f6' },
  subCountItem: { alignItems: 'center' },
  subCountVal: { fontSize: 20, fontFamily: 'Outfit-Bold' },
  subCountLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  // Recent businesses
  bizRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6', gap: 10 },
  bizAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bizAvatarText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit-Bold' },
  bizInfo: { flex: 1 },
  bizName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  bizSub: { fontSize: 11, fontFamily: 'Outfit-Regular', marginTop: 1 },
  bizDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', paddingVertical: 20 },

  filterWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', paddingRight: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, flex: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f4f6f9' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  filterChipTextActive: { color: '#fff' },
  currencyTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', marginLeft: 4 },
  currencyText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
});

export default SADashboardScreen;
