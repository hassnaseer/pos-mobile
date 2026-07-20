import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import {
  useRERentInvoices, useMarkRERentInvoicePaid, useCancelRERentInvoice,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Overdue', 'Cancelled'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

const fmtCur = (n, cur, symbols) => `${symbols[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Mark Paid Modal ─────────────────────────────────────────────────────────────
const MarkPaidModal = ({ visible, invoice, onClose, onSave, isSaving }) => {
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    if (visible) { setPaidAmount(invoice?.amount != null ? String(invoice.amount) : ''); setPaymentMethod(''); }
  }, [visible, invoice]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Mark Invoice Paid</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Paid Amount</Text>
            <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
          </View>
          <InlinePicker label="Payment Method" options={PAYMENT_METHODS.map(m => ({ id: m, name: m }))} value={paymentMethod} onSelect={setPaymentMethod} placeholder="Select method" />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              disabled={isSaving}
              onPress={() => onSave({
                paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
                paymentMethod: paymentMethod || undefined,
              })}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Mark Paid</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const RentInvoicesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_RENT);
  const { currency: bizCurrency } = useCurrency();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payTarget, setPayTarget] = useState(null);

  const queryParams = {
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: raw = [], isLoading, refetch } = useRERentInvoices(queryParams);
  const { mutateAsync: markPaid, isPending: paying } = useMarkRERentInvoicePaid();
  const { mutateAsync: cancelInvoice, isPending: cancelling } = useCancelRERentInvoice();

  const invoices = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleMarkPaid = async payload => {
    if (!payTarget) return;
    try {
      await markPaid({ id: payTarget.id, ...payload });
      setPayTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to mark invoice paid');
    }
  };

  const handleCancel = invoice => {
    Alert.alert('Cancel Invoice', `Cancel invoice ${invoice.referenceNumber ?? invoice.reference ?? ''}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { await cancelInvoice(invoice.id); } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Failed to cancel invoice'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Rent Collection</Text>
          <Text style={styles.subHeading}>Auto-generated rent invoices</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={invoices}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(v => !v)}>
              <Text style={styles.filterToggleText}>{filtersOpen ? '▾' : '▸'} Filter</Text>
            </TouchableOpacity>
            {filtersOpen && (
              <View style={styles.filtersBody}>
                <TextInput style={styles.input} placeholder="Search by reference, tenant…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><DatePicker label="From" value={dateFrom} onDateChange={setDateFrom} /></View>
                  <View style={{ flex: 1 }}><DatePicker label="To" value={dateTo} onDateChange={setDateTo} /></View>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'Pending' || item.status === 'Overdue';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refNum}>{item.referenceNumber ?? item.reference}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.lease?.unit?.label ?? item.lease?.tenant?.name ?? 'Invoice'}</Text>
                </View>
                <View style={[styles.badge, item.status === 'Paid' ? styles.badgeActive : item.status === 'Overdue' ? styles.badgeOverdue : styles.badgeNeutral]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>Due: {item.dueDate?.slice(0, 10)}</Text>
              <Text style={styles.amount}>{fmtCur(item.amount, item.currency ?? bizCurrency, CURRENCY_SYMBOLS)}</Text>
              {canManage && isPending && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setPayTarget(item)}>
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Mark Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(item)} disabled={cancelling}>
                    <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No rent invoices found.</Text>}
      />

      <MarkPaidModal visible={!!payTarget} invoice={payTarget} onClose={() => setPayTarget(null)} onSave={handleMarkPaid} isSaving={paying} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', flexWrap: 'wrap' },
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
  refNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeOverdue: { backgroundColor: '#fee2e2' },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#374151' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },

  centerModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RentInvoicesScreen;
