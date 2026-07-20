import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useGamingTickets, useGamingTicketRates, useCreateGamingTicket, useCreateGamingTicketRate,
  useCustomers, useCreateCustomer,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const STATUS_FILTERS = ['All', 'Active', 'Ended'];
const pad2 = n => String(n).padStart(2, '0');

const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDuration = minutes => {
  if (!minutes) return '—';
  const m = parseFloat(minutes), h = Math.floor(m / 60), r = Math.round(m % 60);
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};

// Live countdown string from now → expiresAt. Recomputed every second by the caller.
const fmtCountdown = ms => {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
};

const EMPTY_FORM = {
  customerId: '', ticketName: '', numberOfUsers: '1',
  rateId: '', amount: '', currency: '',
};

const EMPTY_RATE_FORM = { label: '', durationMinutes: '', price: '', currency: '' };

// ─── Add New Customer modal ────────────────────────────────────────────────────
const AddCustomerModal = ({ visible, onClose, onCreated, initialName }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { mutateAsync: createCustomer, isPending } = useCreateCustomer();

  useEffect(() => { if (visible) { setName(initialName ?? ''); setPhone(''); } }, [visible, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Customer name is required'); return; }
    try {
      const res = await createCustomer({ name: name.trim(), phone: phone.trim() });
      onCreated(res?.data ?? res);
      onClose();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to add customer');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Add New Customer</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Customer name" placeholderTextColor="#999" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+92 300 0000000" placeholderTextColor="#999" keyboardType="phone-pad" />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add Customer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Add New Duration / Rate modal ─────────────────────────────────────────────
const AddRateModal = ({ visible, onClose, onCreated, bizCurrency }) => {
  const [form, setForm] = useState(EMPTY_RATE_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));
  const { mutateAsync: createRate, isPending } = useCreateGamingTicketRate();

  useEffect(() => { if (visible) setForm(EMPTY_RATE_FORM); }, [visible]);

  const handleSubmit = async () => {
    if (!form.label.trim()) { Alert.alert('Required', 'Label is required'); return; }
    const durationMinutes = parseInt(form.durationMinutes, 10);
    const price = parseFloat(form.price);
    if (!durationMinutes || durationMinutes <= 0) { Alert.alert('Required', 'Enter a valid duration in minutes'); return; }
    if (isNaN(price) || price <= 0) { Alert.alert('Required', 'Enter a valid price'); return; }
    try {
      const res = await createRate({ label: form.label.trim(), durationMinutes, price, currency: form.currency || undefined });
      onCreated(res?.data ?? res);
      onClose();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to add rate');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Add New Duration</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Label *</Text>
            <TextInput style={styles.input} value={form.label} onChangeText={set('label')} placeholder="e.g. 1 Hour" placeholderTextColor="#999" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Minutes *</Text>
              <TextInput style={styles.input} value={form.durationMinutes} onChangeText={set('durationMinutes')} placeholder="60" placeholderTextColor="#999" keyboardType="number-pad" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Price *</Text>
              <TextInput style={styles.input} value={form.price} onChangeText={set('price')} placeholder="10" placeholderTextColor="#999" keyboardType="decimal-pad" />
            </View>
          </View>
          <InlinePicker
            label="Currency"
            options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))}
            value={form.currency || bizCurrency}
            onSelect={set('currency')}
            allowNone={false}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add Rate</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Create Ticket Modal ───────────────────────────────────────────────────────
const CreateTicketModal = ({ visible, onClose, onSave, isSaving, rates, bizCurrency, exchangeRates }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newRateOpen, setNewRateOpen] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: rawCustomers = [] } = useCustomers();
  const customers = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const activeRates = (rates ?? []).filter(r => r.isActive !== false);

  useEffect(() => {
    if (visible) {
      setForm(EMPTY_FORM);
      setCustomerSearch('');
      setSelectedCustomer(null);
    }
  }, [visible]);

  const applyRate = rate => {
    setForm(p => ({
      ...p,
      rateId: rate.id,
      amount: rate ? String(rate.price) : p.amount,
      // Currency is fully derived from the selected rate — never independently editable here,
      // so a ticket can never end up with an amount from one rate labeled in a different currency.
      currency: rate ? (rate.currency ?? bizCurrency) : p.currency,
    }));
  };

  const handleSelectRate = rateId => {
    const rate = activeRates.find(r => r.id === rateId);
    if (rate) applyRate(rate);
  };

  const handleSubmit = () => {
    if (!form.ticketName.trim()) { Alert.alert('Required', 'Ticket name is required'); return; }
    if (!form.rateId) { Alert.alert('Required', 'Please select a duration'); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Required', 'Enter a valid amount'); return; }
    const currency = form.currency || bizCurrency;
    const rate = exchangeRates?.[currency];
    const amountInUSD = rate ? amount / rate : amount;
    onSave({
      customerId: selectedCustomer?.id || undefined,
      ticketName: form.ticketName.trim(),
      numberOfUsers: form.numberOfUsers ? parseInt(form.numberOfUsers, 10) : undefined,
      rateId: form.rateId,
      amount,
      currency,
      amountInUSD,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Gaming Ticket</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.formSection}>Customer (optional)</Text>
            {selectedCustomer ? (
              <View style={styles.selectedCustomer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                  {selectedCustomer.phone ? <Text style={styles.selectedCustomerPhone}>{selectedCustomer.phone}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                  <Text style={styles.selectedCustomerClear}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    placeholder="Search by name or phone… (leave blank for walk-in)"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity style={styles.inlineAddBtn} onPress={() => setNewCustomerOpen(true)}>
                    <Text style={styles.inlineAddBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                {customerSearch.trim().length > 0 && (
                  <View style={styles.customerResultsList}>
                    {customers
                      .filter(c =>
                        (c.name ?? '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (c.phone ?? '').includes(customerSearch)
                      )
                      .slice(0, 8)
                      .map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.customerResultRow}
                          onPress={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                        >
                          <Text style={styles.customerResultName}>{c.name}</Text>
                          {c.phone ? <Text style={styles.customerResultPhone}>{c.phone}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    {customers.filter(c =>
                      (c.name ?? '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                      (c.phone ?? '').includes(customerSearch)
                    ).length === 0 && (
                      <Text style={styles.emptyResultText}>No matching customers</Text>
                    )}
                  </View>
                )}
              </>
            )}

            <Text style={styles.formSection}>Ticket Details</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Ticket Name *</Text>
              <TextInput
                style={styles.input}
                value={form.ticketName}
                onChangeText={set('ticketName')}
                placeholder="e.g. PS5 Station 1"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Number of Users</Text>
              <TextInput
                style={styles.input}
                value={form.numberOfUsers}
                onChangeText={set('numberOfUsers')}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.formSection}>Duration & Pricing</Text>
              <TouchableOpacity onPress={() => setNewRateOpen(true)}>
                <Text style={styles.inlineAddLink}>+ Add new</Text>
              </TouchableOpacity>
            </View>
            <InlinePicker
              label="Duration *"
              options={activeRates.map(r => ({ id: r.id, name: `${r.label} — ${fmtCur(r.price, r.currency)}` }))}
              value={form.rateId}
              onSelect={handleSelectRate}
              placeholder="Select duration"
              allowNone={false}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.amountPrefix}>{CURRENCY_SYMBOLS[form.currency || bizCurrency] ?? (form.currency || bizCurrency) + ' '}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={form.amount}
                  onChangeText={set('amount')}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.helperText}>Currency is set by the selected duration's rate.</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create Ticket</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <AddCustomerModal
        visible={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        initialName={customerSearch}
        onCreated={c => { setSelectedCustomer(c); setCustomerSearch(''); }}
      />
      <AddRateModal
        visible={newRateOpen}
        onClose={() => setNewRateOpen(false)}
        bizCurrency={bizCurrency}
        onCreated={applyRate}
      />
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const GamingTicketsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_GAMING_TICKETS);
  const { currency: bizCurrency, rates } = useCurrency();

  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Recompute countdowns every second — client-side only, matches web's live timer.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const queryParams = {
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: raw = [], isLoading, refetch } = useGamingTickets(queryParams);
  const { data: rawRates = [] } = useGamingTicketRates();
  const { mutateAsync: create, isPending: creating } = useCreateGamingTicket();

  const tickets = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const ticketRates = Array.isArray(rawRates) ? rawRates : (rawRates?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create ticket');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Gaming Tickets</Text>
          <Text style={styles.subHeading}>Prepaid time-based session tickets</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+ New Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tickets}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(v => !v)}>
              <Text style={styles.filterToggleText}>{filtersOpen ? '▾' : '▸'} Filter</Text>
            </TouchableOpacity>
            {filtersOpen && (
              <View style={styles.filtersBody}>
                <TextInput
                  style={styles.input}
                  placeholder="Search by ticket #, name, customer…"
                  placeholderTextColor="#999"
                  value={search}
                  onChangeText={setSearch}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><DatePicker label="From" value={dateFrom} onDateChange={setDateFrom} /></View>
                  <View style={{ flex: 1 }}><DatePicker label="To" value={dateTo} onDateChange={setDateTo} /></View>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const expiresAtMs = item.expiresAt ? new Date(item.expiresAt).getTime() : 0;
          const remainingMs = expiresAtMs - now;
          const isEnded = item.status === 'Ended' || remainingMs <= 0;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketNum}>{item.ticketNumber}</Text>
                  <Text style={styles.ticketName} numberOfLines={1}>{item.ticketName}</Text>
                </View>
                <View style={[styles.badge, isEnded ? styles.badgeEnded : styles.badgeActive]}>
                  <Text style={[styles.badgeText, { color: isEnded ? '#b91c1c' : '#15803d' }]}>
                    {isEnded ? 'Ended' : fmtCountdown(remainingMs)}
                  </Text>
                </View>
              </View>
              <Text style={styles.customerName}>
                {item.customer?.name ?? 'Walk-in'}{item.customer?.phone ? ` · ${item.customer.phone}` : ''}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{fmtDuration(item.durationMinutes)} · {item.numberOfUsers ?? 1} user{(item.numberOfUsers ?? 1) === 1 ? '' : 's'}</Text>
                <Text style={styles.amount}>{fmtCur(item.amount, item.currency)}</Text>
              </View>
              {item.createdBy?.fullName ? (
                <Text style={styles.createdBy}>by {item.createdBy.fullName}</Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No gaming tickets found.</Text>}
      />

      <CreateTicketModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        rates={ticketRates}
        bizCurrency={bizCurrency}
        exchangeRates={rates}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  filtersWrap: { paddingTop: 10 },
  filterToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  filterToggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  filtersBody: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4, gap: 8, borderWidth: 1, borderColor: '#eee' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ticketNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  ticketName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeEnded: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-Bold' },
  customerName: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  createdBy: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },

  // Modal
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  formSection: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  helperText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },

  selectedCustomer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 },
  selectedCustomerName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1e40af' },
  selectedCustomerPhone: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#3b82f6', marginTop: 2 },
  selectedCustomerClear: { fontSize: 16, color: '#93c5fd', paddingLeft: 12, fontFamily: 'Outfit-Bold' },
  customerResultsList: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, overflow: 'hidden', marginTop: 8, marginBottom: 14, backgroundColor: '#fff' },
  customerResultRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  customerResultName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  customerResultPhone: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  emptyResultText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', padding: 14, fontSize: 13 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  // Inline "add new" affordances + small centered modals (Add Customer / Add Rate)
  inlineAddBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  inlineAddBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  inlineAddLink: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  centerModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },

  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, backgroundColor: '#fff' },
  amountPrefix: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#6b7280', paddingLeft: 12 },
  amountInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
});

export default GamingTicketsScreen;
