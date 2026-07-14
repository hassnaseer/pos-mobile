import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useExpenseCategories } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const INCOME_STATUSES = ['Paid', 'Pending', 'Received'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Other'];
const MILESTONE_STATUSES = ['Pending', 'In Progress', 'Completed'];
const MILESTONE_STATUS_STYLE = {
  Pending: { bg: '#f9fafb', text: '#6b7280' }, 'In Progress': { bg: '#eff6ff', text: '#1d4ed8' }, Completed: { bg: '#f0fdf4', text: '#15803d' },
};
const STATUS_STYLE = {
  Active: { bg: '#dcfce7', text: '#15803d' }, Completed: { bg: '#f3f4f6', text: '#4b5563' },
  'On Hold': { bg: '#fef9c3', text: '#a16207' }, Cancelled: { bg: '#fee2e2', text: '#b91c1c' },
};

const useProjectPL = id =>
  useQuery({ queryKey: ['project-pl', id], queryFn: async () => { const r = await apiClient.get(`/admin/projects/${id}/pl?groupBy=monthly`); return r?.data ?? r ?? null; }, enabled: !!id });

const useMilestones = (projectId, enabled) =>
  useQuery({ queryKey: ['project-milestones', projectId], queryFn: async () => { const r = await apiClient.get(`/admin/projects/${projectId}/milestones`); return r?.data ?? r ?? []; }, enabled });

const EMPTY_INCOME = { title: '', amount: '', status: 'Paid', incomeDate: new Date().toISOString().slice(0, 10), customerName: '', paymentMethod: 'Cash' };
const EMPTY_EXPENSE = { title: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), categoryId: '', notes: '' };
const EMPTY_MILESTONE = { title: '', description: '', dueDate: '', status: 'Pending', amount: '' };

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params ?? {};
  const { fmt } = useCurrency();
  const qc = useQueryClient();
  const { data: pl, isLoading, isFetching, refetch } = useProjectPL(projectId);
  const { data: rawCategories = [] } = useExpenseCategories();
  const categories = Array.isArray(rawCategories) ? rawCategories : (rawCategories?.data ?? []);

  const [tab, setTab] = useState('Overview');

  const isMilestone = !!pl?.project?.isMilestone;
  const { data: milestones = [] } = useMilestones(projectId, isMilestone);
  const TABS = ['Overview', 'Sales', 'Expenses', ...(isMilestone ? ['Milestones'] : [])];

  const reload = () => qc.invalidateQueries({ queryKey: ['project-pl', projectId] });
  const reloadMilestones = () => qc.invalidateQueries({ queryKey: ['project-milestones', projectId] });

  // Milestone modal
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE);
  const saveMilestoneMut = useMutation({
    mutationFn: () => editMilestone
      ? apiClient.patch(`/admin/projects/${projectId}/milestones/${editMilestone.id}`, { ...milestoneForm, amount: milestoneForm.amount ? parseFloat(milestoneForm.amount) : undefined })
      : apiClient.post(`/admin/projects/${projectId}/milestones`, { ...milestoneForm, amount: milestoneForm.amount ? parseFloat(milestoneForm.amount) : undefined }),
    onSuccess: () => { setMilestoneModal(false); reloadMilestones(); },
    onError: () => Alert.alert('Error', 'Failed to save milestone'),
  });
  const deleteMilestoneMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/milestones/${id}`),
    onSuccess: reloadMilestones,
    onError: () => Alert.alert('Error', 'Failed to delete milestone'),
  });
  const cycleMilestoneStatus = m => {
    const next = MILESTONE_STATUSES[(MILESTONE_STATUSES.indexOf(m.status) + 1) % MILESTONE_STATUSES.length];
    apiClient.patch(`/admin/projects/${projectId}/milestones/${m.id}`, { status: next }).then(reloadMilestones);
  };

  // Income modal
  const [incomeModal, setIncomeModal] = useState(false);
  const [editIncome, setEditIncome] = useState(null);
  const [incomeForm, setIncomeForm] = useState(EMPTY_INCOME);
  const saveIncomeMut = useMutation({
    mutationFn: () => editIncome
      ? apiClient.patch(`/admin/projects/${projectId}/incomes/${editIncome.id}`, incomeForm)
      : apiClient.post(`/admin/projects/${projectId}/incomes`, incomeForm),
    onSuccess: () => { setIncomeModal(false); reload(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save income'),
  });
  const deleteIncomeMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/incomes/${id}`),
    onSuccess: reload,
    onError: () => Alert.alert('Error', 'Failed to delete income'),
  });

  // Expense modal
  const [expenseModal, setExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const saveExpenseMut = useMutation({
    mutationFn: () => editExpense
      ? apiClient.patch(`/admin/projects/${projectId}/expenses/${editExpense.id}`, expenseForm)
      : apiClient.post(`/admin/projects/${projectId}/expenses`, expenseForm),
    onSuccess: () => { setExpenseModal(false); reload(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save expense'),
  });
  const deleteExpenseMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/expenses/${id}`),
    onSuccess: reload,
    onError: () => Alert.alert('Error', 'Failed to delete expense'),
  });

  if (isLoading || !pl) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const { project, totalIncome, totalExpense, netProfit, companyEarning } = pl;
  const incomes = pl.incomes ?? [];
  const expenses = pl.expenses ?? [];
  const outstanding = incomes.reduce((s, i) => {
    const amt = parseFloat(i.amount ?? 0);
    const recv = parseFloat(i.receivedAmount ?? 0) || (i.status === 'Paid' || i.status === 'Received' ? amt : 0);
    return s + (amt - recv);
  }, 0);
  const roiPct = totalExpense > 0 ? (netProfit / totalExpense) * 100 : null;
  const statusBadge = STATUS_STYLE[project.status] ?? { bg: '#f3f4f6', text: '#374151' };

  const openAddIncome = () => { setEditIncome(null); setIncomeForm(EMPTY_INCOME); setIncomeModal(true); };
  const openEditIncome = i => {
    setEditIncome(i);
    setIncomeForm({ title: i.title, amount: String(parseFloat(i.amount)), status: i.status ?? 'Paid', incomeDate: i.incomeDate?.slice(0, 10), customerName: i.customerName ?? '', paymentMethod: i.paymentMethod ?? 'Cash' });
    setIncomeModal(true);
  };
  const handleSaveIncome = () => {
    if (!incomeForm.title.trim() || !incomeForm.amount) { Alert.alert('Error', 'Title and amount are required'); return; }
    saveIncomeMut.mutate();
  };
  const handleDeleteIncome = i => Alert.alert('Delete Income', `Delete "${i.title}"?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteIncomeMut.mutate(i.id) },
  ]);

  const openAddExpense = () => { setEditExpense(null); setExpenseForm(EMPTY_EXPENSE); setExpenseModal(true); };
  const openEditExpense = e => {
    setEditExpense(e);
    setExpenseForm({ title: e.title, amount: String(parseFloat(e.amount)), expenseDate: e.expenseDate?.slice(0, 10), categoryId: e.category?.id ?? '', notes: e.notes ?? '' });
    setExpenseModal(true);
  };
  const handleSaveExpense = () => {
    if (!expenseForm.title.trim() || !expenseForm.amount) { Alert.alert('Error', 'Title and amount are required'); return; }
    saveExpenseMut.mutate();
  };
  const handleDeleteExpense = e => Alert.alert('Delete Expense', `Delete "${e.title}"?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteExpenseMut.mutate(e.id) },
  ]);

  const milestoneList = Array.isArray(milestones) ? milestones : (milestones?.data ?? []);
  const msTotal = milestoneList.length;
  const msCompleted = milestoneList.filter(m => m.status === 'Completed').length;
  const msProgress = msTotal > 0 ? Math.round((msCompleted / msTotal) * 100) : 0;

  const openAddMilestone = () => { setEditMilestone(null); setMilestoneForm(EMPTY_MILESTONE); setMilestoneModal(true); };
  const openEditMilestone = m => {
    setEditMilestone(m);
    setMilestoneForm({ title: m.title, description: m.description ?? '', dueDate: m.dueDate ?? '', status: m.status ?? 'Pending', amount: m.amount ? String(parseFloat(m.amount)) : '' });
    setMilestoneModal(true);
  };
  const handleSaveMilestone = () => {
    if (!milestoneForm.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    saveMilestoneMut.mutate();
  };
  const handleDeleteMilestone = m => Alert.alert('Delete Milestone', `Delete "${m.title}"?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMilestoneMut.mutate(m.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>{project.name}</Text>
        <View style={styles.headerMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}><Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>{project.status}</Text></View>
          {project.accountCode ? <Text style={styles.metaText}>#{project.accountCode}</Text> : null}
          {(project.projectClient?.name || project.customer?.name) ? <Text style={styles.metaText}>{project.projectClient?.name ?? project.customer?.name}</Text> : null}
        </View>
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'Overview' && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Total Income</Text><Text style={styles.kpiValue}>{fmt(totalIncome)}</Text></View>
            <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Outstanding</Text><Text style={[styles.kpiValue, { color: '#b45309' }]}>{fmt(outstanding)}</Text></View>
            <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Total Expenses</Text><Text style={styles.kpiValue}>{fmt(totalExpense)}</Text></View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Profit</Text>
              <Text style={[styles.kpiValue, { color: netProfit >= 0 ? '#15803d' : '#dc2626' }]}>{fmt(netProfit)}</Text>
            </View>
            {roiPct != null && <View style={styles.kpiCard}><Text style={styles.kpiLabel}>ROI</Text><Text style={styles.kpiValue}>{roiPct.toFixed(1)}%</Text></View>}
            <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Company Earning</Text><Text style={styles.kpiValue}>{fmt(companyEarning)}</Text></View>
          </View>

          {(pl.expensesByCategory ?? []).length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Expenses by Category</Text>
              {pl.expensesByCategory.map((c, i) => (
                <View key={i} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{c.name}</Text>
                  <Text style={styles.breakdownValue}>{fmt(c.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {project.description ? (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Description</Text>
              <Text style={styles.descText}>{project.description}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {tab === 'Sales' && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addBtn} onPress={openAddIncome}><Text style={styles.addBtnText}>+ Add Income Entry</Text></TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          >
            {incomes.length === 0 ? <Text style={styles.empty}>No sales entries yet.</Text> : incomes.map(i => (
              <View key={i.id} style={styles.entryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>{i.title}</Text>
                  <Text style={styles.entrySub}>{i.incomeDate?.slice(0, 10)} · {i.status}{i.customerName ? ` · ${i.customerName}` : ''}</Text>
                </View>
                <Text style={styles.entryAmount}>{fmt(parseFloat(i.amount))}</Text>
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => openEditIncome(i)}><Text style={styles.entryEdit}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteIncome(i)}><Text style={styles.entryDel}>Del</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {tab === 'Expenses' && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addBtn} onPress={openAddExpense}><Text style={styles.addBtnText}>+ Add Expense</Text></TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          >
            {expenses.length === 0 ? <Text style={styles.empty}>No expenses yet.</Text> : expenses.map(e => (
              <View key={e.id} style={styles.entryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>{e.title}</Text>
                  <Text style={styles.entrySub}>{e.expenseDate?.slice(0, 10)}{e.category?.name ? ` · ${e.category.name}` : ''}</Text>
                </View>
                <Text style={styles.entryAmount}>{fmt(parseFloat(e.amount))}</Text>
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => openEditExpense(e)}><Text style={styles.entryEdit}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExpense(e)}><Text style={styles.entryDel}>Del</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {tab === 'Milestones' && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addBtn} onPress={openAddMilestone}><Text style={styles.addBtnText}>+ Add Milestone</Text></TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          >
            {msTotal > 0 && (
              <View style={styles.breakdownCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.breakdownTitle}>Overall Progress</Text>
                  <Text style={styles.progressText}>{msCompleted}/{msTotal} · {msProgress}%</Text>
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${msProgress}%` }]} /></View>
              </View>
            )}
            {msTotal === 0 ? <Text style={styles.empty}>No milestones yet.</Text> : milestoneList.map((m, idx) => {
              const msBadge = MILESTONE_STATUS_STYLE[m.status] ?? MILESTONE_STATUS_STYLE.Pending;
              return (
                <View key={m.id} style={styles.milestoneCard}>
                  <TouchableOpacity style={styles.milestoneNum} onPress={() => cycleMilestoneStatus(m)}>
                    <Text style={styles.milestoneNumText}>{idx + 1}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, m.status === 'Completed' && { textDecorationLine: 'line-through', color: '#9ca3af' }]}>{m.title}</Text>
                    {m.description ? <Text style={styles.entrySub}>{m.description}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <View style={[styles.badge, { backgroundColor: msBadge.bg }]}><Text style={[styles.badgeText, { color: msBadge.text }]}>{m.status}</Text></View>
                      {m.dueDate ? <Text style={styles.entrySub}>{String(m.dueDate).slice(0, 10)}</Text> : null}
                      {m.amount ? <Text style={styles.milestoneAmount}>{fmt(parseFloat(m.amount))}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.entryActions}>
                    <TouchableOpacity onPress={() => openEditMilestone(m)}><Text style={styles.entryEdit}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMilestone(m)}><Text style={styles.entryDel}>Del</Text></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Modal visible={milestoneModal} animationType="slide" transparent onRequestClose={() => setMilestoneModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={styles.modalTitle}>{editMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={milestoneForm.title} onChangeText={v => setMilestoneForm(f => ({ ...f, title: v }))} placeholder="e.g. Design Approval" placeholderTextColor="#999" />
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={milestoneForm.description} onChangeText={v => setMilestoneForm(f => ({ ...f, description: v }))} placeholder="Optional details…" placeholderTextColor="#999" />
            <DatePicker
              label="Due Date"
              value={milestoneForm.dueDate}
              onDateChange={v => setMilestoneForm(f => ({ ...f, dueDate: v }))}
              placeholder="Select due date"
            />
            <Text style={styles.label}>Status</Text>
            <InlinePicker options={MILESTONE_STATUSES.map(st => ({ id: st, name: st }))} value={milestoneForm.status} onSelect={v => setMilestoneForm(f => ({ ...f, status: v }))} placeholder="Select status" allowNone={false} />
            <Text style={styles.label}>Milestone Amount</Text>
            <TextInput style={styles.input} value={milestoneForm.amount} onChangeText={v => setMilestoneForm(f => ({ ...f, amount: v }))} placeholder="0.00 (optional)" placeholderTextColor="#999" keyboardType="decimal-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMilestoneModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMilestone} disabled={saveMilestoneMut.isPending}>
                {saveMilestoneMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editMilestone ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={incomeModal} animationType="slide" transparent onRequestClose={() => setIncomeModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={styles.modalTitle}>{editIncome ? 'Edit Income' : 'Add Income Entry'}</Text>
            <Text style={styles.label}>Title / Description *</Text>
            <TextInput style={styles.input} value={incomeForm.title} onChangeText={v => setIncomeForm(f => ({ ...f, title: v }))} placeholder="e.g. TikTok sales — June 10" placeholderTextColor="#999" />
            <Text style={styles.label}>Amount *</Text>
            <TextInput style={styles.input} value={incomeForm.amount} onChangeText={v => setIncomeForm(f => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
            <DatePicker
              label="Sale Date"
              value={incomeForm.incomeDate}
              onDateChange={v => setIncomeForm(f => ({ ...f, incomeDate: v }))}
              placeholder="Select sale date"
            />
            <Text style={styles.label}>Status</Text>
            <InlinePicker options={INCOME_STATUSES.map(s => ({ id: s, name: s }))} value={incomeForm.status} onSelect={v => setIncomeForm(f => ({ ...f, status: v }))} placeholder="Select status" allowNone={false} />
            <Text style={styles.label}>Customer Name</Text>
            <TextInput style={styles.input} value={incomeForm.customerName} onChangeText={v => setIncomeForm(f => ({ ...f, customerName: v }))} placeholder="Optional" placeholderTextColor="#999" />
            <Text style={styles.label}>Payment Method</Text>
            <InlinePicker options={PAYMENT_METHODS.map(m => ({ id: m, name: m }))} value={incomeForm.paymentMethod} onSelect={v => setIncomeForm(f => ({ ...f, paymentMethod: v }))} placeholder="Select method" allowNone={false} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIncomeModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveIncome} disabled={saveIncomeMut.isPending}>
                {saveIncomeMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editIncome ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={expenseModal} animationType="slide" transparent onRequestClose={() => setExpenseModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={styles.modalTitle}>{editExpense ? 'Edit Expense' : 'Add Expense'}</Text>
            <Text style={styles.label}>Title / Description *</Text>
            <TextInput style={styles.input} value={expenseForm.title} onChangeText={v => setExpenseForm(f => ({ ...f, title: v }))} placeholder="e.g. Facebook Ads — June" placeholderTextColor="#999" />
            <Text style={styles.label}>Amount *</Text>
            <TextInput style={styles.input} value={expenseForm.amount} onChangeText={v => setExpenseForm(f => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
            <DatePicker
              label="Expense Date"
              value={expenseForm.expenseDate}
              onDateChange={v => setExpenseForm(f => ({ ...f, expenseDate: v }))}
              placeholder="Select expense date"
            />
            <Text style={styles.label}>Category</Text>
            <InlinePicker options={categories.map(c => ({ id: c.id, name: c.name }))} value={expenseForm.categoryId} onSelect={v => setExpenseForm(f => ({ ...f, categoryId: v }))} placeholder="Select category" />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={expenseForm.notes} onChangeText={v => setExpenseForm(f => ({ ...f, notes: v }))} placeholder="Optional" placeholderTextColor="#999" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setExpenseModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExpense} disabled={saveExpenseMut.isPending}>
                {saveExpenseMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editExpense ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 10 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  headerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 3, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  tabTextActive: { color: '#111827', fontFamily: 'Outfit-SemiBold' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  kpiLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  kpiValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 4 },
  breakdownCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  breakdownTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakdownLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  breakdownValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  descText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 19 },
  progressText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#111827' },
  progressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  milestoneCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8, marginTop: 10 },
  milestoneNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  milestoneNumText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#6b7280' },
  milestoneAmount: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  addBtn: { margin: 16, marginBottom: 0, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 30 },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  entryTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  entrySub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  entryAmount: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  entryActions: { gap: 4 },
  entryEdit: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  entryDel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
