import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSADemoRequests, useUpdateSADemoStatus } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_OPTIONS = ['pending', 'contacted', 'demo-scheduled', 'completed', 'rejected'];

const STATUS_COLORS = {
  pending:          { bg: '#fef3c7', text: '#92400e' },
  contacted:        { bg: '#dbeafe', text: '#1e40af' },
  'demo-scheduled': { bg: '#e0e7ff', text: '#3730a3' },
  completed:        { bg: '#d1fae5', text: '#065f46' },
  rejected:         { bg: '#fee2e2', text: '#991b1b' },
};

const fmtDate = d => {
  if (!d) return '';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SADemoRequestsScreen() {
  const [filterStatus, setFilterStatus] = useState('');
  const { data: requests = [], isLoading, refetch } = useSADemoRequests(filterStatus);
  const { mutateAsync: updateStatus, isPending: updating } = useUpdateSADemoStatus();

  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusModal, setStatusModal] = useState(false);

  const openStatusModal = req => {
    setSelected(req);
    setNewStatus(req.status ?? 'pending');
    setStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await updateStatus({ id: selected.id, status: newStatus });
      setStatusModal(false);
      refetch();
    } catch (e) {
      // handled silently — status update failure is non-critical
    }
  };

  const statusColors = status => STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280' };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Demo Requests</Text>
        <Text style={styles.subtitle}>{requests.length} total request{requests.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterWrap}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterTab, !filterStatus && styles.filterTabActive]}
            onPress={() => setFilterStatus('')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, !filterStatus && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, filterStatus === s && styles.filterTabActive]}
              onPress={() => setFilterStatus(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, filterStatus === s && styles.filterTabTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No demo requests{filterStatus ? ` with status "${filterStatus}"` : ''}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {requests.map(req => {
            const sc = statusColors(req.status);
            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{req.name ?? req.contactName ?? 'Unknown'}</Text>
                    <Text style={styles.reqEmail}>{req.email}</Text>
                    {req.company && <Text style={styles.reqCompany}>{req.company}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {(req.status ?? 'pending').replace('-', ' ')}
                    </Text>
                  </View>
                </View>

                {req.message && (
                  <Text style={styles.reqMessage} numberOfLines={2}>{req.message}</Text>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.reqDate}>{fmtDate(req.createdAt)}</Text>
                  <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={() => openStatusModal(req)}
                    disabled={updating}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.updateBtnText}>Update Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Status modal */}
      <Modal visible={statusModal} transparent animationType="slide" onRequestClose={() => setStatusModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <Text style={styles.modalSub}>{selected?.name ?? selected?.email}</Text>

            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={newStatus}
                onValueChange={setNewStatus}
                style={styles.picker}
              >
                {STATUS_OPTIONS.map(s => (
                  <Picker.Item key={s} label={s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')} value={s} />
                ))}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModal(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateStatus} disabled={updating} activeOpacity={0.8}>
                {updating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  filterWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  filterTab: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6' },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  reqEmail: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  reqCompany: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', textTransform: 'capitalize' },
  reqMessage: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', marginBottom: 10, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 10 },
  reqDate: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  updateBtn: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '40' },
  updateBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 12 },
  pickerWrap: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 8 },
  picker: { height: 150 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
