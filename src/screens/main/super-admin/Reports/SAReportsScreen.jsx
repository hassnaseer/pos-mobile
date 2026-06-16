import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSARevenueReports } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PERIODS = [
  { key: 'monthly',   label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly',    label: 'Yearly' },
];

const SAReportsScreen = () => {
  const { fmt } = useCurrency();
  const [period, setPeriod] = useState('monthly');
  const [year, setYear]     = useState(new Date().getFullYear());

  const { data, isLoading, refetch } = useSARevenueReports({ period, year });

  const trend         = data?.trend ?? [];
  const byBusinessType = data?.byBusinessType ?? [];

  // Compute summary from trend
  const revenues   = trend.map(t => Number(t.revenue) || 0);
  const totalRev   = revenues.reduce((a, b) => a + b, 0);
  const avgRev     = revenues.length ? totalRev / revenues.filter(v => v > 0).length || 0 : 0;
  const maxRev     = revenues.length ? Math.max(...revenues) : 0;
  const maxBarVal  = Math.max(...revenues, 1);
  const totalBiz   = trend.reduce((a, t) => a + (t.businesses || 0), 0);

  const statCards = [
    { label: 'Total Revenue',  value: fmt(totalRev), color: '#22c55e', sub: 'Selected period' },
    { label: 'Average',        value: fmt(avgRev),   color: '#3b82f6', sub: `Per ${period === 'monthly' ? 'month' : period}` },
    { label: 'Peak Revenue',   value: fmt(maxRev),   color: '#f59e0b', sub: 'Highest in period' },
    { label: 'Businesses',     value: String(totalBiz || 0), color: '#8b5cf6', sub: 'Active in period' },
  ];

  const totalByTypePct = byBusinessType.reduce((a, b) => a + (b.percentage || 0), 0) || 1;

  return (
    <View style={styles.root}>
      {/* Filters */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.chip, period === p.key && styles.chipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

      {isLoading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Stat Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {statCards.map(s => (
                <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statSub}>{s.sub}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Revenue Trend Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartArea}>
                  {trend.map((t, i) => {
                    const val = Number(t.revenue) || 0;
                    const barH = Math.max((val / maxBarVal) * 100, val > 0 ? 6 : 0);
                    return (
                      <View key={i} style={styles.barCol}>
                        <Text style={styles.barVal}>
                          {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)) : ''}
                        </Text>
                        <View style={styles.barBg}>
                          <View style={[styles.bar, { height: barH }]} />
                        </View>
                        <Text style={styles.barLabel}>{t.period ?? MONTHS[i] ?? ''}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Revenue by Business Type */}
            {byBusinessType.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revenue by Business Type</Text>
                {byBusinessType.map((bt, i) => {
                  const pct = Math.round(bt.percentage ?? (bt.revenue / (byBusinessType.reduce((a,b)=>a+b.revenue,0)||1)) * 100);
                  return (
                    <View key={i} style={styles.typeRow}>
                      <View style={styles.typeInfo}>
                        <Text style={styles.typeName}>{bt.type ?? '—'}</Text>
                        <Text style={styles.typeSub}>{bt.businesses ?? 0} businesses</Text>
                        <View style={styles.typeBarBg}>
                          <View style={[styles.typeBar, { width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                        </View>
                      </View>
                      <View style={styles.typeRight}>
                        <Text style={styles.typeRevenue}>{fmt(bt.revenue)}</Text>
                        <Text style={styles.typePct}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Monthly Table */}
            {trend.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                <View style={styles.tableHead}>
                  {['Period', 'Revenue', 'Biz', 'New', 'Growth'].map(h => (
                    <Text key={h} style={styles.thCell}>{h}</Text>
                  ))}
                </View>
                {trend.map((t, i) => {
                  const growth = Number(t.growth);
                  const growthColor = growth > 0 ? '#22c55e' : growth < 0 ? '#ef4444' : '#9ca3af';
                  const growthStr = growth === 0 ? '—' : `${growth > 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}%`;
                  return (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <Text style={styles.tdCell}>{t.period ?? MONTHS[i] ?? ''}</Text>
                      <Text style={[styles.tdCell, { color: '#22c55e', fontFamily: 'Outfit-SemiBold' }]}>{fmt(t.revenue)}</Text>
                      <Text style={styles.tdCell}>{t.businesses ?? 0}</Text>
                      <Text style={[styles.tdCell, { color: colors.primary }]}>{t.newBusinesses ?? 0}</Text>
                      <Text style={[styles.tdCell, { color: growthColor }]}>{growthStr}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {trend.length === 0 && !isLoading && (
              <Text style={styles.empty}>No report data for this period.</Text>
            )}
          </ScrollView>
        )
      }
    </View>
  );
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, flex: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  yearRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, gap: 6 },
  yearArrow: { fontSize: 20, color: colors.primary, fontFamily: 'Outfit-Bold' },
  yearText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', minWidth: 38, textAlign: 'center' },
  // Cards
  cardsRow: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderTopWidth: 3, width: 150, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  statValue: { fontSize: 20, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  statSub: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  // Section
  section: { marginHorizontal: 12, marginTop: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 12 },
  // Bar chart
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140, paddingBottom: 4 },
  barCol: { alignItems: 'center', width: 32 },
  barVal: { fontSize: 8, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 2, height: 12 },
  barBg: { width: 20, height: 100, justifyContent: 'flex-end', backgroundColor: '#f4f6f9', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4, backgroundColor: '#3b82f6' },
  barLabel: { fontSize: 9, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  // Business type breakdown
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 1 },
  typeSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 4 },
  typeBarBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  typeBar: { height: '100%', borderRadius: 3 },
  typeRight: { alignItems: 'flex-end' },
  typeRevenue: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827' },
  typePct: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  // Table
  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: '#f3f4f6', marginBottom: 4 },
  thCell: { flex: 1, fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tdCell: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Regular', color: '#374151' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40, fontSize: 14 },
});

export default SAReportsScreen;
