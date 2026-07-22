import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../services/api/globalApi';
import { useProjectMarketplaces, useStaffList } from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import { compactAmt } from '../../../../utils/currency';
import DatePicker from '../../../../components/Ui/DatePicker';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import MultiSelectPicker from '../../../../components/InlinePicker/MultiSelectPicker';
import PhoneInput from '../../../../components/PhoneInput/PhoneInput';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';
import { PROJECT_CATEGORIES, getCategoryDef } from '../../../../config/projectCategories';
import colors from '../../../../theme/colors';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const STATUS_COLOR = {
  Planning:  { bg: '#eff6ff', text: '#1d4ed8' },
  Active:    { bg: '#f0fdf4', text: '#16a34a' },
  'On Hold': { bg: '#fefce8', text: '#b45309' },
  Completed: { bg: '#f9fafb', text: '#6b7280' },
  Cancelled: { bg: '#fef2f2', text: '#dc2626' },
};
const EMPTY = {
  name: '', description: '', status: 'Active', startDate: '', endDate: '',
  estimatedBudget: '', projectClientId: '', marketplace: '', accountCode: '',
  monthlyRevenuePlan: '', monthlyProfitPlan: '', isMilestone: false, serviceCharge: '',
  category: 'ecommerce', incomeMode: '', assigneeIds: [],
};

const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => { const r = await apiClient.get('/admin/projects'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const useClients = () =>
  useQuery({
    queryKey: ['project-clients'],
    queryFn: async () => { const r = await apiClient.get('/admin/project-clients'); return r?.data ?? r ?? []; },
    staleTime: 60_000,
  });

const ProjectsScreen = () => {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currency: bizCurrency, rates } = useCurrency();
  const canCompanyEarning = !user?.permissionCodes?.length || user.permissionCodes.includes('manage_projects');
  const [displayCurrency, setDisplayCurrency] = useState(bizCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Backend project totals are USD-denominated — convert for display the same way
  // web's listFmt does (frontend/src/app/pages/admin/projects/index.tsx:91-98).
  const fmtMoney = usdAmt => {
    const displayAmt = (usdAmt ?? 0) * (rates?.[displayCurrency] ?? 1);
    const sym = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency + ' ';
    return compactAmt(sym, displayAmt);
  };

  const { data: raw = [], isLoading, refetch } = useProjects();
  const { data: clientRaw = [] } = useClients();
  const { data: mktRaw = [] } = useProjectMarketplaces();
  const { data: staffRaw = [] } = useStaffList();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const clients = Array.isArray(clientRaw) ? clientRaw : (clientRaw?.data ?? []);
  const marketplaces = Array.isArray(mktRaw) ? mktRaw : (mktRaw?.data ?? []);
  const staffList = Array.isArray(staffRaw) ? staffRaw : (staffRaw?.data ?? []);
  const staffOptions = staffList.map(st => ({ id: st.id, name: st.fullName ?? st.name }));

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const totalIncome = list.reduce((s, p) => s + (p.totalIncome ?? 0), 0);
  const totalExpense = list.reduce((s, p) => s + (p.totalExpense ?? 0), 0);
  const totalProfit = list.reduce((s, p) => s + (p.profit ?? 0), 0);
  const totalCompanyEarning = list.reduce((s, p) => s + (p.companyEarning ?? 0), 0);

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/projects/${editing.id}`, data)
      : apiClient.post('/admin/projects', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save project'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const addClient = useMutation({
    mutationFn: data => apiClient.post('/admin/project-clients', data),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['project-clients'] });
      const created = res?.data ?? res;
      if (created?.id) set('projectClientId')(created.id);
      setAddClientOpen(false);
      setNewClientName('');
      setNewClientPhone('');
    },
    onError: () => Alert.alert('Error', 'Failed to add client'),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? '', status: p.status ?? 'Active',
      startDate: p.startDate ?? '', endDate: p.endDate ?? '',
      estimatedBudget: p.estimatedBudget ? String(parseFloat(p.estimatedBudget)) : '',
      projectClientId: p.projectClient?.id ?? '', marketplace: p.marketplace ?? '',
      accountCode: p.accountCode ?? '',
      monthlyRevenuePlan: p.monthlyRevenuePlan ? String(parseFloat(p.monthlyRevenuePlan)) : '',
      monthlyProfitPlan: p.monthlyProfitPlan ? String(parseFloat(p.monthlyProfitPlan)) : '',
      isMilestone: p.isMilestone ?? false,
      serviceCharge: p.serviceCharge != null ? String(p.serviceCharge) : '',
      category: p.category ?? 'ecommerce',
      incomeMode: p.incomeMode ?? '',
      assigneeIds: p.assignees?.map(a => a.id) ?? [],
    });
    setShowModal(true);
  };
  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Project name is required'); return; }
    save.mutate({
      name: form.name, description: form.description || undefined, status: form.status,
      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      estimatedBudget: form.estimatedBudget ? parseFloat(form.estimatedBudget) : undefined,
      projectClientId: form.projectClientId || undefined, marketplace: form.marketplace || undefined,
      accountCode: form.accountCode || undefined,
      monthlyRevenuePlan: form.monthlyRevenuePlan ? parseFloat(form.monthlyRevenuePlan) : undefined,
      monthlyProfitPlan: form.monthlyProfitPlan ? parseFloat(form.monthlyProfitPlan) : undefined,
      isMilestone: form.isMilestone,
      serviceCharge: form.serviceCharge ? parseFloat(form.serviceCharge) : undefined,
      category: form.category,
      incomeMode: form.incomeMode || undefined,
      assigneeIds: form.assigneeIds,
    });
  };
  const handleAddClient = () => {
    if (!newClientName.trim()) return;
    addClient.mutate({ name: newClientName.trim(), phone: newClientPhone || undefined });
  };
  const handleDelete = p => Alert.alert('Delete Project', `Delete "${p.name}" and all its income/expense entries?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(p.id) },
  ]);

  const formCategoryDef = getCategoryDef(form.category);
  const formEffectiveMode = form.incomeMode || formCategoryDef.incomeMode;

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Projects</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.currencyLabel}>Display in</Text>
          <TouchableOpacity style={s.currencySelect} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={s.currencySelectText}>{displayCurrency} ▾</Text>
          </TouchableOpacity>
          <HeaderAddButton onPress={openAdd} label="Add" />
        </View>
      </View>

      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={s.pickerBackdrop} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={s.pickerSheet}>
            <ScrollView>
              {CURRENCY_OPTIONS.map(c => (
                <TouchableOpacity key={c} style={s.pickerOption} onPress={() => { setDisplayCurrency(c); setShowCurrencyPicker(false); }}>
                  <Text style={[s.pickerOptionText, displayCurrency === c && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{c} — {CURRENCY_SYMBOLS[c]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={s.summaryGrid}>
        <View style={[s.summaryCard, { backgroundColor: '#f0fdf4' }]}><Text style={s.summaryLabel}>Total Income</Text><Text style={[s.summaryValue, { color: '#15803d' }]}>{fmtMoney(totalIncome)}</Text></View>
        <View style={[s.summaryCard, { backgroundColor: '#fef2f2' }]}><Text style={s.summaryLabel}>Total Expenses</Text><Text style={[s.summaryValue, { color: '#b91c1c' }]}>{fmtMoney(totalExpense)}</Text></View>
        <View style={[s.summaryCard, { backgroundColor: totalProfit >= 0 ? '#eff6ff' : '#fef2f2' }]}><Text style={s.summaryLabel}>Net {totalProfit >= 0 ? 'Profit' : 'Loss'}</Text><Text style={[s.summaryValue, { color: totalProfit >= 0 ? '#1d4ed8' : '#b91c1c' }]}>{totalProfit >= 0 ? '+' : ''}{fmtMoney(totalProfit)}</Text></View>
        {canCompanyEarning && (
          <View style={[s.summaryCard, { backgroundColor: '#f5f3ff' }]}><Text style={s.summaryLabel}>Company Earning</Text><Text style={[s.summaryValue, { color: '#6d28d9' }]}>{fmtMoney(totalCompanyEarning)}</Text></View>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No projects yet.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] ?? { bg: '#f9fafb', text: '#374151' };
          const profit = item.profit ?? 0;
          const roi = item.totalExpense ? (profit / item.totalExpense) * 100 : null;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={s.cardTitle}>{item.name}</Text>
                    <View style={s.categoryBadge}><Text style={s.categoryBadgeText}>{getCategoryDef(item.category).label}</Text></View>
                  </View>
                  <Text style={s.cardSub}>
                    {item.accountCode ? `#${item.accountCode} · ` : ''}
                    {item.projectClient?.name ?? 'No client'}{item.marketplace ? ` · ${item.marketplace}` : ''}
                  </Text>
                  <Text style={s.cardSub}>{fmt(item.startDate)} – {fmt(item.endDate)}</Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}><Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text></View>
                  {item.isMilestone && <View style={s.milestoneBadge}><Text style={s.milestoneBadgeText}>Milestone</Text></View>}
                </View>
              </View>

              <View style={s.statsRow}>
                <View style={s.stat}><Text style={s.statLabel}>Sales</Text><Text style={[s.statValue, { color: '#15803d' }]}>{fmtMoney(item.totalIncome ?? 0)}</Text></View>
                <View style={s.stat}><Text style={s.statLabel}>GOGS</Text><Text style={[s.statValue, { color: '#dc2626' }]}>{fmtMoney(item.totalExpense ?? 0)}</Text></View>
                <View style={s.stat}><Text style={s.statLabel}>Profit</Text><Text style={[s.statValue, { color: profit >= 0 ? '#047857' : '#dc2626' }]}>{profit >= 0 ? '+' : ''}{fmtMoney(profit)}</Text></View>
                <View style={s.stat}><Text style={s.statLabel}>ROI</Text><Text style={s.statValue}>{roi != null ? `${roi.toFixed(1)}%` : '—'}</Text></View>
                {canCompanyEarning && (
                  <View style={s.stat}><Text style={s.statLabel}>Earning</Text><Text style={[s.statValue, { color: '#7c3aed' }]}>{fmtMoney(item.companyEarning ?? 0)}</Text></View>
                )}
              </View>

              {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
              <View style={s.actions}>
                <TouchableOpacity style={s.plBtn} onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}><Text style={s.plText}>View P&L</Text></TouchableOpacity>
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
            <Text style={s.modalTitle}>{editing ? 'Edit Project' : 'New Project'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Project / Store Name *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Macrosell Store" placeholderTextColor="#999" />

              <Text style={s.label}>Status</Text>
              <View style={s.chips}>
                {STATUSES.map(st => (
                  <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => set('status')(st)}>
                    <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <InlinePicker
                label="Category *"
                options={PROJECT_CATEGORIES.map(c => ({ id: c.key, name: c.label }))}
                value={form.category}
                onSelect={v => setForm(f => ({ ...f, category: v, incomeMode: '' }))}
                placeholder="Select category"
                allowNone={false}
              />

              {formCategoryDef.incomeMode !== 'recurring' && (
                <>
                  <Text style={s.label}>Income Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      style={[s.incomeTypeOption, formEffectiveMode === 'fixed' && s.incomeTypeOptionActive]}
                      onPress={() => set('incomeMode')('fixed')}
                    >
                      <View style={[s.checkbox, formEffectiveMode === 'fixed' && s.checkboxChecked]}>
                        {formEffectiveMode === 'fixed' && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.incomeTypeText}>Fixed Amount</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.incomeTypeOption, formEffectiveMode === 'milestone' && s.incomeTypeOptionActive]}
                      onPress={() => set('incomeMode')('milestone')}
                    >
                      <View style={[s.checkbox, formEffectiveMode === 'milestone' && s.checkboxChecked]}>
                        {formEffectiveMode === 'milestone' && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.incomeTypeText}>Milestone Based</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {form.category === 'ecommerce' && (
                <>
                  <Text style={s.label}>Marketplace / Channel</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.chip, !form.marketplace && s.chipActive]} onPress={() => set('marketplace')('')}>
                        <Text style={[s.chipText, !form.marketplace && s.chipTextActive]}>None</Text>
                      </TouchableOpacity>
                      {marketplaces.map(m => (
                        <TouchableOpacity key={m.id} style={[s.chip, form.marketplace === m.name && s.chipActive]} onPress={() => set('marketplace')(m.name)}>
                          <Text style={[s.chipText, form.marketplace === m.name && s.chipTextActive]}>{m.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={[s.label, { marginTop: 0 }]}>Client</Text>
                <TouchableOpacity onPress={() => setAddClientOpen(true)}><Text style={s.addClientLink}>+ Add new</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[s.chip, !form.projectClientId && s.chipActive]} onPress={() => set('projectClientId')('')}>
                    <Text style={[s.chipText, !form.projectClientId && s.chipTextActive]}>No client</Text>
                  </TouchableOpacity>
                  {clients.map(c => (
                    <TouchableOpacity key={c.id} style={[s.chip, form.projectClientId === c.id && s.chipActive]} onPress={() => set('projectClientId')(c.id)}>
                      <Text style={[s.chipText, form.projectClientId === c.id && s.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <MultiSelectPicker
                label="Assigned Team"
                options={staffOptions}
                selected={form.assigneeIds}
                onChange={ids => setForm(f => ({ ...f, assigneeIds: ids }))}
                placeholder="Select team members…"
              />
              <Text style={s.helperText}>Everyone assigned is equal — no lead/role distinction.</Text>

              {form.category === 'ecommerce' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Account Code</Text>
                    <TextInput style={s.input} value={form.accountCode} onChangeText={set('accountCode')} placeholder="e.g. ACC-001" placeholderTextColor="#999" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Service Charge %</Text>
                    <TextInput style={s.input} value={form.serviceCharge} onChangeText={set('serviceCharge')} placeholder="e.g. 15" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                </View>
              )}

              {form.category === 'ecommerce' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Monthly Sales Plan</Text>
                    <TextInput style={s.input} value={form.monthlyRevenuePlan} onChangeText={set('monthlyRevenuePlan')} placeholder="Target sales" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Monthly Profit Plan</Text>
                    <TextInput style={s.input} value={form.monthlyProfitPlan} onChangeText={set('monthlyProfitPlan')} placeholder="Optional" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <DatePicker
                  label="Start Date"
                  value={form.startDate}
                  onDateChange={set('startDate')}
                  placeholder="Select start date"
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <DatePicker
                  label="End Date"
                  value={form.endDate}
                  onDateChange={set('endDate')}
                  placeholder="Leave blank if ongoing"
                  minimumDate={form.startDate || undefined}
                  style={{ flex: 1, marginBottom: 0 }}
                />
              </View>

              <Text style={s.label}>{formEffectiveMode === 'fixed' ? 'Project Amount' : 'Estimated Budget'}</Text>
              <TextInput
                style={s.input}
                value={form.estimatedBudget}
                onChangeText={set('estimatedBudget')}
                placeholder={formEffectiveMode === 'fixed' ? 'Total charge for this project' : 'Optional'}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <Text style={s.label}>Description</Text>
              <TextInput style={s.input} value={form.description} onChangeText={set('description')} placeholder="Optional description" placeholderTextColor="#999" />
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Save Changes' : 'Create Project'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addClientOpen} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add New Client</Text>
            <Text style={s.label}>Client Name *</Text>
            <TextInput style={s.input} value={newClientName} onChangeText={setNewClientName} placeholder="e.g. ABC Retail Ltd" placeholderTextColor="#999" />
            <PhoneInput label="Phone" value={newClientPhone} onChange={setNewClientPhone} placeholder="Phone number" />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddClientOpen(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleAddClient} disabled={addClient.isPending || !newClientName.trim()}>
                {addClient.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Add Client</Text>}
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
  currencyLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  currencySelect: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  currencySelectText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  summaryCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 2 },
  summaryValue: { fontSize: 16, fontFamily: 'Outfit-Bold' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  categoryBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1.5 },
  categoryBadgeText: { fontSize: 9, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  milestoneBadge: { backgroundColor: '#f5f3ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  milestoneBadgeText: { fontSize: 9, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
  stat: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  statValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  plBtn: { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  plText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#4338ca' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 8 },
  addClientLink: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  helperText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: -6, marginBottom: 10 },
  incomeTypeOption: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f9fafb' },
  incomeTypeOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  incomeTypeText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default ProjectsScreen;
