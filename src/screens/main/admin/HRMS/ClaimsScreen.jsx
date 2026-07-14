import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { useClaims, useApproveClaim, useRejectClaim, useDeleteClaim } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_FILTERS = ['all', 'Pending', 'Approved', 'Rejected'];
const STATUS_COLOR = { Pending: '#F59E0B', Approved: '#10B981', Rejected: '#EF4444' };

const ClaimsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_CLAIMS);
  const { fmt } = useCurrency();

  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: raw = [], isLoading, refetch } = useClaims({ status: statusFilter !== 'all' ? statusFilter : undefined });
  const { mutateAsync: approve, isPending: approving } = useApproveClaim();
  const { mutateAsync: reject, isPending: rejecting } = useRejectClaim();
  const { mutate: remove } = useDeleteClaim();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const openReview = c => { setReviewTarget(c); setAdminNotes(''); };
  const closeReview = () => { setReviewTarget(null); setAdminNotes(''); };

  const handleApprove = async () => {
    try { await approve({ id: reviewTarget.id, adminNotes }); closeReview(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to approve claim'); }
  };

  const handleReject = async () => {
    try { await reject({ id: reviewTarget.id, adminNotes }); closeReview(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to reject claim'); }
  };

  const handleDelete = c => Alert.alert('Delete Claim', `Delete "${c.title}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(c.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Expense Claims</Text>
        <Text style={styles.subHeading}>Review and manage staff expense claims</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s === 'all' ? 'All' : s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.user?.name ?? '—'}  ·  {fmt(item.amount)}</Text>
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'Pending'}</Text>
              </View>
              {canManage && (
                <View style={styles.actions}>
                  {item.status === 'Pending' && (
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => openReview(item)}>
                      <Text style={styles.reviewText}>Review</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delText}>Del</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No claims yet.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
      />

      <Modal visible={!!reviewTarget} animationType="fade" transparent onRequestClose={closeReview}>
        <View style={styles.modalBg}>
          <View style={styles.reviewCard}>
            <Text style={styles.modalTitle}>Review Claim — {reviewTarget?.title}</Text>
            {reviewTarget && (
              <>
                <View style={styles.reviewInfoBox}>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Staff</Text><Text style={styles.reviewInfoValue}>{reviewTarget.user?.name ?? '—'}</Text></View>
                  <View style={styles.reviewInfoRow}><Text style={styles.reviewInfoLabel}>Amount</Text><Text style={styles.reviewInfoValueBold}>{fmt(reviewTarget.amount)}</Text></View>
                  {reviewTarget.description ? (
                    <View style={styles.reviewReasonBox}>
                      <Text style={styles.reviewInfoLabel}>Description</Text>
                      <Text style={styles.reviewReasonText}>{reviewTarget.description}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Reason for approval or rejection…"
                  placeholderTextColor="#999"
                  multiline
                />

                <View style={styles.reviewActions}>
                  <TouchableOpacity style={styles.reviewCancelBtn} onPress={closeReview}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reviewRejectBtn} onPress={handleReject} disabled={rejecting || approving}>
                    {rejecting ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reviewApproveBtn} onPress={handleApprove} disabled={approving || rejecting}>
                    {approving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Approve</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading:   { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  filterRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },
  row:          { backgroundColor: '#fff', marginBottom: 8, borderRadius: 10, padding: 14, gap: 8, flexDirection: 'row' },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', gap: 6 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:      { flexDirection: 'row', gap: 6 },
  reviewBtn:    { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  reviewText:   { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  reviewCard:   { backgroundColor: '#fff', borderRadius: 16, margin: 20, padding: 20 },
  modalTitle:   { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 12 },
  reviewInfoBox:{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, gap: 8, marginBottom: 14 },
  reviewInfoRow:{ flexDirection: 'row', justifyContent: 'space-between' },
  reviewInfoLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  reviewInfoValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111' },
  reviewInfoValueBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111' },
  reviewReasonBox: { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  reviewReasonText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#374151', marginTop: 2 },
  fieldLabel:   { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  reviewActions:{ flexDirection: 'row', gap: 8, marginTop: 16 },
  reviewCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  reviewRejectBtn: { flex: 1, borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText:{ color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  reviewApproveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default ClaimsScreen;
