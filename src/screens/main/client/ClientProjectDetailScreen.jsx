import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { useClientProject } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import InvoicePreviewModal from '../../../components/InvoicePreviewModal/InvoicePreviewModal';
import colors from '../../../theme/colors';

const amtUSD = x => (x?.amountInUSD != null ? parseFloat(String(x.amountInUSD)) : parseFloat(String(x?.amount || 0)));

// Matches web's incomeCostRaw — cost/tax are stored as line totals, older rows may still carry
// a per_unit type that needs converting first.
const incomeCostRaw = i => {
  const qty = i.quantity ?? 1;
  const itemCostRaw = i.itemCost ? parseFloat(i.itemCost) : 0;
  const itemCostTotal = i.itemCostType === 'per_unit' ? itemCostRaw * qty : itemCostRaw;
  const taxRaw = i.taxAmount ? parseFloat(i.taxAmount) : 0;
  const taxTotal = i.taxAmountType === 'per_unit' ? taxRaw * qty : taxRaw;
  return itemCostTotal + taxTotal;
};

const SALE_STATUS_STYLE = {
  Paid: { bg: '#dcfce7', text: '#15803d' },
  Received: { bg: '#dcfce7', text: '#15803d' },
  Delivered: { bg: '#dcfce7', text: '#15803d' },
  Dispatched: { bg: '#dbeafe', text: '#1d4ed8' },
  'Partially Received': { bg: '#fef9c3', text: '#a16207' },
  Pending: { bg: '#ffedd5', text: '#c2410c' },
  Return: { bg: '#fef3c7', text: '#92400e' },
  Refund: { bg: '#fee2e2', text: '#b91c1c' },
};

const PERIODS = ['daily', 'weekly', 'monthly', 'all', 'custom'];

const fmtDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const inPeriod = (dateStr, period, customStart, customEnd) => {
  const d = (dateStr || '').slice(0, 10);
  const today = new Date();
  if (period === 'daily') return d === fmtDate(today);
  if (period === 'weekly') { const w = new Date(today); w.setDate(w.getDate() - 6); return d >= fmtDate(w); }
  if (period === 'monthly') { const m = new Date(today); m.setDate(m.getDate() - 29); return d >= fmtDate(m); }
  if (period === 'custom' && customStart && customEnd) return d >= customStart && d <= customEnd;
  return true;
};

export default function ClientProjectDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params ?? {};
  const { fmt, rates, currency } = useCurrency();
  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));

  const { data, isLoading } = useClientProject(id);
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [expensesSearch, setExpensesSearch] = useState('');
  const [expensesPage, setExpensesPage] = useState(1);
  const [pdfVisible, setPdfVisible] = useState(false);
  const PAGE_SIZE = 20;

  const allIncomes = data?.incomes ?? [];
  const allExpenses = data?.expenses ?? [];

  const periodIncomes = useMemo(
    () => allIncomes.filter(i => inPeriod(i.incomeDate, period, customStart, customEnd)),
    [allIncomes, period, customStart, customEnd],
  );
  const periodExpenses = useMemo(
    () => allExpenses.filter(e => inPeriod(e.expenseDate, period, customStart, customEnd)),
    [allExpenses, period, customStart, customEnd],
  );

  const filteredIncomes = useMemo(() => {
    if (!salesSearch.trim()) return periodIncomes;
    const q = salesSearch.trim().toLowerCase();
    return periodIncomes.filter(i =>
      (i.title ?? '').toLowerCase().includes(q) ||
      (i.customerName ?? '').toLowerCase().includes(q) ||
      (i.orderNumber ?? '').toLowerCase().includes(q),
    );
  }, [periodIncomes, salesSearch]);

  const filteredExpenses = useMemo(() => {
    if (!expensesSearch.trim()) return periodExpenses;
    const q = expensesSearch.trim().toLowerCase();
    return periodExpenses.filter(e => (e.title ?? '').toLowerCase().includes(q));
  }, [periodExpenses, expensesSearch]);

  const salesTotalPages = Math.ceil(filteredIncomes.length / PAGE_SIZE) || 1;
  const pagedIncomes = filteredIncomes.slice((salesPage - 1) * PAGE_SIZE, salesPage * PAGE_SIZE);
  const expensesTotalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE) || 1;
  const pagedExpenses = filteredExpenses.slice((expensesPage - 1) * PAGE_SIZE, expensesPage * PAGE_SIZE);

  // Monthly chart buckets — expense stays pure ProjectExpense rows (matches real $0 when
  // Expenses tab is empty); COGS only nets into profit, never shown as "Expense".
  const chartData = useMemo(() => {
    const buckets = new Map();
    for (const i of periodIncomes) {
      const p = (i.incomeDate ?? '').slice(0, 7);
      if (!p) continue;
      const b = buckets.get(p) ?? { income: 0, expense: 0, cogs: 0 };
      b.income += amtUSD(i);
      b.cogs += incomeCostRaw(i);
      buckets.set(p, b);
    }
    for (const e of periodExpenses) {
      const p = (e.expenseDate ?? '').slice(0, 7);
      if (!p) continue;
      const b = buckets.get(p) ?? { income: 0, expense: 0, cogs: 0 };
      b.expense += amtUSD(e);
      buckets.set(p, b);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, b]) => ({ period, income: b.income, expense: b.expense, profit: b.income - b.expense - b.cogs }));
  }, [periodIncomes, periodExpenses]);

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!data) return <View style={s.center}><Text style={s.muted}>Project not found.</Text></View>;

  const { project: p, milestones = [] } = data;
  const totalIncome = periodIncomes.reduce((sum, i) => sum + amtUSD(i), 0);
  const totalExpense = periodExpenses.reduce((sum, e) => sum + amtUSD(e), 0);
  const cogs = periodIncomes.reduce((sum, i) => sum + incomeCostRaw(i), 0);
  const net = totalIncome - totalExpense - cogs;
  const roi = (totalExpense + cogs) > 0 ? ((net / (totalExpense + cogs)) * 100).toFixed(1) : null;

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'sales', label: `Sales (${periodIncomes.length})` },
    { key: 'expenses', label: `Expenses (${periodExpenses.length})` },
    ...(p.isMilestone ? [{ key: 'milestones', label: `Milestones (${milestones.length})` }] : []),
  ];

  const screenWidth = Dimensions.get('window').width;
  const chartLabels = chartData.map(d => d.period.slice(5));

  const reportHtml = `
    <html><body style="font-family:Helvetica;padding:20px;">
      <h2>${p.name}</h2>
      <p>Status: ${p.status}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr><td style="padding:6px 0;">Total Revenue</td><td style="text-align:right;font-weight:bold;color:#15803d;">${money(totalIncome)}</td></tr>
        <tr><td style="padding:6px 0;">COGS + Expenses</td><td style="text-align:right;font-weight:bold;color:#b91c1c;">${money(totalExpense + cogs)}</td></tr>
        <tr><td style="padding:6px 0;">Net Profit</td><td style="text-align:right;font-weight:bold;">${money(net)}</td></tr>
        ${roi !== null ? `<tr><td style="padding:6px 0;">ROI</td><td style="text-align:right;font-weight:bold;">${roi}%</td></tr>` : ''}
      </table>
      <h3 style="margin-top:20px;">By Period</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f3f4f6;"><th style="text-align:left;padding:6px;">Period</th><th style="text-align:right;padding:6px;">Sales</th><th style="text-align:right;padding:6px;">Expense</th><th style="text-align:right;padding:6px;">Profit</th></tr>
        ${chartData.map(d => `<tr><td style="padding:6px;border-top:1px solid #eee;">${d.period}</td><td style="text-align:right;padding:6px;border-top:1px solid #eee;">${money(d.income)}</td><td style="text-align:right;padding:6px;border-top:1px solid #eee;">${money(d.expense)}</td><td style="text-align:right;padding:6px;border-top:1px solid #eee;">${money(d.profit)}</td></tr>`).join('')}
      </table>
    </body></html>`;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Back</Text></TouchableOpacity>
      </View>

      <View style={s.periodRow}>
        {PERIODS.map(per => (
          <TouchableOpacity key={per} onPress={() => setPeriod(per)} style={[s.chip, period === per && s.chipActive]}>
            <Text style={[s.chipText, period === per && s.chipTextActive]}>{per}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {period === 'custom' && (
        <View style={s.customRow}>
          <TextInput style={s.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999" value={customStart} onChangeText={setCustomStart} />
          <Text style={s.toText}>to</Text>
          <TextInput style={s.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999" value={customEnd} onChangeText={setCustomEnd} />
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
        <View style={s.headerCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.name}</Text>
              <Text style={s.status}>{p.status}</Text>
            </View>
            <TouchableOpacity style={s.pdfBtn} onPress={() => setPdfVisible(true)}>
              <Text style={s.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
          {p.description ? <Text style={s.desc}>{p.description}</Text> : null}
          {(p.startDate || p.endDate || p.marketplace) ? (
            <Text style={s.metaLine}>
              {[p.startDate ? String(p.startDate).slice(0, 10) : null, p.endDate ? `→ ${String(p.endDate).slice(0, 10)}` : null, p.marketplace ? `Marketplace: ${p.marketplace}` : null]
                .filter(Boolean).join('   ')}
            </Text>
          ) : null}
        </View>

        <View style={s.kpiGrid}>
          <View style={[s.kpi, { backgroundColor: '#f0fdf4' }]}><Text style={s.kpiLabel}>Total Revenue</Text><Text style={[s.kpiVal, { color: '#15803d' }]}>{money(totalIncome)}</Text></View>
          <View style={[s.kpi, { backgroundColor: '#fef2f2' }]}><Text style={s.kpiLabel}>COGS + Expenses</Text><Text style={[s.kpiVal, { color: '#b91c1c' }]}>{money(totalExpense + cogs)}</Text></View>
          <View style={[s.kpi, { backgroundColor: net >= 0 ? '#eff6ff' : '#fef2f2' }]}><Text style={s.kpiLabel}>Net Profit</Text><Text style={[s.kpiVal, { color: net >= 0 ? '#1d4ed8' : '#b91c1c' }]}>{net >= 0 ? '+' : ''}{money(net)}</Text></View>
          {roi !== null ? <View style={[s.kpi, { backgroundColor: '#f5f3ff' }]}><Text style={s.kpiLabel}>ROI</Text><Text style={[s.kpiVal, { color: '#7c3aed' }]}>{roi}%</Text></View> : null}
        </View>

        <View style={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' && (
          <>
            <View style={s.panel}>
              <Text style={s.panelTitle}>Project Details</Text>
              {!p.estimatedBudget && !p.monthlyRevenuePlan && !p.monthlyProfitPlan && !p.marketplace && !p.accountCode ? (
                <Text style={s.muted}>No additional details have been added for this project yet.</Text>
              ) : (
                <>
                  {p.estimatedBudget ? <Row label="Budget" value={money(parseFloat(String(p.estimatedBudget)))} /> : null}
                  {p.monthlyRevenuePlan ? <Row label="Monthly Revenue Plan" value={money(parseFloat(String(p.monthlyRevenuePlan)))} /> : null}
                  {p.monthlyProfitPlan ? <Row label="Monthly Profit Plan" value={money(parseFloat(String(p.monthlyProfitPlan)))} /> : null}
                  {p.marketplace ? <Row label="Marketplace" value={p.marketplace} /> : null}
                  {p.accountCode ? <Row label="Account Code" value={p.accountCode} /> : null}
                </>
              )}
            </View>

            {chartData.length > 0 ? (
              <>
                <View style={s.chartCard}>
                  <Text style={s.chartTitle}>Sales by Period</Text>
                  <BarChart
                    data={{ labels: chartLabels, datasets: [{ data: chartData.map(d => d.income) }] }}
                    width={screenWidth - 56} height={180} fromZero yAxisLabel="" yAxisSuffix=""
                    chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#22c55e', labelColor: () => '#6b7280', barPercentage: 0.6 }}
                    style={{ borderRadius: 12, marginLeft: -16 }}
                  />
                </View>
                <View style={s.chartCard}>
                  <Text style={s.chartTitle}>Expenses by Period</Text>
                  <BarChart
                    data={{ labels: chartLabels, datasets: [{ data: chartData.map(d => d.expense) }] }}
                    width={screenWidth - 56} height={180} fromZero yAxisLabel="" yAxisSuffix=""
                    chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#ef4444', labelColor: () => '#6b7280', barPercentage: 0.6 }}
                    style={{ borderRadius: 12, marginLeft: -16 }}
                  />
                </View>
                <View style={s.chartCard}>
                  <Text style={s.chartTitle}>Profit / Loss by Period</Text>
                  <BarChart
                    data={{ labels: chartLabels, datasets: [{ data: chartData.map(d => d.profit) }] }}
                    width={screenWidth - 56} height={180} fromZero yAxisLabel="" yAxisSuffix=""
                    chartConfig={{ backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: () => '#6366f1', labelColor: () => '#6b7280', barPercentage: 0.6 }}
                    style={{ borderRadius: 12, marginLeft: -16 }}
                  />
                </View>
              </>
            ) : (
              <View style={s.panel}><Text style={s.muted}>No chart data yet.</Text></View>
            )}
          </>
        )}

        {tab === 'sales' && (
          <>
            {filteredIncomes.length > 0 && (
              <Text style={s.summaryLine}>
                {filteredIncomes.length} {filteredIncomes.length === 1 ? 'entry' : 'entries'} · Total {money(filteredIncomes.reduce((s2, i) => s2 + amtUSD(i), 0))} · Total Qty {filteredIncomes.reduce((s2, i) => s2 + (i.quantity ?? 1), 0)}
              </Text>
            )}
            <TextInput style={s.search} placeholder="Search sales by title, customer, order #…" placeholderTextColor="#999" value={salesSearch} onChangeText={v => { setSalesSearch(v); setSalesPage(1); }} />
            <View style={s.panel}>
              {filteredIncomes.length === 0 ? (
                <Text style={s.muted}>{allIncomes.length === 0 ? 'No sales recorded yet.' : 'No sales match your filters.'}</Text>
              ) : pagedIncomes.map((i, idx) => {
                const amt = parseFloat(String(i.amount ?? 0));
                const recvRaw = parseFloat(String(i.receivedAmount ?? '0'));
                const recv = recvRaw !== 0 ? recvRaw : ((i.status === 'Pending' || i.status === 'Partially Received') ? 0 : amt);
                const usdRate = i.amountInUSD != null && amt > 0 ? parseFloat(String(i.amountInUSD)) / amt : 1;
                const lineCogs = incomeCostRaw(i) * usdRate;
                const qty = i.quantity ?? 1;
                const perUnit = qty > 0 ? lineCogs / qty : 0;
                const amtUSDVal = amt * usdRate;
                const profit = amtUSDVal - lineCogs;
                const roiRow = lineCogs > 0 ? (profit / lineCogs) * 100 : null;
                const badge = SALE_STATUS_STYLE[i.status] ?? { bg: '#f1f5f9', text: '#475569' };
                const orderNo = i.customerOrderNumber || i.orderNumber;
                return (
                  <View key={i.id ?? idx} style={s.saleCard}>
                    <View style={s.saleTop}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.saleTitle} numberOfLines={1}>{i.customerName || i.title || '—'}</Text>
                        {i.customerName ? <Text style={s.saleSub} numberOfLines={1}>{i.title}</Text> : null}
                      </View>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}><Text style={[s.badgeText, { color: badge.text }]}>{i.status || '—'}</Text></View>
                    </View>
                    {(orderNo || i.trackingNumber) ? (
                      <Text style={s.saleSub} numberOfLines={1}>{[orderNo, i.trackingNumber].filter(Boolean).join(' · ')}</Text>
                    ) : null}
                    <Text style={s.saleDate}>{(i.incomeDate || '').slice(0, 10) || '—'}</Text>
                    <View style={s.statRow}>
                      <Stat label="Qty" value={String(qty)} />
                      <Stat label="Total Cost" value={lineCogs > 0 ? money(lineCogs) : '—'} color="#ef4444" />
                      <Stat label="Per Unit" value={perUnit > 0 ? money(perUnit) : '—'} color="#f97316" />
                    </View>
                    <View style={s.statRow}>
                      <Stat label="Profit" value={`${profit >= 0 ? '+' : '-'}${money(Math.abs(profit))}`} color={profit >= 0 ? '#16a34a' : '#dc2626'} />
                      <Stat label="ROI%" value={roiRow !== null ? `${roiRow >= 0 ? '+' : ''}${roiRow.toFixed(1)}%` : '—'} color="#7c3aed" />
                      <Stat label="Received" value={recv > 0 ? money(recv * usdRate) : '—'} color="#374151" />
                    </View>
                  </View>
                );
              })}
            </View>
            <Pager page={salesPage} totalPages={salesTotalPages} onChange={setSalesPage} />
          </>
        )}

        {tab === 'expenses' && (
          <>
            <TextInput style={s.search} placeholder="Search expenses by title…" placeholderTextColor="#999" value={expensesSearch} onChangeText={v => { setExpensesSearch(v); setExpensesPage(1); }} />
            <View style={s.panel}>
              {filteredExpenses.length === 0 ? (
                <Text style={s.muted}>{allExpenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your filters.'}</Text>
              ) : pagedExpenses.map((e, idx) => (
                <View key={e.id ?? idx} style={s.entryRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.entryDesc} numberOfLines={1}>{e.title || '—'}</Text>
                    <Text style={s.entryDate}>{(e.expenseDate || '').slice(0, 10) || '—'}</Text>
                  </View>
                  <Text style={[s.entryAmt, { color: '#b91c1c' }]}>{money(amtUSD(e))}</Text>
                </View>
              ))}
            </View>
            <Pager page={expensesPage} totalPages={expensesTotalPages} onChange={setExpensesPage} />
          </>
        )}

        {tab === 'milestones' && (
          <View style={s.panel}>
            {milestones.length === 0 ? (
              <Text style={s.muted}>No milestones yet.</Text>
            ) : milestones.map((m, idx) => (
              <View key={m.id ?? idx} style={s.milestoneRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.entryDesc} numberOfLines={1}>{m.title}</Text>
                  {m.dueDate ? <Text style={s.entryDate}>Due: {String(m.dueDate).slice(0, 10)}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {m.amount ? <Text style={s.entryAmt}>{money(m.amountInUSD != null ? parseFloat(String(m.amountInUSD)) : parseFloat(String(m.amount)))}</Text> : null}
                  <View style={[s.badge, { backgroundColor: m.status === 'Completed' ? '#dcfce7' : '#f1f5f9' }]}>
                    <Text style={[s.badgeText, { color: m.status === 'Completed' ? '#15803d' : '#475569' }]}>{m.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <InvoicePreviewModal
        visible={pdfVisible}
        onClose={() => setPdfVisible(false)}
        html={reportHtml}
        fileName={`${p.name}-report`}
        title={`${p.name} — Report`}
      />
    </View>
  );
}

const Row = ({ label, value }) => (
  <View style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>
);

const Pager = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <View style={s.pager}>
      <TouchableOpacity disabled={page <= 1} onPress={() => onChange(page - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
        <Text style={s.pageBtnText}>Previous</Text>
      </TouchableOpacity>
      <Text style={s.pageLabel}>Page {page} of {totalPages}</Text>
      <TouchableOpacity disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}>
        <Text style={s.pageBtnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const Stat = ({ label, value, color }) => (
  <View style={{ flex: 1 }}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  muted: { color: '#94a3b8', fontFamily: 'Outfit-Regular', fontSize: 13, padding: 8 },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  back: { fontSize: 14, color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, paddingBottom: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#475569', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  dateInput: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontFamily: 'Outfit-Regular' },
  toText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Outfit-Regular' },
  headerCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 16 },
  name: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  status: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#64748b', marginTop: 2 },
  desc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 6 },
  metaLine: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 6 },
  panelTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 8 },
  summaryLine: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginBottom: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#475569' },
  pageLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  pdfBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  kpi: { width: '47%', flexGrow: 1, borderRadius: 12, padding: 14 },
  kpiLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#64748b' },
  kpiVal: { fontSize: 18, fontFamily: 'Outfit-Bold', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#64748b' },
  tabTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 14 },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 14, marginTop: 12 },
  chartTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 8 },
  search: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Outfit-Regular', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  detailLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#94a3b8' },
  detailValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  entryDesc: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  entryDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  entryAmt: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  saleCard: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  saleTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  saleTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  saleSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  saleDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statLabel: { fontSize: 9, fontFamily: 'Outfit-Regular', color: '#94a3b8', textTransform: 'uppercase' },
  statValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 1 },
});
