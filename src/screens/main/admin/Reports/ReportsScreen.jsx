import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const TABS = [
  { key: 'summary',   label: 'Sales' },
  { key: 'invoices',  label: 'Invoices' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'customers', label: 'Customers' },
  { key: 'tickets',   label: 'Tickets' },
  { key: 'finance',   label: 'Finance' },
];

const StatCard = ({ label, value, sub, color }) => (
  <View style={[styles.card, color && { borderLeftWidth: 3, borderLeftColor: color }]}>
    <Text style={styles.cardValue}>{value ?? '—'}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
    {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Row = ({ label, value, warn }) => (
  <View style={styles.listRow}>
    <Text style={styles.listName}>{label}</Text>
    <Text style={[styles.listVal, warn && { color: colors.warning }]}>{value}</Text>
  </View>
);

// ─── Tab content ──────────────────────────────────────────────────────────────

const SummaryTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Total Revenue"   value={fmt(data.totalRevenue)}   color="#22c55e" />
      <StatCard label="Total Orders"    value={data.totalOrders ?? 0}     color={colors.primary} />
      <StatCard label="Avg Order Value" value={fmt(data.avgOrderValue)}   color="#8b5cf6" />
      <StatCard label="Ticket Revenue"  value={fmt(data.ticketRevenue)}   color="#f59e0b" />
    </View>
    {data.topProducts?.length > 0 && (
      <Section title="Top Products">
        {data.topProducts.map((p, i) => (
          <Row key={i} label={p.name} value={`${p.qty} sold · ${fmt(p.revenue)}`} />
        ))}
      </Section>
    )}
    {data.revenueByDay?.length > 0 && (
      <Section title="Revenue by Day">
        {data.revenueByDay.slice(-7).map((d, i) => (
          <Row key={i} label={d.date} value={fmt(d.revenue)} />
        ))}
      </Section>
    )}
  </>
);

const InvoicesTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Total Invoices"  value={data.total ?? 0}          color={colors.primary} />
      <StatCard label="Revenue"         value={fmt(data.totalRevenue)}    color="#22c55e" />
      <StatCard label="Paid"            value={fmt(data.totalPaid)}       color="#06b6d4" />
      <StatCard label="Outstanding"     value={fmt(data.outstanding)}     color={colors.warning} />
    </View>
    {data.statusBreakdown?.length > 0 && (
      <Section title="By Status">
        {data.statusBreakdown.map((s, i) => (
          <Row key={i} label={s.status} value={`${s.count} invoices`} />
        ))}
      </Section>
    )}
  </>
);

const InventoryTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Total Products"   value={data.totalProducts ?? 0}             color={colors.primary} />
      <StatCard label="Low Stock"        value={data.lowStockCount ?? 0}   sub="needs reorder" color={colors.warning} />
      <StatCard label="Out of Stock"     value={data.outOfStockCount ?? 0}            color="#ef4444" />
      <StatCard label="Stock Value"      value={fmt(data.totalStockValue)}            color="#22c55e" />
    </View>
    {data.lowStockItems?.length > 0 && (
      <Section title="Low Stock Items">
        {data.lowStockItems.map((p, i) => (
          <Row key={i} label={`${p.name} (${p.sku})`} value={`${p.stock} left (min ${p.lowStockThreshold})`} warn />
        ))}
      </Section>
    )}
    {data.topByValue?.length > 0 && (
      <Section title="Top by Stock Value">
        {data.topByValue.map((p, i) => (
          <Row key={i} label={p.name} value={`${p.stock} × ${fmt(p.cost)} = ${fmt(p.stockValue)}`} />
        ))}
      </Section>
    )}
  </>
);

const CustomersTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Total Customers"  value={data.totalCustomers ?? 0}  color={colors.primary} />
      <StatCard label="New This Period"  value={data.newInPeriod ?? 0}      color="#22c55e" />
      <StatCard label="Total Revenue"    value={fmt(data.totalRevenue)}     color="#8b5cf6" />
    </View>
    {data.topCustomers?.length > 0 && (
      <Section title="Top Customers">
        {data.topCustomers.map((c, i) => (
          <Row key={i} label={c.name} value={`${c.totalOrders} orders · ${fmt(c.totalSpent)}`} />
        ))}
      </Section>
    )}
  </>
);

const TicketsTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Total Tickets"   value={data.total ?? 0}           color={colors.primary} />
      <StatCard label="Estimated"       value={fmt(data.totalEstimated)}   color="#8b5cf6" />
      <StatCard label="Advance Paid"    value={fmt(data.totalAdvance)}     color="#22c55e" />
      <StatCard label="Outstanding"     value={fmt(data.outstanding)}      color={colors.warning} />
    </View>
    {data.statusBreakdown?.length > 0 && (
      <Section title="By Status">
        {data.statusBreakdown.map((s, i) => (
          <Row key={i} label={s.status} value={`${s.count} tickets`} />
        ))}
      </Section>
    )}
  </>
);

const FinanceTab = ({ data, fmt }) => (
  <>
    <View style={styles.grid}>
      <StatCard label="Gross Revenue" value={fmt(data.totalRevenue)}  color="#22c55e" />
      <StatCard label="Total COGS"    value={fmt(data.totalCost)}      color="#ef4444" />
      <StatCard label="Gross Profit"  value={fmt(data.grossProfit)}    color="#8b5cf6" />
      <StatCard label="Profit Margin" value={data.profitMargin != null ? `${Number(data.profitMargin).toFixed(1)}%` : '—'} color="#f59e0b" />
    </View>
    {data.byCategory?.length > 0 && (
      <Section title="Revenue by Category">
        {data.byCategory.map((c, i) => (
          <Row key={i} label={c.name} value={`${fmt(c.revenue)} · ${fmt(c.profit)} profit`} />
        ))}
      </Section>
    )}
  </>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const PERIODS = ['7d', '30d', '90d', '1y', 'all'];

const ReportsScreen = () => {
  const [tab, setTab] = useState('summary');
  const [period, setPeriod] = useState('30d');
  const { fmt } = useCurrency();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', tab, period],
    queryFn: async () => {
      const qs = tab === 'inventory' ? '' : `?period=${period}`;
      const res = await apiClient.get(`/admin/reports/${tab}${qs}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

  return (
    <View style={styles.root}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap} contentContainerStyle={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period filter (not for inventory) */}
      {tab !== 'inventory' && (
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        >
          {tab === 'summary'   && data && <SummaryTab   data={data} fmt={fmt} />}
          {tab === 'invoices'  && data && <InvoicesTab  data={data} fmt={fmt} />}
          {tab === 'inventory' && data && <InventoryTab data={data} fmt={fmt} />}
          {tab === 'customers' && data && <CustomersTab data={data} fmt={fmt} />}
          {tab === 'tickets'   && data && <TicketsTab   data={data} fmt={fmt} />}
          {tab === 'finance'   && data && <FinanceTab   data={data} fmt={fmt} />}
          {!data && <Text style={styles.empty}>No data available for this period.</Text>}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0},
  tabs: { flexDirection: 'row', paddingHorizontal: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  periodTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flex: 1, minWidth: '45%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06 },
  cardValue: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 3 },
  cardLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  cardSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.warning, marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 10 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  listName: { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, paddingRight: 8 },
  listVal: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  empty: { textAlign: 'center', marginTop: 40, color: colors.secondary, fontFamily: 'Outfit-Regular' },
});

export default ReportsScreen;
