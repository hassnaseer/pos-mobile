import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useSAPaymentQueue, useApproveSAPayment, useRejectSAPayment } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  pending:  { bg: '#fef9c3', text: '#b45309' },
  approved: { bg: '#dcfce7', text: '#16a34a' },
  rejected: { bg: '#fee2e2', text: '#dc2626' },
};

const SAPaymentQueueScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSAPaymentQueue();
  const requests = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: approve, isPending: approving } = useApproveSAPayment();
  const { mutateAsync: reject, isPending: rejecting } = useRejectSAPayment();

  const [rejectModal, setRejectModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const STATUSES = ['pending', 'approved', 'rejected'];

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;

  const handleApprove = item =>
    Alert.alert('Approve', `Approve payment of PKR ${item.amount} from ${item.businessName ?? item.business?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          try { await approve({ id: item.id }); }
          catch { Alert.alert('Error', 'Approve failed'); }
        },
      },
    ]);

  const openReject = item => { setSelected(item); setReason(''); setRejectModal(true); };

  const handleReject = async () => {
    try {
      await reject({ id: selected.id, reason });
      setRejectModal(false);
    } catch { Alert.alert('Error', 'Reject failed'); }
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...STATUSES].map(s => (
          <TouchableOpacity key={s || 'all'} style={[styles.chip, filterStatus === s && styles.chipActive]} onPress={() => setFilterStatus(s)}>
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No payment requests.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.bizName} numberOfLines={1}>{item.businessName ?? item.business?.name ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{item.status ?? 'pending'}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.amount}>PKR {item.amount ?? '—'}</Text>
              </View>
              {item.plan && <View style={styles.row}><Text style={styles.label}>Plan</Text><Text style={styles.value}>{item.plan}</Text></View>}
              {item.screenshotUrl ? <Text style={styles.sub}>Receipt attached</Text> : null}
              {item.submittedAt && <Text style={styles.sub}>{new Date(item.submittedAt).toLocaleString()}</Text>}
              {item.status === 'pending' && (
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)} disabled={approving}>
                    {approving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveBtnText}>Approve</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => openReject(item)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={rejectModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Reason (optional)</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={reason} onChangeText={setReason} placeholder="Reason for rejection" placeholderTextColor="#999" multiline />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectConfirmBtn} onPress={handleReject} disabled={rejecting}>
                {rejecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.rejectConfirmText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 54 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bizName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  amount: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  value: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a' },
  sub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  rejectBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  rejectBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  rejectConfirmBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  rejectConfirmText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SAPaymentQueueScreen;
