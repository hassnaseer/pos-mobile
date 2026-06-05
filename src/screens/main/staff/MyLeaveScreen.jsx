import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useMyLeaveRequests, useApplyLeave, useCancelLeave } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const EMPTY_FORM = { leaveType: 'Annual', startDate: '', endDate: '', reason: '' };
const STATUS_COLOR = { pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444', cancelled: '#9CA3AF' };

const MyLeaveScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useMyLeaveRequests();
  const { mutateAsync: apply, isPending: applying } = useApplyLeave();
  const { mutateAsync: cancel } = useCancelLeave();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleApply = async () => {
    if (!form.startDate.trim()) { Alert.alert('Error', 'Start date is required'); return; }
    try {
      await apply(form);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Failed to apply'); }
  };

  const handleCancel = item => Alert.alert('Cancel Leave', 'Cancel this leave request?', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Cancel Request', style: 'destructive', onPress: async () => {
      try { await cancel(item.id); }
      catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
    }},
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>My Leave</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
          <Text style={styles.applyBtnText}>+ Apply</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.leaveType ?? 'Leave'}</Text>
              <Text style={styles.rowSub}>{item.startDate} → {item.endDate ?? item.startDate}</Text>
              {item.reason ? <Text style={styles.rowSub} numberOfLines={1}>{item.reason}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'pending'}</Text>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leave requests yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            {[
              { key: 'leaveType',  label: 'Leave Type (Annual / Sick / Other)' },
              { key: 'startDate',  label: 'Start Date * (YYYY-MM-DD)' },
              { key: 'endDate',    label: 'End Date (YYYY-MM-DD)' },
              { key: 'reason',     label: 'Reason' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={set(f.key)} placeholder={f.label.replace(' *', '')} placeholderTextColor="#999" />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying}>
                {applying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:        { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  applyBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  applyBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:            { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:        { flex: 1 },
  rowName:        { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:         { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:       { alignItems: 'flex-end', gap: 6 },
  badge:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cancelBtn:      { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  cancelText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:          { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:     { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:          { marginBottom: 12 },
  label:          { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:          { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCancelText:{ fontFamily: 'Outfit-Medium', color: '#6B7280' },
  submitBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default MyLeaveScreen;
