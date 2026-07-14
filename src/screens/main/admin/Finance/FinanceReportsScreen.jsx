import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BarChart, PieChart } from 'react-native-chart-kit';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const screenWidth = Dimensions.get('window').width;
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#ec4899'];

const DATE_MODES = [
  { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }, { label: 'All', value: 'all' },
];
const TAX_PERIODS = [
  { label: 'Last 30 Days', value: '30d' }, { label: 'Last 90 Days', value: '90d' },
  { label: 'This Year', value: '1y' }, { label: 'All Time', value: 'all' },
];
const STATUS_STYLE = {
  Planning: { bg: '#dbeafe', text: '#1d4ed8' }, Active: { bg: '#dcfce7', text: '#15803d' },
  'On Hold': { bg: '#fef9c3', text: '#a16207' }, Completed: { bg: '#f3f4f6', text: '#4b5563' }, Cancelled: { bg: '#fee2e2', text: '#b91c1c' },
};
const BUCKET_ORDER = ['0-30 days', '31-60 days', '61-90 days', '91-120 days', '120+ days'];
const BUCKET_COLOR = { '0-30 days': '#22c55e', '31-60 days': '#eab308', '61-90 days': '#f97316', '91-120 days': '#ef4444', '120+ days': '#b91c1c' };

const fmtDate = d => d.toISOString().slice(0, 10);
function getDateRange(mode) {
  const today = new Date();
  if (mode === 'all') return {};
  if (mode === 'daily') return { startDate: fmtDate(today), endDate: fmtDate(today) };
  if (mode === 'weekly') { const s = new Date(today); s.setDate(today.getDate() - today.getDay()); return { startDate: fmtDate(s), endDate: fmtDate(today) }; }
  if (mode === 'monthly') return { startDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, endDate: fmtDate(today) };
  if (mode === 'yearly') return { startDate: `${today.getFullYear()}-01-01`, endDate: fmtDate(today) };
  return {};
}

const useProjectsForReport = (startDate, endDate) =>
  useQuery({
    queryKey: ['finance-report-projects', startDate, endDate],
    queryFn: async () => {
      const qs = new URLSearchParams({ ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }).toString();
      const r = await apiClient.get(`/admin/projects${qs ? `?${qs}` : ''}`);
      return r?.data ?? r ?? [];
    },
  });
const useARAging = enabled => useQuery({ queryKey: ['ar-aging'], queryFn: async () => { const r = await apiClient.get('/admin/reports/ar-aging'); return r?.data ?? r ?? null; }, enabled });
const useTaxSummary = (period, enabled) => useQuery({ queryKey: ['tax-summary', period], queryFn: async () => { const r = await apiClient.get(`/admin/reports/tax-summary?period=${period}`); return r?.data ?? r ?? null; }, enabled });

export default function FinanceReportsScreen() {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const hasPerm = code => !user?.permissionCodes?.length || user.permissionCodes.includes(code);
  const canTeamOverview = hasPerm('view_team_overview') || hasPerm('manage_projects');
  const canARAging = hasPerm('view_ar_aging');
  const canTaxSummary = hasPerm('view_tax_summary');
  const canMilestones = hasPerm('manage_milestones');

  const [tab, setTab] = useState(canTeamOverview ? 'overview' : canARAging ? 'ar-aging' : 'tax');
  const [dateMode, setDateMode] = useState('all');
  const [taxPeriod, setTaxPeriod] = useState('30d');
  const { startDate, endDate } = useMemo(() => getDateRange(dateMode), [dateMode]);

  const { data: rawProjects = [], isLoading: projectsLoading, isFetching: projectsFetching, refetch: refetchProjects } = useProjectsForReport(startDate, endDate);
  const { data: arAging, isLoading: arLoading, isFetching: arFetching, refetch: refetchAr } = useARAging(canARAging && tab === 'ar-aging');
  const { data: taxSummary, isLoading: taxLoading, isFetching: taxFetching, refetch: refetchTax } = useTaxSummary(taxPeriod, canTaxSummary && tab === 'tax');

  const projects = Array.isArray(rawProjects) ? rawProjects : (rawProjects?.data ?? []);
  const bizRate = 1;

  const monthsActive = p => {
    const start = new Date(p.startDate ?? p.createdAt);
    const days = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(1, days / 30);
  };

  const overviewRows = projects.map(p => {
    const milestoneBonus = canMilestones && p.isMilestone ? (p.milestoneIncomeUSD ?? 0) : 0;
    const totalSales = (p.totalIncome ?? 0) + milestoneBonus;
    const totalGOGS = p.totalExpense ?? 0;
    const totalProfit = (p.profit ?? 0) + milestoneBonus;
    const roi = totalGOGS > 0 ? (totalProfit / totalGOGS) * 100 : null;
    const months = monthsActive(p);
    const revPlan = p.monthlyRevenuePlan ? parseFloat(p.monthlyRevenuePlan) / bizRate : totalSales / months;
    const profPlan = p.monthlyProfitPlan ? parseFloat(p.monthlyProfitPlan) / bizRate : totalProfit / months;
    return { p, totalSales, totalGOGS, totalProfit, roi, revPlan, profPlan };
  });
  const teamSales = overviewRows.reduce((s, r) => s + r.totalSales, 0);
  const teamProfit = overviewRows.reduce((s, r) => s + r.totalProfit, 0);
  const teamRevPlan = overviewRows.reduce((s, r) => s + (r.revPlan ?? 0), 0);
  const teamProfPlan = overviewRows.reduce((s, r) => s + (r.profPlan ?? 0), 0);

  const visibleTabs = [
    canTeamOverview && { key: 'overview', label: 'Team Overview' },
    canARAging && { key: 'ar-aging', label: 'AR Aging' },
    canTaxSummary && { key: 'tax', label: 'Tax Summary' },
  ].filter(Boolean);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Finance Reports</Text>
        <Text style={styles.subHeading}>{[canTeamOverview && 'Team overview', canARAging && 'AR aging', canTaxSummary && 'tax summary'].filter(Boolean).join(', ')}</Text>
        {visibleTabs.length > 0 && (
          <View style={styles.tabRow}>
            {visibleTabs.map(t => (
              <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {visibleTabs.length === 0 && <Text style={styles.noPerm}>You don't have permission to view any finance reports.</Text>}

      {tab === 'overview' && canTeamOverview && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={projectsFetching} onRefresh={refetchProjects} tintColor={colors.primary} />}
        >
          <View style={styles.periodRow}>
            {DATE_MODES.map(m => (
              <TouchableOpacity key={m.value} style={[styles.periodBtn, dateMode === m.value && styles.periodBtnActive]} onPress={() => setDateMode(m.value)}>
                <Text style={[styles.periodText, dateMode === m.value && styles.periodTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: '#eff6ff' }]}><Text style={styles.kpiLabel}>Monthly Sales Plan</Text><Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>{teamRevPlan > 0 ? fmt(teamRevPlan) : '—'}</Text></View>
            <View style={[styles.kpiCard, { backgroundColor: '#f5f3ff' }]}><Text style={styles.kpiLabel}>Monthly Profit Plan</Text><Text style={[styles.kpiValue, { color: '#6d28d9' }]}>{teamProfPlan > 0 ? fmt(teamProfPlan) : '—'}</Text></View>
            <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4' }]}><Text style={styles.kpiLabel}>Total Real Sales</Text><Text style={[styles.kpiValue, { color: '#15803d' }]}>{fmt(teamSales)}</Text></View>
            <View style={[styles.kpiCard, { backgroundColor: teamProfit >= 0 ? '#ecfdf5' : '#fef2f2' }]}><Text style={styles.kpiLabel}>Total Real Profit</Text><Text style={[styles.kpiValue, { color: teamProfit >= 0 ? '#047857' : '#b91c1c' }]}>{teamProfit >= 0 ? '+' : ''}{fmt(teamProfit)}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Per Store / Project Breakdown</Text>
          {projectsLoading ? <ActivityIndicator color={colors.primary} /> : overviewRows.length === 0 ? (
            <Text style={styles.empty}>No projects match the current filters.</Text>
          ) : overviewRows.map(({ p, totalSales, totalGOGS, totalProfit, roi }) => {
            const badge = STATUS_STYLE[p.status] ?? { bg: '#f3f4f6', text: '#374151' };
            return (
              <View key={p.id} style={styles.projectRow}>
                <View style={styles.projectRowTop}>
                  <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.text }]}>{p.status}</Text></View>
                </View>
                <View style={styles.projectStatsRow}>
                  <View style={styles.projectStat}><Text style={styles.projectStatLabel}>Sales</Text><Text style={[styles.projectStatValue, { color: '#15803d' }]}>{fmt(totalSales)}</Text></View>
                  <View style={styles.projectStat}><Text style={styles.projectStatLabel}>GOGS</Text><Text style={[styles.projectStatValue, { color: '#dc2626' }]}>{fmt(totalGOGS)}</Text></View>
                  <View style={styles.projectStat}><Text style={styles.projectStatLabel}>Profit</Text><Text style={[styles.projectStatValue, { color: totalProfit >= 0 ? '#047857' : '#dc2626' }]}>{totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}</Text></View>
                  <View style={styles.projectStat}><Text style={styles.projectStatLabel}>ROI</Text><Text style={styles.projectStatValue}>{roi != null ? `${roi.toFixed(1)}%` : '—'}</Text></View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {tab === 'ar-aging' && canARAging && (
        arLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : !arAging ? (
          <Text style={styles.empty}>Failed to load AR aging data.</Text>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={arFetching} onRefresh={refetchAr} tintColor={colors.primary} />}
          >
            {(() => {
              const rows = arAging.rows ?? [];
              const bucketAmounts = {}; const bucketCounts = {};
              rows.forEach(r => { bucketAmounts[r.bucket] = (bucketAmounts[r.bucket] ?? 0) + r.outstanding; bucketCounts[r.bucket] = (bucketCounts[r.bucket] ?? 0) + 1; });
              const summary = BUCKET_ORDER.map(label => ({ label, amount: bucketAmounts[label] ?? 0, count: bucketCounts[label] ?? 0 }));
              const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
              return (
                <>
                  <View style={styles.bucketGrid}>
                    {summary.map(b => (
                      <View key={b.label} style={[styles.bucketCard, { backgroundColor: BUCKET_COLOR[b.label] }]}>
                        <Text style={styles.bucketLabel}>{b.label}</Text>
                        <Text style={styles.bucketAmount}>{fmt(b.amount)}</Text>
                        <Text style={styles.bucketCount}>{b.count} entr{b.count !== 1 ? 'ies' : 'y'}</Text>
                      </View>
                    ))}
                  </View>
                  {summary.some(b => b.amount > 0) && (
                    <View style={styles.chartCard}>
                      <Text style={styles.sectionTitle}>Outstanding by Aging Bucket</Text>
                      <BarChart
                        data={{ labels: summary.map(b => b.label.replace(' days', 'd')), datasets: [{ data: summary.map(b => b.amount) }] }}
                        width={screenWidth - 64} height={200} fromZero yAxisLabel="" yAxisSuffix=""
                        chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#ef4444', labelColor: () => '#6b7280', barPercentage: 0.6 }}
                        style={{ borderRadius: 12, marginLeft: -16 }}
                      />
                    </View>
                  )}
                  <View style={styles.totalOutstandingCard}>
                    <Text style={styles.totalOutstandingLabel}>Total Outstanding</Text>
                    <Text style={styles.totalOutstandingValue}>{fmt(totalOutstanding)}</Text>
                  </View>
                  {rows.length === 0 ? <Text style={styles.empty}>No outstanding entries.</Text> : rows.map(row => (
                    <View key={row.id} style={styles.arRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.arProject} numberOfLines={1}>{row.projectName ?? '—'} — {row.title}</Text>
                        <Text style={styles.arSub}>{row.incomeDate ? new Date(row.incomeDate).toLocaleDateString() : '—'} · {row.daysOld > 0 ? `${row.daysOld}d old` : 'Today'} · {row.bucket}</Text>
                      </View>
                      <Text style={styles.arOutstanding}>{fmt(row.outstanding)}</Text>
                    </View>
                  ))}
                </>
              );
            })()}
          </ScrollView>
        )
      )}

      {tab === 'tax' && canTaxSummary && (
        <View style={{ flex: 1 }}>
          <View style={styles.taxPeriodRow}>
            {TAX_PERIODS.map(p => (
              <TouchableOpacity key={p.value} style={[styles.periodBtn, taxPeriod === p.value && styles.periodBtnActive]} onPress={() => setTaxPeriod(p.value)}>
                <Text style={[styles.periodText, taxPeriod === p.value && styles.periodTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {taxLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : !taxSummary ? (
            <Text style={styles.empty}>Failed to load tax summary data.</Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={taxFetching} onRefresh={refetchTax} tintColor={colors.primary} />}
            >
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { backgroundColor: '#eff6ff' }]}><Text style={styles.kpiLabel}>Total Tax Collected</Text><Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>{fmt(taxSummary.totalTaxCollected ?? 0)}</Text></View>
                <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Taxable Revenue</Text><Text style={styles.kpiValue}>{fmt(taxSummary.taxableRevenue ?? 0)}</Text></View>
                <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Effective Tax Rate</Text><Text style={styles.kpiValue}>{(taxSummary.effectiveRate ?? 0).toFixed(2)}%</Text></View>
              </View>
              {(taxSummary.byTaxName ?? []).length > 1 && (
                <View style={styles.chartCard}>
                  <Text style={styles.sectionTitle}>Tax Collected by Type</Text>
                  <PieChart
                    data={taxSummary.byTaxName.map((row, i) => ({ name: row.name, population: row.total, color: PIE_COLORS[i % PIE_COLORS.length], legendFontColor: '#4b5563', legendFontSize: 11 }))}
                    width={screenWidth - 64} height={200}
                    chartConfig={{ color: () => '#000' }}
                    accessor="population" backgroundColor="transparent" paddingLeft="8"
                  />
                </View>
              )}
              {(taxSummary.byTaxName ?? []).length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.sectionTitle}>By Tax Type</Text>
                  {taxSummary.byTaxName.map(row => (
                    <View key={row.name} style={styles.taxRow}>
                      <Text style={styles.taxName}>{row.name}</Text>
                      <Text style={styles.taxCount}>{row.count}×</Text>
                      <Text style={styles.taxTotal}>{fmt(row.total)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(taxSummary.byMonth ?? []).length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.sectionTitle}>Monthly Tax Collected</Text>
                  {taxSummary.byMonth.map(row => (
                    <View key={row.month} style={styles.taxRow}>
                      <Text style={styles.taxName}>{row.month}</Text>
                      <Text style={styles.taxTotal}>{fmt(row.total)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!(taxSummary.byTaxName?.length) && !(taxSummary.byMonth?.length) && <Text style={styles.empty}>No tax data for this period.</Text>}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 3, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  tabTextActive: { color: '#111827', fontFamily: 'Outfit-SemiBold' },
  noPerm: { textAlign: 'center', color: '#a16207', backgroundColor: '#fefce8', margin: 16, padding: 20, borderRadius: 12, fontFamily: 'Outfit-Medium' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  taxPeriodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 16, paddingBottom: 0 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  periodTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  kpiLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  kpiValue: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 4, marginBottom: 4 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 20 },
  projectRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  projectRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectName: { flex: 1, fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  projectStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  projectStat: { alignItems: 'center', flex: 1 },
  projectStatLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  projectStatValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bucketCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  bucketLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.85)' },
  bucketAmount: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#fff', marginTop: 4 },
  bucketCount: { fontSize: 10, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  totalOutstandingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 14 },
  totalOutstandingLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#b91c1c' },
  totalOutstandingValue: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#b91c1c' },
  arRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  arProject: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  arSub: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  arOutstanding: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#dc2626' },
  listCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  taxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderColor: '#f3f4f6' },
  taxName: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  taxCount: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  taxTotal: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
});
