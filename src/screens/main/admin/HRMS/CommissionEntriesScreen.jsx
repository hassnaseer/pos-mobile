import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import {
  useCommissionEntries, useCreateCommissionEntry, useUpdateCommissionEntry, useDeleteCommissionEntry,
  useCommissionStructureForEmployee, useStaffList,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const EMPTY_FORM = { employeeId: '', amount: '', currency: '', entryDate: new Date().toISOString().slice(0, 10), notes: '' };

const fmtPKR = n => `PKR ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? cur + ' '}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Client-side-only preview of what the server will compute on submit — mirrors the
 *  flat-on-whole-amount formula in CommissionEntriesService.computeCommission. */
function previewMatch(structure, saleAmountUSD) {
  if (!structure || !saleAmountUSD) return null;
  const tier = (structure.tiers ?? []).find(t =>
    saleAmountUSD >= t.minAmount && (t.maxAmount == null || saleAmountUSD <= t.maxAmount));
  if (!tier) return { matched: false };
  return { matched: true, percent: tier.commissionPercent, amount: saleAmountUSD * (tier.commissionPercent / 100) * structure.dollarRate };
}

const CommissionEntriesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_COMMISSIONS);
  const { currency: bizCurrency, rates } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState(bizCurrency);

  const { data: raw = [], isLoading, refetch } = useCommissionEntries();
  const { data: rawStaff = [] } = useStaffList();
  const { data: previewStructure } = useCommissionStructureForEmployee(form.employeeId);
  const { mutateAsync: create, isPending: creating } = useCreateCommissionEntry();
  const { mutateAsync: update, isPending: updating } = useUpdateCommissionEntry();
  const { mutate: remove } = useDeleteCommissionEntry();

  const allItems = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));
  const isSaving = creating || updating;

  // rates[X] = X units per 1 USD, so amount / rates[cur] = USD. Mirrors web's toUSDClient.
  const toUSDClient = (amount, cur) => {
    const rate = rates?.[cur];
    return rate ? amount / rate : amount;
  };
  const toDC = (amount, cur) => {
    const effectiveCur = cur || bizCurrency;
    const fromRate = rates?.[effectiveCur] ?? 1;
    const toRate = rates?.[displayCurrency] ?? 1;
    return fromRate > 0 ? (amount * toRate) / fromRate : amount;
  };

  const previewAmountUSD = toUSDClient(Number(form.amount) || 0, form.currency || bizCurrency);
  const preview = previewMatch(previewStructure, previewAmountUSD);

  const items = allItems.filter(e => {
    const matchEmployee = !filterEmployeeId || e.employee?.id === filterEmployeeId;
    const matchFrom = !filterFrom || (e.entryDate ?? '').slice(0, 10) >= filterFrom;
    const matchTo = !filterTo || (e.entryDate ?? '').slice(0, 10) <= filterTo;
    const matchSearch = !filterSearch || (e.employee?.name ?? '').toLowerCase().includes(filterSearch.toLowerCase());
    return matchEmployee && matchFrom && matchTo && matchSearch;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = e => {
    setEditing(e);
    setForm({
      employeeId: e.employee?.id ?? '',
      amount: String(e.originalAmount ?? e.saleAmountUSD ?? ''),
      currency: e.currency ?? bizCurrency,
      entryDate: e.entryDate?.slice(0, 10) ?? EMPTY_FORM.entryDate,
      notes: e.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing && !form.employeeId) { Alert.alert('Error', 'Employee is required'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert('Error', 'Enter a valid sale amount'); return; }
    const currency = form.currency || bizCurrency;
    const amount = parseFloat(form.amount);
    try {
      if (editing) {
        await update({
          id: editing.id,
          amount, currency, amountInUSD: toUSDClient(amount, currency),
          entryDate: form.entryDate,
          notes: form.notes || undefined,
        });
      } else {
        await create({
          employeeId: form.employeeId,
          amount, currency, amountInUSD: toUSDClient(amount, currency),
          entryDate: form.entryDate,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save commission entry');
    }
  };

  const handleDelete = e => Alert.alert('Delete Commission Entry', `Delete this entry for ${e.employee?.name ?? 'this employee'}? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(e.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Commission Entries</Text>
          <Text style={styles.subHeading}>Log a dollar sale against an employee — matched to their bracket automatically</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Log Commission</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(v => !v)}>
              <Text style={styles.filterToggleText}>{filtersOpen ? '▾' : '▸'} Filter</Text>
            </TouchableOpacity>
            {filtersOpen && (
              <View style={styles.filtersBody}>
                <InlinePicker
                  label="Employee"
                  options={[{ id: '', name: 'All Employees' }, ...staffOptions]}
                  value={filterEmployeeId}
                  onSelect={setFilterEmployeeId}
                  allowNone={false}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><DatePicker label="From" value={filterFrom} onDateChange={setFilterFrom} /></View>
                  <View style={{ flex: 1 }}><DatePicker label="To" value={filterTo} onDateChange={setFilterTo} /></View>
                </View>
                <TextInput
                  style={styles.input} placeholder="Search by employee name..." placeholderTextColor="#999"
                  value={filterSearch} onChangeText={setFilterSearch}
                />
                <InlinePicker
                  label="Display in"
                  options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))}
                  value={displayCurrency}
                  onSelect={setDisplayCurrency}
                  allowNone={false}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const applied = item.status === 'Applied';
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.employee?.name ?? '—'}</Text>
                <Text style={styles.rowSub}>
                  {new Date(item.entryDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                  {'  ·  '}{fmtCur(toDC(item.originalAmount ?? item.saleAmountUSD, item.currency ?? 'USD'), displayCurrency)} sale
                  {item.matchedTierPercentSnapshot != null ? `  ·  ${item.matchedTierPercentSnapshot}% bracket` : '  ·  no bracket matched'}
                </Text>
                {item.notes ? <Text style={styles.rowSub} numberOfLines={1}>{item.notes}</Text> : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>{fmtPKR(item.commissionAmountPKR)}</Text>
                <View style={[styles.badge, { backgroundColor: applied ? '#d1fae5' : '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: applied ? '#065f46' : '#92400e' }]}>{item.status}</Text>
                </View>
                {canManage && !applied && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                      <Text style={styles.delText}>Del</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No commission entries logged yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Commission Entry' : 'Log Commission Entry'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '75%' }}>
              {!editing && (
                <View style={styles.field}>
                  <Text style={styles.label}>Employee *</Text>
                  <InlinePicker options={staffOptions} value={form.employeeId} onSelect={set('employeeId')} placeholder="Select employee" allowNone={false} />
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Sale Amount *</Text>
                  <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Currency</Text>
                  <InlinePicker
                    options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))}
                    value={form.currency || bizCurrency}
                    onSelect={set('currency')}
                    allowNone={false}
                  />
                </View>
              </View>
              <DatePicker
                label="Entry Date *"
                value={form.entryDate}
                onDateChange={set('entryDate')}
                placeholder="Select entry date"
              />
              {form.employeeId && form.amount ? (
                <View style={styles.previewBox}>
                  {(form.currency || bizCurrency) !== 'USD' && (
                    <Text style={styles.previewTextMuted}>≈ ${previewAmountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</Text>
                  )}
                  {!previewStructure ? (
                    <Text style={styles.previewTextMuted}>No commission structure configured for this employee's type.</Text>
                  ) : !preview?.matched ? (
                    <Text style={styles.previewTextWarn}>No bracket in "{previewStructure.name}" covers this amount — commission will be $0.</Text>
                  ) : (
                    <Text style={styles.previewTextOk}>
                      Matches {preview.percent}% bracket in "{previewStructure.name}" → {fmtPKR(preview.amount)}
                    </Text>
                  )}
                </View>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput style={styles.input} value={form.notes} onChangeText={set('notes')} placeholder="Optional — e.g. deal reference" placeholderTextColor="#999" multiline />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Log Commission'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading:   { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  filtersWrap:  { paddingHorizontal: 12, paddingTop: 10 },
  filterToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  filterToggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  filtersBody:  { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, gap: 4, borderWidth: 1, borderColor: '#eee' },
  row:          { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 8 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', gap: 4 },
  amount:       { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  previewBox:   { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12 },
  previewTextMuted: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  previewTextWarn:  { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#b45309' },
  previewTextOk:    { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#065f46' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default CommissionEntriesScreen;
