import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useREDeals, useREDealColumns, useMoveREDeal, useCreateLeaseFromDeal, useStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const DEAL_TYPE_FILTERS = [{ id: '', name: 'All Types' }, { id: 'sale', name: 'Sale' }, { id: 'lease', name: 'Lease' }];
const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annually'];

const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Move-to-stage bottom sheet (+ optional lost reason) ───────────────────────
const MoveStageModal = ({ visible, deal, columns, onClose, onMove, isMoving }) => {
  const [pendingLostColumn, setPendingLostColumn] = useState(null);
  const [lostReason, setLostReason] = useState('');

  const handlePick = col => {
    if (col.isLostStage) {
      setPendingLostColumn(col);
      setLostReason('');
    } else {
      onMove(col, undefined);
    }
  };

  const handleConfirmLost = () => {
    onMove(pendingLostColumn, lostReason.trim() || undefined);
    setPendingLostColumn(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerSheet}>
          {pendingLostColumn ? (
            <>
              <Text style={styles.pickerHeading}>Reason (optional)</Text>
              <View style={{ paddingHorizontal: 12 }}>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top', marginBottom: 12 }]}
                  value={lostReason}
                  onChangeText={setLostReason}
                  placeholder={`Why is this deal moving to ${pendingLostColumn.name}?`}
                  placeholderTextColor="#999"
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingLostColumn(null)}>
                    <Text style={styles.cancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmLost} disabled={isMoving}>
                    {isMoving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.pickerHeading}>Move to Stage</Text>
              {columns.map(col => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.pickerOption, deal?.columnId === col.id && { backgroundColor: '#f0f0f0' }]}
                  onPress={() => handlePick(col)}
                  disabled={isMoving}
                >
                  <Text style={[styles.pickerOptionText, deal?.columnId === col.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{col.name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Finalize Lease modal ───────────────────────────────────────────────────────
const FinalizeLeaseModal = ({ visible, deal, onClose, onSave, isSaving }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('Monthly');

  const handleSubmit = () => {
    if (!startDate || !endDate) { Alert.alert('Required', 'Start and end dates are required'); return; }
    const rent = parseFloat(rentAmount);
    if (isNaN(rent) || rent <= 0) { Alert.alert('Required', 'Enter a valid rent amount'); return; }
    onSave({ startDate, endDate, rentAmount: rent, billingCycle });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>Finalize Lease</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.metaText}>{deal?.unit?.label ?? deal?.unit?.unitNumber ?? 'Unit'}</Text>
            <View style={{ marginTop: 8 }}>
              <DatePicker label="Start Date *" value={startDate} onDateChange={setStartDate} />
              <DatePicker label="End Date *" value={endDate} onDateChange={setEndDate} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Rent Amount *</Text>
              <TextInput style={styles.input} value={rentAmount} onChangeText={setRentAmount} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
            </View>
            <InlinePicker label="Billing Cycle" options={BILLING_CYCLES.map(c => ({ id: c, name: c }))} value={billingCycle} onSelect={setBillingCycle} allowNone={false} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Finalize Lease</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const DealsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_DEALS);
  const { currency: bizCurrency } = useCurrency();

  const [search, setSearch] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [leaseTarget, setLeaseTarget] = useState(null);

  const queryParams = { dealType: dealTypeFilter || undefined, agentId: agentFilter || undefined, search: search || undefined };

  const { data: raw = [], isLoading, refetch } = useREDeals(queryParams);
  const { data: rawColumns = [] } = useREDealColumns();
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: moveDeal, isPending: moving } = useMoveREDeal();
  const { mutateAsync: createLease, isPending: finalizing } = useCreateLeaseFromDeal();

  const deals = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const columns = Array.isArray(rawColumns) ? rawColumns : (rawColumns?.data ?? []);
  const agents = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const columnById = id => columns.find(c => c.id === id);

  const handleMove = async (col, lostReason) => {
    if (!moveTarget) return;
    try {
      await moveDeal({ id: moveTarget.id, columnId: col.id, order: 0, lostReason });
      setMoveTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to move deal');
    }
  };

  const handleFinalizeLease = async payload => {
    if (!leaseTarget) return;
    try {
      await createLease({ id: leaseTarget.id, ...payload });
      setLeaseTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to finalize lease');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Deals</Text>
          <Text style={styles.subHeading}>Sales & lease pipeline</Text>
        </View>
      </View>

      <FlatList
        data={deals}
        keyExtractor={d => String(d.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(v => !v)}>
              <Text style={styles.filterToggleText}>{filtersOpen ? '▾' : '▸'} Filter</Text>
            </TouchableOpacity>
            {filtersOpen && (
              <View style={styles.filtersBody}>
                <TextInput style={styles.input} placeholder="Search by reference, customer…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
                <InlinePicker label="" options={DEAL_TYPE_FILTERS} value={dealTypeFilter} onSelect={setDealTypeFilter} placeholder="All types" allowNone={false} />
                <InlinePicker label="" options={agents.map(a => ({ id: a.id, name: a.name ?? a.fullName }))} value={agentFilter} onSelect={setAgentFilter} placeholder="All agents" />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const col = columnById(item.columnId);
          const canFinalize = canManage && item.dealType === 'lease' && col?.isWonStage && !item.leaseId && !item.lease;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refNum}>{item.referenceNumber ?? item.reference}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.unit?.label ?? item.unit?.property?.title ?? item.unit?.unitNumber ?? 'Unit'}</Text>
                </View>
                <View style={[styles.badge, col?.isWonStage ? styles.badgeWon : col?.isLostStage ? styles.badgeLost : styles.badgeNeutral]}>
                  <Text style={styles.badgeText}>{col?.name ?? '—'}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>{item.customer?.name ?? 'No customer'} · {item.agent?.name ?? 'Unassigned'}</Text>
              <Text style={styles.amount}>{fmtCur(item.dealValue, item.currency ?? bizCurrency)} · {item.dealType === 'lease' ? 'Lease' : 'Sale'}</Text>
              {canManage && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setMoveTarget(item)} disabled={moving}>
                    <Text style={styles.actionBtnText}>Move to stage ▾</Text>
                  </TouchableOpacity>
                  {canFinalize && (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setLeaseTarget(item)}>
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Finalize Lease →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No deals found.</Text>}
      />

      <MoveStageModal
        visible={!!moveTarget}
        deal={moveTarget}
        columns={columns}
        onClose={() => setMoveTarget(null)}
        onMove={handleMove}
        isMoving={moving}
      />
      <FinalizeLeaseModal
        visible={!!leaseTarget}
        deal={leaseTarget}
        onClose={() => setLeaseTarget(null)}
        onSave={handleFinalizeLease}
        isSaving={finalizing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },

  filtersWrap: { paddingTop: 10 },
  filterToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  filterToggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  filtersBody: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4, gap: 8, borderWidth: 1, borderColor: '#eee' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  refNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeWon: { backgroundColor: '#dcfce7' },
  badgeLost: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#374151' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },

  // Modal
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  // Picker sheet
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', padding: 8, paddingBottom: 16 },
  pickerHeading: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827', padding: 12 },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
});

export default DealsScreen;
