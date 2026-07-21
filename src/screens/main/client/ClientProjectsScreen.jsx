import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useClientProjects } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import colors from '../../../theme/colors';

const STATUS = {
  Active: { bg: '#dcfce7', text: '#15803d' },
  Planning: { bg: '#dbeafe', text: '#1d4ed8' },
  'On Hold': { bg: '#fef9c3', text: '#a16207' },
  Completed: { bg: '#f1f5f9', text: '#475569' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

export default function ClientProjectsScreen() {
  const navigation = useNavigation();
  const { fmt, rates, currency } = useCurrency();
  const { data: raw = [], isLoading, isFetching, refetch } = useClientProjects();
  const projects = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));

  return (
    <View style={s.root}>
      <View style={s.header}><Text style={s.title}>My Projects</Text><Text style={s.sub}>All projects assigned to you</Text></View>
      <FlatList
        data={projects}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No projects assigned to you yet.</Text>}
        renderItem={({ item: p }) => {
          const st = STATUS[p.status] ?? { bg: '#f1f5f9', text: '#475569' };
          const roi = p.totalExpense > 0 ? ((p.profit / p.totalExpense) * 100).toFixed(0) : null;
          return (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ClientProjectDetail', { id: p.id })}>
              <View style={s.cardTop}>
                <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.text }]}>{p.status}</Text></View>
              </View>
              {p.description ? <Text style={s.desc} numberOfLines={1}>{p.description}</Text> : null}
              <View style={s.metrics}>
                <View style={s.metric}><Text style={s.metricLabel}>Revenue</Text><Text style={s.metricVal}>{money(p.totalIncome)}</Text></View>
                <View style={s.metric}><Text style={s.metricLabel}>Expenses</Text><Text style={s.metricVal}>{money(p.totalExpense)}</Text></View>
                <View style={s.metric}>
                  <Text style={s.metricLabel}>Net Profit</Text>
                  <Text style={[s.metricVal, { color: p.profit >= 0 ? '#16a34a' : '#dc2626' }]}>{p.profit >= 0 ? '+' : ''}{money(p.profit)}{roi ? ` (${roi}%)` : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 10 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#94a3b8' },
  metricVal: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 1 },
});
