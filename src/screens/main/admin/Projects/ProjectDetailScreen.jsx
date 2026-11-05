import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl, Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pick, types, isCancel } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import apiClient from '../../../../services/api/globalApi';
import { useExpenseCategories, useCustomers, useCreateCustomer } from '../../../../services/api/posApi';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import { compactAmt } from '../../../../utils/currency';
import { usePermissions } from '../../../../hooks/usePermissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import PhoneInput from '../../../../components/PhoneInput/PhoneInput';
import { getCategoryDef } from '../../../../config/projectCategories';
import CallCenterEntriesTab from './CallCenterEntriesTab';
import CategoryEntriesTab from './CategoryEntriesTab';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

// eBay/TikTok Shop are the two platforms with real push-listing support today (see
// docs/Store-Integrations-Sync-Plan.md); other permitted platforms can still be connected here
// for project_income order sync, they just can't push new listings yet.
const LISTING_PLATFORMS = [
  { id: 'ebay', label: 'eBay' },
  { id: 'tiktokshop', label: 'TikTok Shop' },
];

const useProjectConnections = projectId =>
  useQuery({
    queryKey: ['project-ecommerce', projectId],
    queryFn: async () => { const r = await apiClient.get(`/admin/projects/${projectId}/ecommerce`); return r?.data ?? r ?? []; },
    enabled: !!projectId,
  });

const useProjectListings = projectId =>
  useQuery({
    queryKey: ['project-listings', projectId],
    queryFn: async () => { const r = await apiClient.get(`/admin/projects/${projectId}/listings`); return r?.data ?? r ?? []; },
    enabled: !!projectId,
  });

// Minimal CSV parser — handles quoted fields and embedded commas (same shape as
// BulkOperationsScreen.jsx's local parser).
const parseCsv = text => {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const splitLine = line => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(v => v.trim());
  };
  const headers = splitLine(lines[0]).map(h => h.toLowerCase());
  const rows = lines.slice(1).map(l => {
    const vals = splitLine(l);
    return headers.reduce((o, h, i) => { o[h] = vals[i] ?? ''; return o; }, {});
  });
  return { headers, rows };
};

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);

// Matches web's IncomeFormDialog.tsx exactly
const SALE_STATUSES = ['Paid', 'Partially Received', 'Pending'];
const SALE_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Online', 'Other'];
const deriveStatus = (amount, receivedAmount) => {
  const amt = parseFloat(amount || '0');
  const recv = parseFloat(receivedAmount || '0');
  if (recv <= 0 || amt <= 0) return 'Pending';
  if (recv >= amt) return 'Paid';
  return 'Partially Received';
};
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

const todayStr = () => new Date().toISOString().slice(0, 10);
const makeEmptyIncome = currency => ({
  title: '', amount: '', receivedAmount: '', status: 'Paid',
  incomeDate: todayStr(), paymentMethod: 'Cash',
  customerName: '', customerOrderNumber: '', orderNumber: '', trackingNumber: '', deliveryDate: '',
  quantity: '1', itemCost: '', taxAmount: '',
  cardUsed: '', notes: '', currency,
});
const EMPTY_EXPENSE = { title: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), categoryId: '', notes: '' };
const EMPTY_MILESTONE = { title: '', description: '', dueDate: '', status: 'Pending', amount: '' };

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params ?? {};
  const { currency: bizCurrency, rates } = useCurrency();
  const qc = useQueryClient();
  const { data: pl, isLoading, isFetching, refetch } = useProjectPL(projectId);
  const { data: rawCategories = [] } = useExpenseCategories();
  const categories = Array.isArray(rawCategories) ? rawCategories : (rawCategories?.data ?? []);

  const [tab, setTab] = useState('Overview');
  const [displayCurrency, setDisplayCurrency] = useState(bizCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // pl totals are USD-denominated — convert for display the same way web's
  // projectFmt does (frontend/src/app/pages/admin/projects/detail.tsx:221-225).
  const fmt = usdAmt => {
    const displayAmt = (usdAmt ?? 0) * (rates?.[displayCurrency] ?? 1);
    const sym = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency + ' ';
    return compactAmt(sym, displayAmt);
  };

  const isMilestone = !!pl?.project?.isMilestone;
  const { data: milestones = [] } = useMilestones(projectId, isMilestone);
  // category's entryTable ('ecommerce' | 'call_center' | 'universal' | null) drives which
  // Sales/Entries UI (if any) shows — null/unset category always resolves to 'ecommerce'
  // (getCategoryDef), so existing e-commerce projects are completely unaffected.
  const categoryDef = getCategoryDef(pl?.project?.category);
  const entryKind = categoryDef.entryTable;
  const salesTabLabel = entryKind === 'call_center' ? 'Call Center' : entryKind === 'universal' ? 'Entries' : 'Sales';
  const TABS = ['Overview', ...(entryKind ? [salesTabLabel] : []), 'Expenses', ...(isMilestone ? ['Milestones'] : []), 'Product Listings'];

  const reload = () => qc.invalidateQueries({ queryKey: ['project-pl', projectId] });
  const reloadMilestones = () => qc.invalidateQueries({ queryKey: ['project-milestones', projectId] });

  // ── Product Listings tab (per-project ecommerce account + push-listing) ──────────────────
  const perms = usePermissions();
  const { data: connections = [], refetch: refetchConnections } = useProjectConnections(projectId);
  const { data: listings = [], refetch: refetchListings } = useProjectListings(projectId);
  const reloadListingsTab = () => { refetchConnections(); refetchListings(); };

  const [connectModal, setConnectModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const syncConnectionMut = useMutation({
    mutationFn: platform => apiClient.patch(`/admin/projects/${projectId}/ecommerce/${platform}/sync`),
    onSuccess: reloadListingsTab,
    onError: () => Alert.alert('Error', 'Sync failed'),
  });
  const disconnectConnectionMut = useMutation({
    mutationFn: platform => apiClient.delete(`/admin/projects/${projectId}/ecommerce/${platform}/disconnect`),
    onSuccess: reloadListingsTab,
    onError: () => Alert.alert('Error', 'Failed to disconnect'),
  });
  const handleConnectPlatform = async platformId => {
    setConnecting(true);
    try {
      const res = await apiClient.get(`/admin/projects/${projectId}/ecommerce/${platformId}/auth-url`);
      const url = res?.data?.url ?? res?.url;
      if (!url) throw new Error('Failed to get auth URL');
      setConnectModal(false);
      await Linking.openURL(url);
      Alert.alert('Continue in browser', 'Finish connecting your account in the browser, then come back and pull down to refresh.');
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : (e?.message || 'Failed to start connection'));
    } finally { setConnecting(false); }
  };
  const handleDisconnectPlatform = platform => Alert.alert('Disconnect', `Disconnect ${platform}? Listings already pushed will remain.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => disconnectConnectionMut.mutate(platform) },
  ]);

  // Add Listing modal
  const [listingModal, setListingModal] = useState(false);
  const [listingConnId, setListingConnId] = useState('');
  const [listingForm, setListingForm] = useState({ name: '', description: '', price: '', stock: '', category: '' });
  const pushableConnections = connections.filter(c => c.isActive);
  const createListingMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/projects/${projectId}/listings`, {
      connectionId: listingConnId,
      name: listingForm.name,
      description: listingForm.description || undefined,
      price: parseFloat(listingForm.price) || 0,
      stock: parseInt(listingForm.stock, 10) || 0,
      category: listingForm.category || undefined,
    }),
    onSuccess: () => { setListingModal(false); reloadListingsTab(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : (e?.message || 'Failed to create listing')),
  });
  const openAddListing = () => {
    setListingForm({ name: '', description: '', price: '', stock: '', category: '' });
    setListingConnId(pushableConnections[0]?.id ?? '');
    setListingModal(true);
  };
  const handleSaveListing = () => {
    if (!listingConnId || !listingForm.name.trim()) { Alert.alert('Error', 'Pick a connection and enter a name'); return; }
    createListingMut.mutate();
  };

  // Bulk CSV import of listings
  const [importing, setImporting] = useState(false);
  const handleImportListings = async () => {
    if (pushableConnections.length === 0) { Alert.alert('Error', 'Connect an account first'); return; }
    const connectionId = pushableConnections[0].id;
    let picked;
    try { [picked] = await pick({ type: [types.csv, types.plainText, types.allFiles] }); }
    catch (e) { if (!isCancel(e)) Alert.alert('Error', 'Could not pick file'); return; }
    if (!picked?.uri) return;
    setImporting(true);
    try {
      const text = await RNFS.readFile(picked.uri, 'utf8');
      const { rows } = parseCsv(text);
      if (!rows.length) { Alert.alert('Error', 'File has no data rows'); return; }
      const mapped = rows.map(r => ({
        name: r.name, description: r.description || undefined,
        price: r.price ? parseFloat(r.price) : undefined,
        stock: r.stock ? parseFloat(r.stock) : undefined,
        category: r.category || undefined,
        imageUrl: r.imageurl || undefined,
      })).filter(r => r.name);
      const res = await apiClient.post(`/admin/projects/${projectId}/listings/import`, { connectionId, rows: mapped });
      const data = res?.data ?? res ?? {};
      Alert.alert('Import complete', `${data.success ?? 0} listing(s) imported${data.errors?.length ? `, ${data.errors.length} failed` : ''}`);
      reloadListingsTab();
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Import failed');
    } finally { setImporting(false); }
  };

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
  const [incomeForm, setIncomeForm] = useState(() => makeEmptyIncome(bizCurrency));
  const [dupWarning, setDupWarning] = useState({});
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [newCustomerModal, setNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const { data: rawCustomers = [] } = useCustomers();
  const customersList = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const { mutateAsync: createCustomer, isPending: creatingCustomer } = useCreateCustomer();

  const saveIncomeMut = useMutation({
    mutationFn: () => {
      const amt = parseFloat(incomeForm.amount);
      const recvRaw = parseFloat(incomeForm.receivedAmount || '0');
      const recv = recvRaw > 0 ? recvRaw : (incomeForm.status === 'Paid' ? amt : 0);
      const derivedStatus = recv >= amt ? 'Paid' : recv > 0 ? 'Partially Received' : 'Pending';
      const incomeRate = rates?.[incomeForm.currency];
      const amountInUSD = incomeRate ? amt / incomeRate : undefined;
      const payload = {
        title: incomeForm.title, amount: amt,
        receivedAmount: recv, status: derivedStatus,
        incomeDate: incomeForm.incomeDate,
        paymentMethod: incomeForm.paymentMethod || undefined,
        customerName: incomeForm.customerName || undefined,
        customerOrderNumber: incomeForm.customerOrderNumber || undefined,
        orderNumber: incomeForm.orderNumber || undefined,
        trackingNumber: incomeForm.trackingNumber || undefined,
        deliveryDate: incomeForm.deliveryDate || undefined,
        quantity: incomeForm.quantity ? parseInt(incomeForm.quantity, 10) : 1,
        itemCost: incomeForm.itemCost ? parseFloat(incomeForm.itemCost) : undefined,
        itemCostType: 'total',
        taxAmount: incomeForm.taxAmount ? parseFloat(incomeForm.taxAmount) : undefined,
        taxAmountType: 'total',
        cardUsed: incomeForm.cardUsed || undefined,
        notes: incomeForm.notes || undefined,
        currency: incomeForm.currency, amountInUSD,
      };
      return editIncome
        ? apiClient.patch(`/admin/projects/${projectId}/incomes/${editIncome.id}`, payload)
        : apiClient.post(`/admin/projects/${projectId}/incomes`, payload);
    },
    onSuccess: () => { setIncomeModal(false); reload(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save income'),
  });
  const deleteIncomeMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/incomes/${id}`),
    onSuccess: reload,
    onError: () => Alert.alert('Error', 'Failed to delete income'),
  });

  const checkIncomeDuplicate = async (field, value) => {
    if (!value) return;
    try {
      const qs = field === 'orderNumber' ? `orderNumber=${encodeURIComponent(value)}` : `trackingNumber=${encodeURIComponent(value)}`;
      const res = await apiClient.get(`/admin/projects/${projectId}/incomes/check-duplicate?${qs}`);
      const data = res?.data ?? res;
      if (data?.isDuplicate) {
        setDupWarning(w => ({ ...w, [field]: `Already exists (added ${data.existing?.incomeDate?.slice(0, 10) ?? ''})` }));
      }
    } catch { /* non-fatal — duplicate check is advisory only */ }
  };

  const entryFmt = (amount, currency) => {
    const c = currency ?? bizCurrency;
    const sym = CURRENCY_SYMBOLS[c] ?? c + ' ';
    return `${sym}${(parseFloat(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      await createCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone || undefined });
      setIncomeForm(f => ({ ...f, customerName: newCustomerName.trim() }));
      setNewCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to add customer'); }
  };

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
  const callCenterEntries = pl.callCenterEntries ?? [];
  const categoryEntries = pl.categoryEntries ?? [];
  const assignees = project.assignees ?? [];
  const outstanding = incomes.reduce((s, i) => {
    const amt = parseFloat(i.amount ?? 0);
    const recv = parseFloat(i.receivedAmount ?? 0) || (i.status === 'Paid' || i.status === 'Received' ? amt : 0);
    return s + (amt - recv);
  }, 0);
  const roiPct = totalExpense > 0 ? (netProfit / totalExpense) * 100 : null;
  const statusBadge = STATUS_STYLE[project.status] ?? { bg: '#f3f4f6', text: '#374151' };

  const openAddIncome = () => {
    setEditIncome(null);
    setIncomeForm(makeEmptyIncome(bizCurrency));
    setDupWarning({});
    setCustomerSearch('');
    setCustomerDropOpen(false);
    setIncomeModal(true);
  };
  const openEditIncome = i => {
    setEditIncome(i);
    const recvRaw = parseFloat(i.receivedAmount ?? '0');
    const qty = i.quantity ?? 1;
    // Cost/tax are now always stored as the line total. Older rows saved before this
    // change may still carry itemCostType/taxAmountType 'per_unit' — convert those to
    // their total-equivalent here (matches web's IncomeFormDialog.tsx:82-89).
    const itemCostRaw = i.itemCost ? parseFloat(i.itemCost) : 0;
    const itemCostTotal = i.itemCostType === 'per_unit' ? itemCostRaw * qty : itemCostRaw;
    const taxRaw = i.taxAmount ? parseFloat(i.taxAmount) : 0;
    const taxTotal = i.taxAmountType === 'per_unit' ? taxRaw * qty : taxRaw;
    setIncomeForm({
      title: i.title, amount: String(parseFloat(i.amount)),
      receivedAmount: recvRaw > 0 ? String(recvRaw) : '',
      status: i.status ?? 'Paid', incomeDate: i.incomeDate?.slice(0, 10),
      paymentMethod: i.paymentMethod ?? 'Cash',
      customerName: i.customerName ?? '', customerOrderNumber: i.customerOrderNumber ?? '',
      orderNumber: i.orderNumber ?? '', trackingNumber: i.trackingNumber ?? '', deliveryDate: i.deliveryDate ?? '',
      quantity: String(qty), itemCost: itemCostTotal ? String(itemCostTotal) : '', taxAmount: taxTotal ? String(taxTotal) : '',
      cardUsed: i.cardUsed ?? '', notes: i.notes ?? '', currency: i.currency ?? bizCurrency,
    });
    setDupWarning({});
    setCustomerSearch('');
    setCustomerDropOpen(false);
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
        <View style={styles.headerTopRow}>
          <Text style={styles.heading}>{project.name}</Text>
          <TouchableOpacity style={styles.currencySelect} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.currencySelectText}>{displayCurrency} ▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}><Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>{project.status}</Text></View>
          <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{categoryDef.label}</Text></View>
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

          {assignees.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Assigned Team</Text>
              <Text style={styles.descText}>{assignees.map(a => a.fullName).join(', ')}</Text>
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

      {tab === 'Sales' && entryKind === 'ecommerce' && (
        <View style={{ flex: 1 }}>
          <HeaderAddButton onPress={openAddIncome} label="Add Income Entry" />
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
                  <Text style={styles.entrySub}>By {i.employee?.fullName ?? 'N/A'}</Text>
                </View>
                <Text style={styles.entryAmount}>{entryFmt(i.amount, i.currency)}</Text>
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => openEditIncome(i)}><Text style={styles.entryEdit}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteIncome(i)}><Text style={styles.entryDel}>Del</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {tab === 'Call Center' && entryKind === 'call_center' && (
        <CallCenterEntriesTab projectId={projectId} entries={callCenterEntries} />
      )}

      {tab === 'Entries' && entryKind === 'universal' && (
        <CategoryEntriesTab projectId={projectId} categoryKey={project.category} entries={categoryEntries} />
      )}

      {tab === 'Expenses' && (
        <View style={{ flex: 1 }}>
          <HeaderAddButton onPress={openAddExpense} label="Add Expense" />
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
          <HeaderAddButton onPress={openAddMilestone} label="Add Milestone" />
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

      {tab === 'Product Listings' && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={reloadListingsTab} tintColor={colors.primary} />}
        >
          <View style={styles.breakdownCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.breakdownTitle}>Connected Accounts</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setConnectModal(true)}>
                <Text style={styles.smallBtnText}>+ Connect Account</Text>
              </TouchableOpacity>
            </View>
            {connections.length === 0 ? <Text style={styles.empty}>No account connected yet.</Text> : connections.map(c => (
              <View key={c.id} style={styles.connectionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>{LISTING_PLATFORMS.find(p => p.id === c.platform)?.label ?? c.platform}</Text>
                  <Text style={styles.entrySub}>{c.isActive ? 'Connected' : 'Inactive'}{c.lastSyncAt ? ` · Synced ${new Date(c.lastSyncAt).toLocaleDateString()}` : ''}</Text>
                  {c.lastSyncError ? <Text style={[styles.entrySub, { color: '#dc2626' }]}>{c.lastSyncError}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => syncConnectionMut.mutate(c.platform)} disabled={syncConnectionMut.isPending}>
                  <Text style={styles.entryEdit}>Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDisconnectPlatform(c.platform)} style={{ marginLeft: 12 }}>
                  <Text style={styles.entryDel}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.breakdownCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.breakdownTitle}>Product Listings ({listings.length})</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.smallBtnOutline} onPress={handleImportListings} disabled={importing || pushableConnections.length === 0}>
                  {importing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.smallBtnOutlineText}>Import</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={openAddListing} disabled={pushableConnections.length === 0}>
                  <Text style={styles.smallBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>
            {pushableConnections.length === 0 && <Text style={styles.empty}>Connect an account above before adding listings.</Text>}
            {listings.length === 0 ? (pushableConnections.length > 0 && <Text style={styles.empty}>No listings yet.</Text>) : listings.map(l => (
              <View key={l.id} style={styles.entryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>{l.name}</Text>
                  <Text style={styles.entrySub}>Stock {l.stock}{l.category ? ` · ${l.category}` : ''}</Text>
                </View>
                <Text style={styles.entryAmount}>{fmt((parseFloat(l.price) || 0))}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Connect Account modal */}
      <Modal visible={connectModal} animationType="slide" transparent onRequestClose={() => setConnectModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect Account</Text>
            {LISTING_PLATFORMS.filter(p => perms.can(`ecommerce_${p.id}`)).map(p => (
              <TouchableOpacity key={p.id} style={styles.platformOption} onPress={() => handleConnectPlatform(p.id)} disabled={connecting}>
                <Text style={styles.entryTitle}>{p.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConnectModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Listing modal */}
      <Modal visible={listingModal} animationType="slide" transparent onRequestClose={() => setListingModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={styles.modalTitle}>Add Listing</Text>
            <Text style={styles.label}>Push to</Text>
            <InlinePicker
              options={pushableConnections.map(c => ({ id: c.id, name: LISTING_PLATFORMS.find(p => p.id === c.platform)?.label ?? c.platform }))}
              value={listingConnId}
              onSelect={setListingConnId}
              placeholder="Select connection"
              allowNone={false}
            />
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={listingForm.name} onChangeText={v => setListingForm(f => ({ ...f, name: v }))} placeholder="Product name" placeholderTextColor="#999" />
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={listingForm.description} onChangeText={v => setListingForm(f => ({ ...f, description: v }))} placeholder="Optional" placeholderTextColor="#999" />
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Price</Text>
                <TextInput style={styles.input} value={listingForm.price} onChangeText={v => setListingForm(f => ({ ...f, price: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Stock</Text>
                <TextInput style={styles.input} value={listingForm.stock} onChangeText={v => setListingForm(f => ({ ...f, stock: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
              </View>
            </View>
            <Text style={styles.label}>Category</Text>
            <TextInput style={styles.input} value={listingForm.category} onChangeText={v => setListingForm(f => ({ ...f, category: v }))} placeholder="Optional" placeholderTextColor="#999" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setListingModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveListing} disabled={createListingMut.isPending}>
                {createListingMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create & Push</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editIncome ? 'Edit Sale Entry' : 'Add Sale Entry'}</Text>

            <Text style={styles.label}>Title / Description *</Text>
            <TextInput style={styles.input} value={incomeForm.title} onChangeText={v => setIncomeForm(f => ({ ...f, title: v }))} placeholder="e.g. TikTok sales — June 10" placeholderTextColor="#999" />

            <View style={styles.row2}>
              <View style={styles.col}>
                <DatePicker label="Sale Date *" value={incomeForm.incomeDate} onDateChange={v => setIncomeForm(f => ({ ...f, incomeDate: v }))} placeholder="Select sale date" style={{ marginBottom: 0 }} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>QTY</Text>
                <TextInput style={styles.input} value={incomeForm.quantity} onChangeText={v => setIncomeForm(f => ({ ...f, quantity: v }))} placeholder="1" placeholderTextColor="#999" keyboardType="number-pad" />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Order Details</Text>

            <Text style={styles.label}>Customer</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={customerDropOpen ? customerSearch : incomeForm.customerName}
                onFocus={() => { setCustomerSearch(incomeForm.customerName); setCustomerDropOpen(true); }}
                onChangeText={v => { setCustomerSearch(v); setIncomeForm(f => ({ ...f, customerName: v })); setCustomerDropOpen(true); }}
                placeholder="Search or type customer name…"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.addCustomerBtn} onPress={() => { setNewCustomerName(incomeForm.customerName); setNewCustomerPhone(''); setNewCustomerModal(true); }}>
                <Text style={styles.addCustomerBtnText}>+</Text>
              </TouchableOpacity>
              {customerDropOpen && (
                <TouchableOpacity style={styles.closeDropBtn} onPress={() => setCustomerDropOpen(false)}>
                  <Text style={styles.closeDropBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {customerDropOpen && (
              <View style={styles.customerDropdown}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {customersList
                    .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                    .slice(0, 20)
                    .map(c => (
                      <TouchableOpacity key={c.id} style={styles.customerOption} onPress={() => { setIncomeForm(f => ({ ...f, customerName: c.name })); setCustomerSearch(''); setCustomerDropOpen(false); }}>
                        <Text style={styles.customerOptionText}>{c.name}</Text>
                        {c.phone ? <Text style={styles.customerOptionSub}>{c.phone}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  {customersList.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                    <Text style={styles.customerOptionSub}>No customers found</Text>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Order Number</Text>
                <TextInput
                  style={styles.input}
                  value={incomeForm.orderNumber}
                  onChangeText={v => { setIncomeForm(f => ({ ...f, orderNumber: v })); setDupWarning(w => ({ ...w, orderNumber: undefined })); }}
                  onBlur={() => checkIncomeDuplicate('orderNumber', incomeForm.orderNumber)}
                  placeholder="Marketplace order #"
                  placeholderTextColor="#999"
                />
                {dupWarning.orderNumber && <Text style={styles.dupWarning}>⚠ {dupWarning.orderNumber}</Text>}
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Customer Order Number</Text>
                <TextInput style={styles.input} value={incomeForm.customerOrderNumber} onChangeText={v => setIncomeForm(f => ({ ...f, customerOrderNumber: v }))} placeholder="Customer's own order #" placeholderTextColor="#999" />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Tracking Number</Text>
                <TextInput
                  style={styles.input}
                  value={incomeForm.trackingNumber}
                  onChangeText={v => { setIncomeForm(f => ({ ...f, trackingNumber: v })); setDupWarning(w => ({ ...w, trackingNumber: undefined })); }}
                  onBlur={() => checkIncomeDuplicate('trackingNumber', incomeForm.trackingNumber)}
                  placeholder="Shipment tracking #"
                  placeholderTextColor="#999"
                />
                {dupWarning.trackingNumber && <Text style={styles.dupWarning}>⚠ {dupWarning.trackingNumber}</Text>}
              </View>
              <View style={styles.col}>
                <DatePicker label="Delivery Date" value={incomeForm.deliveryDate} onDateChange={v => setIncomeForm(f => ({ ...f, deliveryDate: v }))} placeholder="Optional" style={{ marginBottom: 0 }} />
              </View>
            </View>

            <Text style={styles.label}>Card Used</Text>
            <TextInput style={styles.input} value={incomeForm.cardUsed} onChangeText={v => setIncomeForm(f => ({ ...f, cardUsed: v }))} placeholder="Last 4 digits or card name" placeholderTextColor="#999" />

            <Text style={styles.sectionLabel}>Financials</Text>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Currency</Text>
                <InlinePicker options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={incomeForm.currency} onSelect={v => setIncomeForm(f => ({ ...f, currency: v }))} placeholder="Select" allowNone={false} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Total Payout (Sale Amount) *</Text>
                <TextInput
                  style={styles.input}
                  value={incomeForm.amount}
                  onChangeText={v => setIncomeForm(f => ({ ...f, amount: v, status: f.receivedAmount ? deriveStatus(v, f.receivedAmount) : f.status }))}
                  placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad"
                />
              </View>
            </View>
            {incomeForm.amount && rates?.[incomeForm.currency] && incomeForm.currency !== 'USD' && (
              <Text style={styles.hint}>≈ ${(parseFloat(incomeForm.amount) / rates[incomeForm.currency]).toFixed(4)} USD</Text>
            )}

            {(() => {
              const qty = parseInt(incomeForm.quantity || '1', 10) || 1;
              const itemCostNum = parseFloat(incomeForm.itemCost || '0');
              const perUnit = qty > 1 && itemCostNum > 0 ? itemCostNum / qty : null;
              return (
                <View style={styles.row2}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Item Cost (total for line)</Text>
                    <TextInput style={styles.input} value={incomeForm.itemCost} onChangeText={v => setIncomeForm(f => ({ ...f, itemCost: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                    {perUnit != null && <Text style={styles.hint}>≈ {entryFmt(String(perUnit), incomeForm.currency)} per unit</Text>}
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Tax Amount (total for line)</Text>
                    <TextInput style={styles.input} value={incomeForm.taxAmount} onChangeText={v => setIncomeForm(f => ({ ...f, taxAmount: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                </View>
              );
            })()}

            {(incomeForm.itemCost || incomeForm.taxAmount) && (() => {
              const payout = parseFloat(incomeForm.amount || '0');
              const totalCost = (parseFloat(incomeForm.itemCost || '0') || 0) + (parseFloat(incomeForm.taxAmount || '0') || 0);
              const profit = payout - totalCost;
              return (
                <View style={styles.costPanel}>
                  <View style={styles.costRow}><Text style={styles.costLabel}>Total Cost</Text><Text style={styles.costValue}>{entryFmt(String(totalCost), incomeForm.currency)}</Text></View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Profit</Text>
                    <Text style={[styles.costValue, { color: profit >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'Outfit-Bold' }]}>
                      {profit >= 0 ? '+' : ''}{entryFmt(String(profit), incomeForm.currency)} {payout > 0 ? `(${((profit / payout) * 100).toFixed(1)}%)` : ''}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.sectionLabel}>Payment</Text>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Payment Status</Text>
                <InlinePicker
                  options={SALE_STATUSES.map(s => ({ id: s, name: s }))}
                  value={incomeForm.status}
                  onSelect={v => setIncomeForm(f => ({ ...f, status: v, receivedAmount: v === 'Paid' ? '' : v === 'Pending' ? '0' : f.receivedAmount }))}
                  placeholder="Select status" allowNone={false}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Payment Method</Text>
                <InlinePicker options={SALE_PAYMENT_METHODS.map(m => ({ id: m, name: m }))} value={incomeForm.paymentMethod} onSelect={v => setIncomeForm(f => ({ ...f, paymentMethod: v }))} placeholder="Select method" allowNone={false} />
              </View>
            </View>
            {incomeForm.status !== 'Paid' && (
              <>
                <Text style={styles.label}>Amount Already Received</Text>
                <TextInput
                  style={styles.input}
                  value={incomeForm.receivedAmount}
                  onChangeText={v => setIncomeForm(f => ({ ...f, receivedAmount: v, status: deriveStatus(f.amount, v) }))}
                  placeholder="How much has been received so far?" placeholderTextColor="#999" keyboardType="decimal-pad"
                />
              </>
            )}

            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={incomeForm.notes} onChangeText={v => setIncomeForm(f => ({ ...f, notes: v }))} placeholder="Optional" placeholderTextColor="#999" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIncomeModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveIncome} disabled={saveIncomeMut.isPending}>
                {saveIncomeMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editIncome ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={newCustomerModal} animationType="fade" transparent onRequestClose={() => setNewCustomerModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={newCustomerName} onChangeText={setNewCustomerName} placeholder="Customer name" placeholderTextColor="#999" />
            <PhoneInput label="Phone" value={newCustomerPhone} onChange={setNewCustomerPhone} placeholder="Phone number" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewCustomerModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCustomer} disabled={creatingCustomer || !newCustomerName.trim()}>
                {creatingCustomer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add Customer</Text>}
              </TouchableOpacity>
            </View>
          </View>
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
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', flex: 1 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySelect: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  currencySelectText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  headerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  categoryBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: '#f3f4f6' },
  categoryBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
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
  smallBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  smallBtnOutline: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnOutlineText: { color: colors.primary, fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  platformOption: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
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
  sectionLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  hint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: -8, marginBottom: 10 },
  dupWarning: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#d97706', marginTop: -8, marginBottom: 10 },
  addCustomerBtn: { width: 42, height: 42, borderRadius: 8, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  addCustomerBtnText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.primary },
  closeDropBtn: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeDropBtnText: { fontSize: 14, color: '#9ca3af' },
  customerDropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, maxHeight: 160, marginTop: 4, marginBottom: 12 },
  customerOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  customerOptionText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827' },
  customerOptionSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', padding: 10 },
  costPanel: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, gap: 4, marginBottom: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  costValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
});
