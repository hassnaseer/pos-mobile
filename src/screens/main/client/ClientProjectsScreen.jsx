import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useClientProjects } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import { getCategoryDef } from '../../../config/projectCategories';
import colors from '../../../theme/colors';

const STATUS = {
  Active: { bg: '#dcfce7', text: '#15803d' },
  Planning: { bg: '#dbeafe', text: '#1d4ed8' },
  'On Hold': { bg: '#fef9c3', text: '#a16207' },
  Completed: { bg: '#f1f5f9', text: '#475569' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

const PERIODS = ['daily', 'weekly', 'monthly', 'all', 'custom'];
const PAGE_SIZE = 20;

const fmtDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDateRange = (mode, customStart, customEnd) => {
  const today = new Date();
  if (mode === 'all') return { startDate: undefined, endDate: undefined };
  if (mode === 'custom') {
    if (!customStart && !customEnd) return {};
    return { startDate: customStart || undefined, endDate: customEnd || undefined };
  }
  if (mode === 'daily') return { startDate: fmtDate(today), endDate: fmtDate(today) };
  if (mode === 'weekly') { const d = new Date(today); d.setDate(d.getDate() - 6); return { startDate: fmtDate(d), endDate: fmtDate(today) }; }
  if (mode === 'monthly') { const d = new Date(today); d.setDate(d.getDate() - 29); return { startDate: fmtDate(d), endDate: fmtDate(today) }; }
  return {};
};

export default function ClientProjectsScreen() {
  const navigation = useNavigation();
  const { fmt, rates, currency } = useCurrency();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);

  const { startDate, endDate } = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const { data: raw = [], isLoading, isFetching, refetch } = useClientProjects({ startDate, endDate });
  const projects = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));

  const presentCategories = useMemo(() => {
    const keys = new Set(projects.map(p => p.category ?? 'ecommerce'));
    return Array.from(keys)
      .map(key => ({ key, label: getCategoryDef(key).label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  const filtered = projects.filter(p => {
    if (categoryFilter && (p.category ?? 'ecommerce') !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.marketplace?.toLowerCase().includes(q) ||
      p.accountCode?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>My Projects</Text>
        <Text style={s.sub}>All projects assigned to you</Text>
      </View>

      <View style={s.topBar}>
        <TextInput
          style={s.search}
          placeholder="Search projects…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={v => { setSearch(v); setPage(1); }}
        />
      </View>

      {presentCategories.length > 1 && (
        <View style={s.categoryRow}>
          <TouchableOpacity onPress={() => { setCategoryFilter(''); setPage(1); }} style={[s.chip, !categoryFilter && s.chipActive]}>
            <Text style={[s.chipText, !categoryFilter && s.chipTextActive]}>All categories</Text>
          </TouchableOpacity>
          {presentCategories.map(c => (
            <TouchableOpacity key={c.key} onPress={() => { setCategoryFilter(c.key); setPage(1); }} style={[s.chip, categoryFilter === c.key && s.chipActive]}>
              <Text style={[s.chipText, categoryFilter === c.key && s.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={s.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} onPress={() => { setPeriod(p); setPage(1); }} style={[s.chip, period === p && s.chipActive]}>
            <Text style={[s.chipText, period === p && s.chipTextActive]}>{p}</Text>
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

      <FlatList
        data={paged}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && (
          <Text style={s.empty}>{projects.length === 0 ? 'No projects assigned to you yet.' : 'No projects match your filters.'}</Text>
        )}
        ListFooterComponent={totalPages > 1 ? (
          <View style={s.pager}>
            <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
              <Text style={s.pageBtnText}>Previous</Text>
            </TouchableOpacity>
            <Text style={s.pageLabel}>Page {page} of {totalPages}</Text>
            <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)} style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}>
              <Text style={s.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
  topBar: { flexDirection: 'row', padding: 12, paddingBottom: 0, gap: 10, backgroundColor: '#fff' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff' },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, paddingTop: 10, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#475569', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#fff' },
  dateInput: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontFamily: 'Outfit-Regular' },
  toText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Outfit-Regular' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#475569' },
  pageLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b' },
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
