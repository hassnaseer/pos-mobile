import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useExpenseCategories } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import { getDateRange } from '../../../../utils/dateRangeFilter';
import PeriodFilterRow from '../../../../components/PeriodFilterRow';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtAmt = n => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'BDT', 'CAD', 'AUD', 'NZD', 'SGD', 'MYR', 'THB', 'JPY', 'CNY', 'KRW', 'TRY', 'ZAR', 'NGN'];

const STATUS_COLOR = {
  Approved: { bg: '#f0fdf4', text: '#16a34a' },
  Pending:  { bg: '#fefce8', text: '#b45309' },
  Rejected: { bg: '#fef2f2', text: '#dc2626' },
};
const STATUSES = ['Approved', 'Pending', 'Rejected'];
const makeEmptyForm = currency => ({
  title: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '', budgetId: '', notes: '', receiptUrl: '', status: 'Approved', currency,
});

const useExpenses = params =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
      const r = await apiClient.get(`/admin/expenses${qs ? `?${qs}` : ''}`);
      return r?.data ?? r ?? [];
    },
    staleTime: 30_000,
  });

const useBudgets = () =>
  useQuery({
    queryKey: ['budgets'],
    queryFn: async () => { const r = await apiClient.get('/admin/budgets'); return r?.data ?? r ?? []; },
    staleTime: 60_000,
  });

const ExpensesScreen = () => {
  const qc = useQueryClient();
  const { currency: bizCurrency, fmt: fmtMoney } = useCurrency();
  const [filters, setFilters] = useState({ status: '', categoryId: '', budgetId: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [dateMode, setDateMode] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { from, to } = useMemo(() => getDateRange(dateMode, customStart, customEnd), [dateMode, customStart, customEnd]);

  const { data: raw = [], isLoading, refetch } = useExpenses({ ...filters, from, to });
  const { data: catRaw = [] } = useExpenseCategories();
  const { data: budRaw = [] } = useBudgets();
  const list = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
  const cats = Array.isArray(catRaw) ? catRaw : (catRaw?.data ?? []);
  const budgets = Array.isArray(budRaw) ? budRaw : (budRaw?.data ?? []);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(makeEmptyForm(bizCurrency));
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const totalApproved = list.filter(e => e.status === 'Approved').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalPending = list.filter(e => e.status === 'Pending').reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/expenses/${editing.id}`, data)
      : apiClient.post('/admin/expenses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save expense'),
  });

  const approve = useMutation({
    mutationFn: id => apiClient.patch(`/admin/expenses/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: () => Alert.alert('Error', 'Failed to approve'),
  });

  const reject = useMutation({
    mutationFn: id => apiClient.patch(`/admin/expenses/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: () => Alert.alert('Error', 'Failed to reject'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const openAdd = () => { setEditing(null); setForm(makeEmptyForm(bizCurrency)); setShowModal(true); };
  const openEdit = e => {
    setEditing(e);
    setForm({
      title: e.title, amount: String(parseFloat(e.amount)), expenseDate: e.expenseDate ?? '',
      notes: e.notes ?? '', status: e.status ?? 'Approved', categoryId: e.category?.id ?? '',
      budgetId: e.budget?.id ?? '', receiptUrl: e.receiptUrl ?? '', currency: e.currency ?? bizCurrency,
    });
    setShowModal(true);
  };
  const handleSave = () => {
    if (!form.title.trim() || !form.amount || !form.expenseDate) { Alert.alert('Error', 'Title, amount, and date are required'); return; }
    save.mutate({
      title: form.title, amount: parseFloat(form.amount), expenseDate: form.expenseDate,
      categoryId: form.categoryId || undefined, budgetId: form.budgetId || undefined,
      notes: form.notes || undefined, receiptUrl: form.receiptUrl || undefined,
      status: form.status, currency: form.currency,
    });
  };
  const handleDelete = e => Alert.alert('Delete Expense', `Delete "${e.title}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(e.id) },
  ]);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Expenses</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(f => !f)}><Text style={s.filterBtnText}>Filter</Text></TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
        </View>
      </View>

      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={s.summaryLabel}>Total Approved</Text>
          <Text style={[s.summaryValue, { color: '#b91c1c' }]}>{fmtMoney(totalApproved)}</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: '#fefce8' }]}>
          <Text style={s.summaryLabel}>Pending Approval</Text>
          <Text style={[s.summaryValue, { color: '#a16207' }]}>{fmtMoney(totalPending)}</Text>
        </View>
      </View>

      {showFilters && (
        <>
          <PeriodFilterRow
            mode={dateMode} onModeChange={setDateMode}
            customStart={customStart} onCustomStartChange={setCustomStart}
            customEnd={customEnd} onCustomEndChange={setCustomEnd}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
            {['', ...STATUSES].map(st => (
              <TouchableOpacity key={st || 'all'} style={[s.chip, filters.status === st && s.chipActive]} onPress={() => setFilters(f => ({ ...f, status: st }))}>
                <Text style={[s.chipText, filters.status === st && s.chipTextActive]}>{st || 'All Status'}</Text>
              </TouchableOpacity>
            ))}
            {cats.map(c => (
              <TouchableOpacity key={c.id} style={[s.chip, filters.categoryId === c.id && s.chipActive]} onPress={() => setFilters(f => ({ ...f, categoryId: f.categoryId === c.id ? '' : c.id }))}>
                <Text style={[s.chipText, filters.categoryId === c.id && s.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            {budgets.map(b => (
              <TouchableOpacity key={b.id} style={[s.chip, filters.budgetId === b.id && s.chipActive]} onPress={() => setFilters(f => ({ ...f, budgetId: f.budgetId === b.id ? '' : b.id }))}>
                <Text style={[s.chipText, filters.budgetId === b.id && s.chipTextActive]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <FlatList
        data={list}
        keyExtractor={e => String(e.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No expenses found.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151' };
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={s.cardLeft}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardSub}>{fmt(item.expenseDate)}{item.category?.name ? ` · ${item.category.name}` : ''}{item.budget?.name ? ` · ${item.budget.name}` : ''}</Text>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.amount}>{item.currency ?? 'USD'} {fmtAmt(item.amount)}</Text>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}><Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text></View>
                </View>
              </View>
              {item.notes ? <Text style={s.notes} numberOfLines={1}>{item.notes}</Text> : null}
              {item.receiptUrl ? <Text style={s.receiptLink} numberOfLines={1}>📎 {item.receiptUrl}</Text> : null}
              <View style={s.actions}>
                {item.status === 'Pending' && (
                  <>
                    <TouchableOpacity style={s.approveBtn} onPress={() => approve.mutate(item.id)}><Text style={s.approveText}>Approve</Text></TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => reject.mutate(item.id)}><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}><Text style={s.delText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Expense' : 'New Expense'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Title *</Text>
              <TextInput style={s.input} value={form.title} onChangeText={set('title')} placeholder="e.g. June Internet Bill" placeholderTextColor="#999" />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Amount *</Text>
                  <TextInput style={s.input} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                </View>
                <DatePicker
                  label="Date *"
                  value={form.expenseDate}
                  onDateChange={set('expenseDate')}
                  placeholder="Select date"
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

              <Text style={s.label}>Receipt URL</Text>
              <TextInput style={s.input} value={form.receiptUrl} onChangeText={set('receiptUrl')} placeholder="https://…" placeholderTextColor="#999" autoCapitalize="none" />

              <Text style={s.label}>Notes</Text>
              <TextInput style={s.input} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" />

              <Text style={s.label}>Status</Text>
              <View style={s.chips}>
                {STATUSES.map(st => (
                  <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => set('status')(st)}>
                    <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[s.chip, !form.categoryId && s.chipActive]} onPress={() => set('categoryId')('')}>
                    <Text style={[s.chipText, !form.categoryId && s.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {cats.map(c => (
                    <TouchableOpacity key={c.id} style={[s.chip, form.categoryId === c.id && s.chipActive]} onPress={() => set('categoryId')(c.id)}>
                      <Text style={[s.chipText, form.categoryId === c.id && s.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={s.label}>Budget</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[s.chip, !form.budgetId && s.chipActive]} onPress={() => set('budgetId')('')}>
                    <Text style={[s.chipText, !form.budgetId && s.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {budgets.map(b => (
                    <TouchableOpacity key={b.id} style={[s.chip, form.budgetId === b.id && s.chipActive]} onPress={() => set('budgetId')(b.id)}>
                      <Text style={[s.chipText, form.budgetId === b.id && s.chipTextActive]}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save Changes' : 'Add Expense'}</Text>}
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
  filterBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  filterBtnText: { color: '#374151', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 3 },
  summaryValue: { fontSize: 16, fontFamily: 'Outfit-Bold' },
  filterScroll: { flexGrow: 0, marginBottom: 4 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#94a3b8', marginTop: 6 },
  receiptLink: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  approveBtn: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  approveText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  rejectBtn: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  rejectText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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

export default ExpensesScreen;
