import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useClientProject } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import colors from '../../../theme/colors';

const amtUSD = x => (x?.amountInUSD != null ? parseFloat(String(x.amountInUSD)) : parseFloat(String(x?.amount || 0)));

export default function ClientProjectDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params ?? {};
  const { fmt, rates, currency } = useCurrency();
  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));

  const { data, isLoading } = useClientProject(id);
  const [tab, setTab] = useState('overview');

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!data) return <View style={s.center}><Text style={s.muted}>Project not found.</Text></View>;

  const { project: p, incomes = [], expenses = [] } = data;
  const totalIncome = incomes.reduce((sum, i) => sum + amtUSD(i), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + amtUSD(e), 0);
  const net = totalIncome - totalExpense;
  const roi = totalExpense > 0 ? ((net / totalExpense) * 100).toFixed(1) : null;

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'sales', label: `Sales (${incomes.length})` },
    { key: 'expenses', label: `Expenses (${expenses.length})` },
  ];

  const rows = tab === 'sales' ? incomes : tab === 'expenses' ? expenses : [];

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Back</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
        <View style={s.headerCard}>
          <Text style={s.name}>{p.name}</Text>
          <Text style={s.status}>{p.status}</Text>
          {p.description ? <Text style={s.desc}>{p.description}</Text> : null}
        </View>

        <View style={s.kpiGrid}>
          <View style={[s.kpi, { backgroundColor: '#f0fdf4' }]}><Text style={s.kpiLabel}>Total Sales</Text><Text style={[s.kpiVal, { color: '#15803d' }]}>{money(totalIncome)}</Text></View>
          <View style={[s.kpi, { backgroundColor: '#fef2f2' }]}><Text style={s.kpiLabel}>Expenses</Text><Text style={[s.kpiVal, { color: '#b91c1c' }]}>{money(totalExpense)}</Text></View>
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

        {tab === 'overview' ? (
          <View style={s.panel}>
            {p.marketplace ? <Row label="Marketplace" value={p.marketplace} /> : null}
            {p.estimatedBudget ? <Row label="Budget" value={money(parseFloat(String(p.estimatedBudget)))} /> : null}
            {p.startDate ? <Row label="Start Date" value={String(p.startDate).slice(0, 10)} /> : null}
            {p.endDate ? <Row label="End Date" value={String(p.endDate).slice(0, 10)} /> : null}
            {!p.marketplace && !p.estimatedBudget && !p.startDate ? <Text style={s.muted}>No extra details.</Text> : null}
          </View>
        ) : (
          <View style={s.panel}>
            {rows.length === 0 ? (
              <Text style={s.muted}>No {tab} recorded yet.</Text>
            ) : rows.map((r, i) => (
              <View key={r.id ?? i} style={s.entryRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.entryDesc} numberOfLines={1}>{r.description || r.category || '—'}</Text>
                  <Text style={s.entryDate}>{(r.incomeDate || r.expenseDate || '').slice(0, 10) || '—'}</Text>
                </View>
                <Text style={[s.entryAmt, { color: tab === 'sales' ? '#15803d' : '#b91c1c' }]}>{money(amtUSD(r))}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const Row = ({ label, value }) => (
  <View style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  muted: { color: '#94a3b8', fontFamily: 'Outfit-Regular', fontSize: 13, padding: 8 },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  back: { fontSize: 14, color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  headerCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 16 },
  name: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  status: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#64748b', marginTop: 2 },
  desc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 6 },
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
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  detailLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#94a3b8' },
  detailValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  entryDesc: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  entryDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  entryAmt: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
});
