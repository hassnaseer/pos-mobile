import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useRELeases, useCreateRELease, useRenewRELease, useTerminateRELease, useCreateRESignatureRequest,
  useREUnitLookup, useCustomers, useStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annually'];
const STATUS_FILTERS = ['All', 'Active', 'Expired', 'Terminated'];
const SIGNER_ROLES = [{ id: 'tenant', name: 'Tenant' }, { id: 'landlord', name: 'Landlord' }, { id: 'agent', name: 'Agent' }];
const CHANNELS = [{ id: 'remote', name: 'Remote (email link)' }, { id: 'in_person', name: 'In Person' }];

const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
  unitId: '', tenantId: '', agentId: '', startDate: '', endDate: '',
  rentAmount: '', currency: '', billingCycle: 'Monthly', dueDayOfMonth: '', depositAmount: '', notes: '',
};

// ─── Unit search-as-you-type ────────────────────────────────────────────────────
const UnitSearchField = ({ value, onSelect }) => {
  const [search, setSearch] = useState('');
  const { data: rawResults = [] } = useREUnitLookup(search);
  const results = Array.isArray(rawResults) ? rawResults : (rawResults?.data ?? []);

  if (value) {
    return (
      <View style={styles.selectedChip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedChipName}>{value.label}</Text>
        </View>
        <TouchableOpacity onPress={() => onSelect(null)}><Text style={styles.selectedChipClear}>✕</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Unit *</Text>
      <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search units…" placeholderTextColor="#999" />
      {search.trim().length > 0 && (
        <View style={styles.resultsList}>
          {results.slice(0, 8).map(u => (
            <TouchableOpacity key={u.id} style={styles.resultRow} onPress={() => { onSelect(u); setSearch(''); }}>
              <Text style={styles.resultName}>{u.label}</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && <Text style={styles.emptyResultText}>No matching units</Text>}
        </View>
      )}
    </View>
  );
};

// ─── Create Lease Modal ─────────────────────────────────────────────────────────
const CreateLeaseModal = ({ visible, onClose, onSave, isSaving, tenants, agents, bizCurrency }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => { if (visible) { setForm(EMPTY_FORM); setSelectedUnit(null); } }, [visible]);

  const handleSubmit = () => {
    if (!selectedUnit) { Alert.alert('Required', 'Please select a unit'); return; }
    if (!form.startDate || !form.endDate) { Alert.alert('Required', 'Start and end dates are required'); return; }
    const rent = parseFloat(form.rentAmount);
    if (isNaN(rent) || rent <= 0) { Alert.alert('Required', 'Enter a valid rent amount'); return; }
    onSave({
      unitId: selectedUnit.id,
      tenantId: form.tenantId || undefined,
      agentId: form.agentId || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      rentAmount: rent,
      currency: form.currency || bizCurrency,
      billingCycle: form.billingCycle,
      dueDayOfMonth: form.dueDayOfMonth ? parseInt(form.dueDayOfMonth, 10) : undefined,
      depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Lease</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSection}>Unit</Text>
            <UnitSearchField value={selectedUnit} onSelect={setSelectedUnit} />

            <Text style={styles.formSection}>Parties</Text>
            <InlinePicker label="Tenant" options={tenants.map(t => ({ id: t.id, name: t.name }))} value={form.tenantId} onSelect={set('tenantId')} placeholder="Select tenant" />
            <InlinePicker label="Agent" options={agents.map(a => ({ id: a.id, name: a.name ?? a.fullName }))} value={form.agentId} onSelect={set('agentId')} placeholder="Select agent" />

            <Text style={styles.formSection}>Term</Text>
            <DatePicker label="Start Date *" value={form.startDate} onDateChange={set('startDate')} />
            <DatePicker label="End Date *" value={form.endDate} onDateChange={set('endDate')} />

            <Text style={styles.formSection}>Rent</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Rent Amount *</Text>
                <TextInput style={styles.input} value={form.rentAmount} onChangeText={set('rentAmount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <InlinePicker label="Currency" options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency || bizCurrency} onSelect={set('currency')} allowNone={false} />
              </View>
            </View>
            <InlinePicker label="Billing Cycle *" options={BILLING_CYCLES.map(c => ({ id: c, name: c }))} value={form.billingCycle} onSelect={set('billingCycle')} allowNone={false} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Due Day of Month</Text>
                <TextInput style={styles.input} value={form.dueDayOfMonth} onChangeText={set('dueDayOfMonth')} placeholder="1-31" placeholderTextColor="#999" keyboardType="number-pad" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Deposit Amount</Text>
                <TextInput style={styles.input} value={form.depositAmount} onChangeText={set('depositAmount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create Lease</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Renew Modal ─────────────────────────────────────────────────────────────────
const RenewModal = ({ visible, lease, onClose, onSave, isSaving }) => {
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');

  useEffect(() => { if (visible) { setEndDate(''); setRentAmount(''); } }, [visible]);

  const handleSubmit = () => {
    if (!endDate) { Alert.alert('Required', 'New end date is required'); return; }
    onSave({ endDate, rentAmount: rentAmount ? parseFloat(rentAmount) : undefined });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Renew Lease</Text>
          <DatePicker label="New End Date *" value={endDate} onDateChange={setEndDate} />
          <View style={styles.field}>
            <Text style={styles.label}>New Rent Amount</Text>
            <TextInput style={styles.input} value={rentAmount} onChangeText={setRentAmount} placeholder={String(lease?.rentAmount ?? '')} placeholderTextColor="#999" keyboardType="decimal-pad" />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Renew</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Terminate Modal ─────────────────────────────────────────────────────────────
const TerminateModal = ({ visible, onClose, onSave, isSaving }) => {
  const [reason, setReason] = useState('');
  useEffect(() => { if (visible) setReason(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Terminate Lease</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={reason} onChangeText={setReason} placeholder="Reason for termination" placeholderTextColor="#999" multiline />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#dc2626' }]} onPress={() => onSave({ reason: reason.trim() || undefined })} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Terminate</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Request Signature Modal ─────────────────────────────────────────────────────
const SignatureModal = ({ visible, onClose, onSave, isSaving }) => {
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRole, setSignerRole] = useState('tenant');
  const [channel, setChannel] = useState('remote');

  useEffect(() => {
    if (visible) { setSignerName(''); setSignerEmail(''); setSignerRole('tenant'); setChannel('remote'); }
  }, [visible]);

  const handleSubmit = () => {
    if (!signerName.trim()) { Alert.alert('Required', 'Signer name is required'); return; }
    if (channel === 'remote' && !signerEmail.trim()) { Alert.alert('Required', 'Signer email is required for remote signing'); return; }
    onSave({ signerName: signerName.trim(), signerEmail: signerEmail.trim() || undefined, signerRole, channel });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Request Signature</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Signer Name *</Text>
            <TextInput style={styles.input} value={signerName} onChangeText={setSignerName} placeholder="Full name" placeholderTextColor="#999" />
          </View>
          <InlinePicker label="Signer Role" options={SIGNER_ROLES} value={signerRole} onSelect={setSignerRole} allowNone={false} />
          <InlinePicker label="Channel" options={CHANNELS} value={channel} onSelect={setChannel} allowNone={false} />
          {channel === 'remote' && (
            <View style={styles.field}>
              <Text style={styles.label}>Signer Email *</Text>
              <TextInput style={styles.input} value={signerEmail} onChangeText={setSignerEmail} placeholder="signer@example.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />
            </View>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Send Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const LeasesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_LEASES);
  const { currency: bizCurrency } = useCurrency();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [signatureTarget, setSignatureTarget] = useState(null);

  const queryParams = { status: statusFilter === 'All' ? undefined : statusFilter, search: search || undefined };

  const { data: raw = [], isLoading, refetch } = useRELeases(queryParams);
  const { data: rawCustomers = [] } = useCustomers();
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: create, isPending: creating } = useCreateRELease();
  const { mutateAsync: renew, isPending: renewing } = useRenewRELease();
  const { mutateAsync: terminate, isPending: terminating } = useTerminateRELease();
  const { mutateAsync: requestSignature, isPending: sendingSignature } = useCreateRESignatureRequest();

  const leases = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const tenants = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const agents = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create lease');
    }
  };

  const handleRenew = async payload => {
    if (!renewTarget) return;
    try {
      await renew({ id: renewTarget.id, ...payload });
      setRenewTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to renew lease');
    }
  };

  const handleTerminate = async payload => {
    if (!terminateTarget) return;
    try {
      await terminate({ id: terminateTarget.id, ...payload });
      setTerminateTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to terminate lease');
    }
  };

  const handleSignatureRequest = async payload => {
    if (!signatureTarget) return;
    try {
      await requestSignature({ documentType: 'lease', leaseId: signatureTarget.id, ...payload });
      setSignatureTarget(null);
      if (payload.channel === 'in_person') {
        Alert.alert('Signature Requested', "Ask the signer to open the emailed/shared link on this device's browser.");
      }
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to send signature request');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Leases</Text>
          <Text style={styles.subHeading}>Tenant leases & renewals</Text>
        </View>
        {canManage && (
          <HeaderAddButton onPress={() => setShowCreate(true)} label="New Lease" />
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
        data={leases}
        keyExtractor={l => String(l.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, paddingTop: 8 }}
        ListHeaderComponent={
          <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Search leases…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        }
        renderItem={({ item }) => {
          const isActive = item.status === 'Active';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refNum}>{item.referenceNumber ?? item.reference}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.unit?.label ?? item.unit?.property?.title ?? 'Unit'}</Text>
                </View>
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeNeutral]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>Tenant: {item.tenant?.name ?? '—'}</Text>
              <Text style={styles.metaText}>{item.startDate?.slice(0, 10)} → {item.endDate?.slice(0, 10)}</Text>
              <Text style={styles.amount}>{fmtCur(item.rentAmount, item.currency ?? bizCurrency)} / {item.billingCycle}</Text>
              {canManage && isActive && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setRenewTarget(item)}>
                    <Text style={styles.actionBtnText}>Renew</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setTerminateTarget(item)}>
                    <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Terminate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setSignatureTarget(item)}>
                    <Text style={styles.actionBtnText}>Request Signature</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leases found.</Text>}
      />

      <CreateLeaseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        tenants={tenants}
        agents={agents}
        bizCurrency={bizCurrency}
      />
      <RenewModal visible={!!renewTarget} lease={renewTarget} onClose={() => setRenewTarget(null)} onSave={handleRenew} isSaving={renewing} />
      <TerminateModal visible={!!terminateTarget} onClose={() => setTerminateTarget(null)} onSave={handleTerminate} isSaving={terminating} />
      <SignatureModal visible={!!signatureTarget} onClose={() => setSignatureTarget(null)} onSave={handleSignatureRequest} isSaving={sendingSignature} />
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

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  refNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#374151' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
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
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  centerModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },

  // Unit search
  selectedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 },
  selectedChipName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1e40af' },
  selectedChipClear: { fontSize: 16, color: '#93c5fd', paddingLeft: 12, fontFamily: 'Outfit-Bold' },
  resultsList: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, overflow: 'hidden', marginTop: 8, backgroundColor: '#fff' },
  resultRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  resultName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  emptyResultText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', padding: 14, fontSize: 13 },
});

export default LeasesScreen;
