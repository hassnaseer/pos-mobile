import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useClientDashboard } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import colors from '../../../theme/colors';

export default function ClientDashboardScreen() {
  const navigation = useNavigation();
  const { fmt, rates, currency } = useCurrency();
  const { data: d, isLoading, isFetching, refetch } = useClientDashboard();
  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));

  if (isLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  const projects = d?.projects ?? [];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <Text style={s.title}>Dashboard</Text>
      <Text style={s.sub}>Overview of your projects and financials</Text>

      <View style={s.grid}>
        <View style={[s.card, { backgroundColor: '#2563eb' }]}>
          <Text style={s.cardLabel}>Total Projects</Text>
          <Text style={s.cardValue}>{d?.totalProjects ?? 0}</Text>
          <Text style={s.cardHint}>{d?.activeProjects ?? 0} active</Text>
        </View>
        <View style={[s.card, { backgroundColor: '#16a34a' }]}>
          <Text style={s.cardLabel}>Total Revenue</Text>
          <Text style={s.cardValueSm}>{money(d?.totalIncomeUSD)}</Text>
        </View>
        <View style={[s.card, { backgroundColor: '#ea580c' }]}>
          <Text style={s.cardLabel}>Total Expenses</Text>
          <Text style={s.cardValueSm}>{money(d?.totalExpenseUSD)}</Text>
        </View>
        <View style={[s.card, { backgroundColor: (d?.netProfitUSD ?? 0) >= 0 ? '#0891b2' : '#e11d48' }]}>
          <Text style={s.cardLabel}>Net Profit</Text>
          <Text style={s.cardValueSm}>{money(d?.netProfitUSD)}</Text>
        </View>
      </View>

      {projects.length > 0 ? (
        <View style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>Top Projects by Profit</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ClientProjects')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
          </View>
          {projects.map(p => (
            <TouchableOpacity key={p.id} style={s.projRow} onPress={() => navigation.navigate('ClientProjectDetail', { id: p.id })}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.projName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.projStatus}>{p.status}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.projProfit, { color: p.profit >= 0 ? '#16a34a' : '#dc2626' }]}>{p.profit >= 0 ? '+' : ''}{money(p.profit)}</Text>
                <Text style={s.projRev}>Revenue: {money(p.income)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyText}>No projects assigned to you yet.</Text>
          <Text style={s.emptyHint}>Contact your business to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  sub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', flexGrow: 1, borderRadius: 16, padding: 16 },
  cardLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.85)' },
  cardValue: { fontSize: 30, fontFamily: 'Outfit-Bold', color: '#fff', marginTop: 4 },
  cardValueSm: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#fff', marginTop: 4 },
  cardHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginTop: 16 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  panelTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  viewAll: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  projRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  projName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  projStatus: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  projProfit: { fontSize: 14, fontFamily: 'Outfit-SemiBold' },
  projRev: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 1 },
  empty: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed', padding: 32, alignItems: 'center', marginTop: 16 },
  emptyText: { color: '#64748b', fontFamily: 'Outfit-Medium', fontSize: 14 },
  emptyHint: { color: '#94a3b8', fontFamily: 'Outfit-Regular', fontSize: 12, marginTop: 4 },
});
