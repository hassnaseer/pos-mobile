import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import { getDateRange } from '../../../../utils/dateRangeFilter';
import PeriodFilterRow from '../../../../components/PeriodFilterRow';
import DatePicker from '../../../../components/Ui/DatePicker';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';
import colors from '../../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtAmt = n => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'BDT', 'CAD', 'AUD', 'NZD', 'SGD', 'MYR', 'THB', 'JPY', 'CNY', 'KRW', 'TRY', 'ZAR', 'NGN'];
const PERIODS = ['monthly', 'yearly', 'custom'];
const makeEmptyForm = currency => ({ name: '', period: 'monthly', startDate: '', endDate: '', amount: '', notes: '', currency });

const useBudgets = (from, to) =>
  useQuery({
    queryKey: ['budgets', from, to],
    queryFn: async () => {
      const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
      const r = await apiClient.get(`/admin/budgets${qs ? `?${qs}` : ''}`);
      const data = r?.data ?? r ?? {};
      return { items: data.items ?? [], aggregate: data.aggregate ?? { totalBudgetUSD: 0, totalSpentAllUSD: 0, totalRemainingUSD: 0 } };
    },
    staleTime: 30_000,
  });

const useBudgetSummary = id =>
  useQuery({
    queryKey: ['budget-summary', id],
    queryFn: async () => { const r = await apiClient.get(`/admin/budgets/${id}/summary`); return r?.data ?? r ?? null; },
    enabled: !!id,
  });

function SummaryPanel({ budgetId, fmtMoney }) {
  const { data: summary, isLoading } = useBudgetSummary(budgetId);
  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  if (!summary) return null;
  const { totalRevenue, totalExpenses, netProfit, spent, remaining, budget, expensesByCategory } = summary;
  const pct = budget.amount ? Math.min(100, (spent / parseFloat(budget.amount)) * 100) : 0;
  const isProfit = netProfit >= 0;

  return (
    <View style={s.summaryPanel}>
      <View style={s.summaryGrid}>
        <View style={s.summaryStat}><Text style={s.summaryStatLabel}>Budget</Text><Text style={s.summaryStatValue}>{fmtMoney(parseFloat(budget.amount))}</Text></View>
        <View style={s.summaryStat}><Text style={s.summaryStatLabel}>Spent</Text><Text style={[s.summaryStatValue, { color: '#dc2626' }]}>{fmtMoney(spent)}</Text></View>
        <View style={s.summaryStat}><Text style={s.summaryStatLabel}>Remaining</Text><Text style={[s.summaryStatValue, { color: '#16a34a' }]}>{fmtMoney(remaining)}</Text></View>
      </View>
      <View style={s.progressWrap}>
        <View style={s.progressLabelRow}><Text style={s.progressLabel}>Budget utilisation</Text><Text style={s.progressLabel}>{pct.toFixed(1)}%</Text></View>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : colors.primary }]} /></View>
      </View>
      <View style={s.revExpRow}>
        <View style={s.revExpCard}><Text style={s.summaryStatLabel}>Revenue</Text><Text style={[s.summaryStatValue, { color: '#16a34a' }]}>{fmtMoney(totalRevenue)}</Text></View>
        <View style={s.revExpCard}><Text style={s.summaryStatLabel}>Expenses</Text><Text style={[s.summaryStatValue, { color: '#dc2626' }]}>{fmtMoney(totalExpenses)}</Text></View>
      </View>
      {expensesByCategory.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={s.catHeading}>Expenses by Category</Text>
          {expensesByCategory.map(c => {
            const catPct = totalExpenses ? (c.amount / totalExpenses) * 100 : 0;
            return (
              <View key={c.name} style={{ marginBottom: 8 }}>
                <View style={s.progressLabelRow}><Text style={s.catName}>{c.name}</Text><Text style={s.catName}>{fmtMoney(c.amount)}</Text></View>
                <View style={s.catTrack}><View style={[s.catFill, { width: `${catPct}%` }]} /></View>
              </View>
            );
          })}
        </View>
      )}
      <View style={[s.plCard, { backgroundColor: isProfit ? '#f0fdf4' : '#fef2f2' }]}>
        <Text style={s.plLabel}>Profit & Loss</Text>
        <Text style={[s.plValue, { color: isProfit ? '#15803d' : '#b91c1c' }]}>{isProfit ? '+' : '-'}{fmtMoney(Math.abs(netProfit))}</Text>
      </View>
    </View>
  );
}

const BudgetsScreen = () => {
  const qc = useQueryClient();
  const { currency: bizCurrency, fmt: fmtMoney } = useCurrency();

  const [dateMode, setDateMode] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { from, to } = useMemo(() => getDateRange(dateMode, customStart, customEnd), [dateMode, customStart, customEnd]);

  const { data: budData = { items: [], aggregate: {} }, isLoading, refetch } = useBudgets(from, to);
  const list = budData.items;
  const aggregate = budData.aggregate;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(makeEmptyForm(bizCurrency));
  const [expandedId, setExpandedId] = useState(null);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/budgets/${editing.id}`, data)
      : apiClient.post('/admin/budgets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save budget'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const openAdd = () => { setEditing(null); setForm(makeEmptyForm(bizCurrency)); setShowModal(true); };
  const openEdit = b => {
    setEditing(b);
    setForm({ name: b.name, period: b.period ?? 'monthly', startDate: b.startDate ?? '', endDate: b.endDate ?? '', amount: String(parseFloat(b.amount)), notes: b.notes ?? '', currency: b.currency ?? bizCurrency });
    setShowModal(true);
  };
  const handleSave = () => {
    if (!form.name.trim() || !form.amount || !form.startDate || !form.endDate) { Alert.alert('Error', 'Name, amount, and both dates are required'); return; }
    save.mutate({ name: form.name, period: form.period, startDate: form.startDate, endDate: form.endDate, amount: parseFloat(form.amount), notes: form.notes || undefined, currency: form.currency });
  };
  const handleDelete = b => Alert.alert('Delete Budget', `Delete "${b.name}"? Linked expenses will keep their data but lose the budget link.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(b.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Budgets & Earnings</Text>
        <HeaderAddButton onPress={openAdd} label="Add" />
      </View>

      <PeriodFilterRow
        mode={dateMode} onModeChange={setDateMode}
        customStart={customStart} onCustomStartChange={setCustomStart}
        customEnd={customEnd} onCustomEndChange={setCustomEnd}
      />

      <View style={s.aggregateRow}>
        <View style={[s.aggCard, { backgroundColor: '#eff6ff' }]}><Text style={s.aggLabel}>Total Budget</Text><Text style={[s.aggValue, { color: '#1d4ed8' }]}>{fmtMoney(aggregate.totalBudgetUSD ?? 0)}</Text></View>
        <View style={[s.aggCard, { backgroundColor: '#fef2f2' }]}><Text style={s.aggLabel}>Total Spent</Text><Text style={[s.aggValue, { color: '#b91c1c' }]}>{fmtMoney(aggregate.totalSpentAllUSD ?? 0)}</Text></View>
        <View style={[s.aggCard, { backgroundColor: '#f0fdf4' }]}><Text style={s.aggLabel}>Remaining</Text><Text style={[s.aggValue, { color: '#15803d' }]}>{fmtMoney(aggregate.totalRemainingUSD ?? 0)}</Text></View>
      </View>

      <FlatList
        data={list}
        keyExtractor={b => String(b.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No budgets yet. Create one to start tracking.</Text>}
        renderItem={({ item }) => {
          const budgetAmt = parseFloat(item.amount) || 0;
          const spentPct = budgetAmt ? Math.min(100, (item.spent / budgetAmt) * 100) : 0;
          return (
            <View style={s.card}>
              <TouchableOpacity onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                <View style={s.cardRow}>
                  <View style={s.cardLeft}>
                    <Text style={s.cardTitle}>{item.name}</Text>
                    <Text style={s.cardSub}>{item.period} · {fmt(item.startDate)} – {fmt(item.endDate)}</Text>
                  </View>
                  <Text style={s.amount}>{item.currency ?? 'USD'} {fmtAmt(budgetAmt)}</Text>
                </View>
                <View style={s.progressWrap}>
                  <View style={s.progressLabelRow}>
                    <Text style={s.progressLabel}>Spent {fmtAmt(item.spent)}</Text>
                    <Text style={s.progressLabel}>{spentPct.toFixed(0)}%</Text>
                  </View>
                  <View style={s.progressTrack}><View style={[s.progressFill, { width: `${spentPct}%`, backgroundColor: spentPct >= 90 ? '#ef4444' : spentPct >= 70 ? '#f59e0b' : colors.primary }]} /></View>
                </View>
              </TouchableOpacity>
              {item.notes ? <Text style={s.notes} numberOfLines={1}>{item.notes}</Text> : null}
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}><Text style={s.editText}>{expandedId === item.id ? 'Hide P&L' : 'View P&L'}</Text></TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Delete</Text></TouchableOpacity>
              </View>
              {expandedId === item.id && <SummaryPanel budgetId={item.id} fmtMoney={fmtMoney} />}
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Budget' : 'New Budget'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Budget Name *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={set('name')} placeholder="e.g. June 2026 Budget" placeholderTextColor="#999" />

              <Text style={s.label}>Period</Text>
              <View style={s.chips}>
                {PERIODS.map(p => (
                  <TouchableOpacity key={p} style={[s.chip, form.period === p && s.chipActive]} onPress={() => set('period')(p)}>
                    <Text style={[s.chipText, form.period === p && s.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <DatePicker
                  label="Start Date *"
                  value={form.startDate}
                  onDateChange={set('startDate')}
                  placeholder="Select start date"
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <DatePicker
                  label="End Date *"
                  value={form.endDate}
                  onDateChange={set('endDate')}
                  placeholder="Select end date"
                  minimumDate={form.startDate || undefined}
                  style={{ flex: 1, marginBottom: 0 }}
                />
              </View>

              <Text style={s.label}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CURRENCY_OPTIONS.map(c => (
                    <TouchableOpacity key={c} style={[s.chip, form.currency === c && s.chipActive]} onPress={() => set('currency')(c)}>
                      <Text style={[s.chipText, form.currency === c && s.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={s.label}>Budget Amount *</Text>
              <TextInput style={s.input} value={form.amount} onChangeText={set('amount')} placeholder="100000" placeholderTextColor="#999" keyboardType="decimal-pad" />

              <Text style={s.label}>Notes</Text>
              <TextInput style={s.input} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" />
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save Changes' : 'Create Budget'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  aggregateRow: { flexDirection: 'row', gap: 8, padding: 12 },
  aggCard: { flex: 1, borderRadius: 12, padding: 10 },
  aggLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 2 },
  aggValue: { fontSize: 14, fontFamily: 'Outfit-Bold' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  amount: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary, marginLeft: 8 },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  progressWrap: { marginTop: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  progressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  summaryPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryStat: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8 },
  summaryStatLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 2 },
  summaryStatValue: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  revExpRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  revExpCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10 },
  catHeading: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 8 },
  catName: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#374151' },
  catTrack: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2 },
  catFill: { height: '100%', borderRadius: 2, backgroundColor: '#60a5fa' },
  plCard: { borderRadius: 10, padding: 12, marginTop: 12 },
  plLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  plValue: { fontSize: 18, fontFamily: 'Outfit-Bold', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default BudgetsScreen;
