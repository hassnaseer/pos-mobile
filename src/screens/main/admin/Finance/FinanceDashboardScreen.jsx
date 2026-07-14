import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const screenWidth = Dimensions.get('window').width;

// Mirrors web's shared PeriodFilter (frontend/src/app/components/shared/PeriodFilter.tsx)
const DATE_MODES = [
  { label: 'Today', sub: 'today', value: 'daily' },
  { label: 'This Week', sub: 'this week', value: 'weekly' },
  { label: 'This Month', sub: 'this month', value: 'monthly' },
  { label: 'This Year', sub: 'this year', value: 'yearly' },
  { label: 'All Time', sub: 'all time', value: 'all' },
  { label: 'Custom', sub: 'this period', value: 'custom' },
];

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);

const fmtDate = d => d.toISOString().slice(0, 10);
function getDateRange(mode, customStart, customEnd) {
  const today = new Date();
  if (mode === 'all') return { startDate: '1970-01-01', endDate: fmtDate(today) };
  if (mode === 'custom') {
    if (!customStart && !customEnd) return { startDate: '1970-01-01', endDate: fmtDate(today) };
    return { startDate: customStart || undefined, endDate: customEnd || undefined };
  }
  if (mode === 'daily') return { startDate: fmtDate(today), endDate: fmtDate(today) };
  if (mode === 'weekly') {
    const start = new Date(today); start.setDate(today.getDate() - 6);
    return { startDate: fmtDate(start), endDate: fmtDate(today) };
  }
  if (mode === 'monthly') {
    const start = new Date(today); start.setDate(today.getDate() - 29);
    return { startDate: fmtDate(start), endDate: fmtDate(today) };
  }
  if (mode === 'yearly') return { startDate: `${today.getFullYear()}-01-01`, endDate: fmtDate(today) };
  return {};
}

const useFinanceDashboardStats = (startDate, endDate) =>
  useQuery({
    queryKey: ['finance-dashboard-stats', startDate, endDate],
    queryFn: async () => {
      const qs = new URLSearchParams({ ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }).toString();
      const res = await apiClient.get(`/admin/finance-dashboard/stats${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? null;
    },
  });

const useSalaryTrend = () =>
  useQuery({
    queryKey: ['finance-salary-trend'],
    queryFn: async () => { const res = await apiClient.get('/admin/finance-dashboard/salary-trend'); return res?.data ?? res ?? { included: false, data: [] }; },
  });

const useClientInvoiceSummary = enabled =>
  useQuery({
    queryKey: ['client-invoice-summary'],
    queryFn: async () => { const res = await apiClient.get('/admin/project-clients/invoice-summary'); return res?.data ?? res ?? null; },
    enabled,
  });

function KpiCard({ label, value, sub, color }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: color }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

const QUICK_LINKS = [
  { route: 'Projects', label: 'Projects', color: '#7c3aed', perm: null },
  { route: 'Budgets', label: 'Budgets', color: '#2563eb', perm: null },
  { route: 'Expenses', label: 'Expenses', color: '#d97706', perm: null },
  { route: 'ExpenseCategories', label: 'Categories', color: '#0d9488', perm: null },
  { route: 'SupplierBills', label: 'Supplier Bills', color: '#dc2626', perm: 'manage_supplier_bills' },
  { route: 'Suppliers', label: 'Suppliers', color: '#4b5563', perm: 'manage_suppliers' },
];

export default function FinanceDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currency: bizCurrency, rates } = useCurrency();
  const [dateMode, setDateMode] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState(bizCurrency);
  const { startDate, endDate } = useMemo(() => getDateRange(dateMode, customStart, customEnd), [dateMode, customStart, customEnd]);
  const { data: stats, isLoading, isFetching, refetch } = useFinanceDashboardStats(startDate, endDate);

  // Values returned by /admin/finance-dashboard/stats are USD-denominated —
  // convert to the selected display currency the same way web's dashFmt does.
  const fmt = usdAmt => {
    const displayAmt = (usdAmt ?? 0) * (rates?.[displayCurrency] ?? 1);
    const sym = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency + ' ';
    return `${sym}${displayAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const hasPerm = code => !user?.permissionCodes?.length || user.permissionCodes.includes(code);
  const canSeeBills = hasPerm('manage_supplier_bills');
  const canMilestones = hasPerm('manage_milestones');
  const canCompanyEarnings = hasPerm('manage_projects');
  const canClientInvoice = hasPerm('client_invoice');
  const showNetAvailable = hasPerm('manage_payroll');
  const showTransport = hasPerm('manage_transport');

  const { data: clientInvoice } = useClientInvoiceSummary(canClientInvoice);
  const { data: salaryTrend } = useSalaryTrend();

  const clientInvoiceTotals = useMemo(() => {
    if (!clientInvoice?.byCurrency) return { paid: 0, pending: 0 };
    return Object.values(clientInvoice.byCurrency).reduce(
      (acc, amounts) => ({ paid: acc.paid + (amounts.paid ?? 0), pending: acc.pending + (amounts.pending ?? 0) }),
      { paid: 0, pending: 0 },
    );
  }, [clientInvoice]);

  if (isLoading || !stats) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const netPLPositive = stats.revenue.netPL >= 0;
  const activeMode = DATE_MODES.find(m => m.value === dateMode);
  const periodLabel = activeMode?.label ?? 'This Period';

  const topProjectsForChart = (stats.topProjects ?? []).slice(0, 6);
  const barData = {
    labels: topProjectsForChart.map(p => p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name),
    datasets: [
      { data: topProjectsForChart.map(p => p.income + (canMilestones ? (p.milestoneIncome ?? 0) : 0)), color: () => '#22c55e' },
    ],
  };
  const PIE_COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#94a3b8', '#ef4444'];
  const pieData = (stats.projectStatusBreakdown ?? []).map((s, i) => ({
    name: s.status, population: s.count, color: PIE_COLORS[i % PIE_COLORS.length], legendFontColor: '#4b5563', legendFontSize: 11,
  }));
  const salaryChartData = (salaryTrend?.data ?? []).map(p => ({ label: `${p.month}/${String(p.year).slice(2)}`, totalPaid: p.totalPaid }));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Finance & Projects</Text>
        <Text style={styles.subHeading}>Budgets, projects, expenses and supplier bills</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setShowModePicker(true)}>
            <Text style={styles.filterSelectText}>{activeMode?.label ?? 'Period'}</Text>
            <Text style={styles.filterChevron}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.filterLabel}>Display in</Text>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.filterSelectText}>{displayCurrency}</Text>
            <Text style={styles.filterChevron}>▾</Text>
          </TouchableOpacity>
        </View>
        {dateMode === 'custom' && (
          <View style={styles.customRow}>
            <DatePicker value={customStart} onDateChange={setCustomStart} placeholder="Start" style={{ flex: 1, marginBottom: 0 }} />
            <DatePicker value={customEnd} onDateChange={setCustomEnd} placeholder="End" style={{ flex: 1, marginBottom: 0 }} />
          </View>
        )}
      </View>

      <Modal visible={showModePicker} transparent animationType="fade" onRequestClose={() => setShowModePicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowModePicker(false)}>
          <View style={styles.pickerSheet}>
            {DATE_MODES.map(m => (
              <TouchableOpacity key={m.value} style={styles.pickerOption} onPress={() => { setDateMode(m.value); setShowModePicker(false); }}>
                <Text style={[styles.pickerOptionText, dateMode === m.value && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              {CURRENCY_OPTIONS.map(c => (
                <TouchableOpacity key={c} style={styles.pickerOption} onPress={() => { setDisplayCurrency(c); setShowCurrencyPicker(false); }}>
                  <Text style={[styles.pickerOptionText, displayCurrency === c && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{c} — {CURRENCY_SYMBOLS[c]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.kpiGrid}>
          <KpiCard label="Budget Remaining" value={fmt(stats.budgets?.remaining ?? 0)}
            sub={`${fmt(stats.budgets?.spent ?? 0)} spent of ${fmt(stats.budgets?.total ?? 0)}`} color="#3B82F6" />
          <KpiCard label="Active Projects" value={String(stats.projects?.active ?? 0)}
            sub={`${stats.projects?.total ?? 0} total · ${fmt(stats.projects?.totalProfit ?? 0)} profit`} color="#8B5CF6" />
          <KpiCard label={`Revenue (${periodLabel})`} value={fmt(stats.revenue?.thisMonth ?? 0)} sub="From project income" color="#22C55E" />
          <KpiCard label={`Net P&L (${periodLabel})`} value={fmt(Math.abs(stats.revenue?.netPL ?? 0))}
            sub={netPLPositive ? 'Profit' : 'Loss'} color={netPLPositive ? '#10B981' : '#EF4444'} />
          {canCompanyEarnings && (
            <KpiCard label="Company Earning" value={fmt(stats.totalCompanyEarnings ?? 0)} sub="Service charge on all projects" color="#A855F7" />
          )}
          {showNetAvailable && (
            <KpiCard label="Net Available" value={fmt(stats.netAvailable?.remaining ?? 0)}
              sub={`${fmt(stats.netAvailable?.salariesPaid ?? 0)} salaries deducted`}
              color={(stats.netAvailable?.remaining ?? 0) >= 0 ? '#10B981' : '#EF4444'} />
          )}
          {showTransport && stats.transport?.included && (
            <KpiCard label="Transportation Deductions" value={fmt(stats.transport?.totalDeductionsUSD ?? 0)}
              sub="Total across all employees" color="#3B82F6" />
          )}
          {canClientInvoice && clientInvoice && (
            <>
              <KpiCard label="Client Invoice Paid" value={fmt(clientInvoiceTotals.paid)} sub="Total paid client invoices" color="#10B981" />
              <KpiCard label="Client Invoice Pending" value={fmt(clientInvoiceTotals.pending)} sub="Unpaid client invoices" color="#EF4444" />
            </>
          )}
        </View>

        {showNetAvailable && salaryTrend?.included && salaryChartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Salary Trend</Text>
            <Text style={styles.chartSub}>Total salaries paid per month</Text>
            <BarChart
              data={{ labels: salaryChartData.map(d => d.label), datasets: [{ data: salaryChartData.map(d => d.totalPaid) }] }}
              width={screenWidth - 56} height={200} fromZero
              yAxisLabel="" yAxisSuffix=""
              chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#8b5cf6', labelColor: () => '#6b7280', barPercentage: 0.6 }}
              style={{ borderRadius: 12, marginLeft: -16 }}
            />
          </View>
        )}

        <View style={styles.rowCards}>
          <View style={styles.smallCard}>
            <View style={styles.smallCardHeader}>
              <Text style={styles.smallCardTitle}>Pending Expenses</Text>
              <View style={styles.pillAmber}><Text style={styles.pillAmberText}>{stats.expenses?.pendingCount ?? 0} waiting</Text></View>
            </View>
            <Text style={styles.smallCardValue}>{fmt(stats.expenses?.monthTotal ?? 0)}</Text>
            <Text style={styles.smallCardSub}>Approved expenses {periodLabel.toLowerCase()}</Text>
            <TouchableOpacity style={styles.smallCardBtn} onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.smallCardBtnText}>Review Expenses →</Text>
            </TouchableOpacity>
          </View>

          {canSeeBills && (
            <View style={styles.smallCard}>
              <View style={styles.smallCardHeader}>
                <Text style={styles.smallCardTitle}>Supplier Bills (AP)</Text>
                {(stats.supplierBills?.overdue ?? 0) > 0 && (
                  <View style={styles.pillRed}><Text style={styles.pillRedText}>{stats.supplierBills.overdue} overdue</Text></View>
                )}
              </View>
              <Text style={styles.smallCardValue}>{(stats.supplierBills?.pending ?? 0) + (stats.supplierBills?.overdue ?? 0)}</Text>
              <Text style={styles.smallCardSub}>{stats.supplierBills?.pending ?? 0} pending · {stats.supplierBills?.overdue ?? 0} overdue</Text>
              <TouchableOpacity style={styles.smallCardBtn} onPress={() => navigation.navigate('SupplierBills')}>
                <Text style={styles.smallCardBtnText}>View Bills →</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Project Status</Text>
            <View style={{ marginTop: 8, gap: 6 }}>
              {(stats.projectStatusBreakdown ?? []).length === 0 ? (
                <Text style={styles.smallCardSub}>No projects yet</Text>
              ) : stats.projectStatusBreakdown.map(s => (
                <View key={s.status} style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{s.status}</Text>
                  <Text style={styles.statusCount}>{s.count}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.smallCardBtn} onPress={() => navigation.navigate('Projects')}>
              <Text style={styles.smallCardBtnText}>All Projects →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Top Projects by Profit</Text>
          {(stats.topProjects ?? []).length === 0 ? (
            <Text style={styles.empty}>No projects with income yet</Text>
          ) : stats.topProjects.map(p => {
            const msIncome = canMilestones ? (p.milestoneIncome ?? 0) : 0;
            const effIncome = p.income + msIncome;
            const effProfit = p.profit + msIncome;
            return (
              <View key={p.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.listRowSub}>{fmt(effIncome)} income · {fmt(p.expense)} expense</Text>
                </View>
                <Text style={[styles.listRowValue, { color: effProfit >= 0 ? '#059669' : '#dc2626' }]}>
                  {effProfit >= 0 ? '+' : ''}{fmt(effProfit)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Pending Expense Approvals</Text>
          {(stats.expenses?.pendingList ?? []).length === 0 ? (
            <Text style={styles.empty}>No pending expenses</Text>
          ) : stats.expenses.pendingList.map(e => (
            <View key={e.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.listRowSub}>{e.category ?? 'Uncategorised'} · {e.expenseDate}</Text>
              </View>
              <Text style={styles.listRowValue}>{fmt(e.amount)}</Text>
            </View>
          ))}
        </View>

        {topProjectsForChart.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income — Top Projects</Text>
            <BarChart
              data={barData} width={screenWidth - 56} height={200} fromZero
              yAxisLabel="" yAxisSuffix=""
              chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#22c55e', labelColor: () => '#6b7280', barPercentage: 0.6 }}
              style={{ borderRadius: 12, marginLeft: -16 }}
            />
          </View>
        )}

        {pieData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Project Status Distribution</Text>
            <PieChart
              data={pieData} width={screenWidth - 56} height={200}
              chartConfig={{ color: () => '#000' }}
              accessor="population" backgroundColor="transparent" paddingLeft="8"
            />
          </View>
        )}

        <Text style={styles.quickLinksTitle}>Quick Links</Text>
        <View style={styles.quickLinksGrid}>
          {QUICK_LINKS.filter(q => !q.perm || hasPerm(q.perm)).map(q => (
            <TouchableOpacity key={q.route} style={[styles.quickLinkBtn, { backgroundColor: q.color }]} onPress={() => navigation.navigate(q.route)}>
              <Text style={styles.quickLinkText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  filterSelect: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  filterSelectText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  filterChevron: { fontSize: 10, color: '#9ca3af' },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 14 },
  kpiLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.85)' },
  kpiValue: { fontSize: 19, fontFamily: 'Outfit-Bold', color: '#fff', marginTop: 4 },
  kpiSub: { fontSize: 10, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  chartTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  chartSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2, marginBottom: 6 },
  rowCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  smallCard: { flexBasis: '100%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  smallCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallCardTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  smallCardValue: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  smallCardSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  smallCardBtn: { marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  smallCardBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  pillAmber: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillAmberText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#92400e' },
  pillRed: { backgroundColor: '#fee2e2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillRedText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#b91c1c' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#4b5563' },
  statusCount: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  listCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  listTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  empty: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', paddingVertical: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: '#f3f4f6' },
  listRowTitle: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827' },
  listRowSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  listRowValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  quickLinksTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#4b5563' },
  quickLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLinkBtn: { flexBasis: '31%', flexGrow: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#fff', textAlign: 'center' },
});
