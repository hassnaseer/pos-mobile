import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useSAVendors, useUpdateSAVendorStatus } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_FILTER = ['all', 'active', 'suspended'];

const StatusDot = ({ status }) => {
  const color = status === 'active' ? '#16a34a' : status === 'suspended' ? '#dc2626' : '#9ca3af';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
};

export default function SAVendorsScreen() {
  const { data: vendors = [], isLoading } = useSAVendors();
  const { mutateAsync: updateStatus, isPending: updating } = useUpdateSAVendorStatus();

  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendModal, setSuspendModal]   = useState(false);

  const visible = filter === 'all' ? vendors : vendors.filter(v => v.status === filter);
  const selectedVendor = vendors.find(v => v.id === selected) ?? null;
  const suspendedCount = vendors.filter(v => v.status === 'suspended').length;

  const handleStatusToggle = vendor => {
    if (vendor.status === 'active') {
      setSelected(vendor.id);
      setSuspendReason('');
      setSuspendModal(true);
    } else {
      Alert.alert(
        'Unsuspend Vendor',
        `Reactivate ${vendor.businessName ?? vendor.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unsuspend',
            onPress: async () => {
              try { await updateStatus({ id: vendor.id, status: 'active' }); }
              catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
            },
          },
        ],
      );
    }
  };

  const handleSuspend = async () => {
    try {
      await updateStatus({ id: selected, status: 'suspended', suspensionReason: suspendReason });
      setSuspendModal(false);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to suspend');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vendors</Text>
          <Text style={styles.subtitle}>Manage marketplace vendors</Text>
        </View>
        {suspendedCount > 0 && (
          <View style={styles.suspendedBadge}>
            <Text style={styles.suspendedText}>{suspendedCount} suspended</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTER.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterTab, filter === s && styles.filterTabActive]}
            onPress={() => setFilter(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === s && styles.filterTabTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No vendors{filter !== 'all' ? ` with status "${filter}"` : ''}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {visible.map(vendor => {
            const isSelected = selected === vendor.id;
            return (
              <TouchableOpacity
                key={vendor.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(isSelected ? null : vendor.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(vendor.businessName ?? vendor.name ?? 'V')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName}>{vendor.businessName ?? vendor.name}</Text>
                    <Text style={styles.vendorEmail}>{vendor.email}</Text>
                    <Text style={styles.vendorPlan}>{vendor.plan ?? 'No plan'}</Text>
                  </View>
                  <View style={styles.statusWrap}>
                    <StatusDot status={vendor.status} />
                    <Text style={styles.statusText}>{vendor.status}</Text>
                  </View>
                </View>

                {/* Expanded detail */}
                {isSelected && (
                  <View style={styles.detail}>
                    {vendor.suspensionReason ? (
                      <Text style={styles.suspendReason}>Reason: {vendor.suspensionReason}</Text>
                    ) : null}
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: vendor.status === 'active' ? '#fee2e2' : '#d1fae5' },
                        ]}
                        onPress={() => handleStatusToggle(vendor)}
                        disabled={updating}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.actionBtnText,
                          { color: vendor.status === 'active' ? '#dc2626' : '#065f46' },
                        ]}>
                          {vendor.status === 'active' ? 'Suspend' : 'Unsuspend'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Suspend reason modal */}
      <Modal visible={suspendModal} transparent animationType="slide" onRequestClose={() => setSuspendModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Suspend Vendor</Text>
            <Text style={styles.modalSub}>
              Provide a reason for suspending {vendors.find(v => v.id === selected)?.businessName ?? 'this vendor'}:
            </Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={suspendReason}
              onChangeText={setSuspendReason}
              placeholder="Reason for suspension…"
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSuspendModal(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suspendBtn} onPress={handleSuspend} disabled={updating} activeOpacity={0.8}>
                {updating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.suspendText}>Suspend</Text>}
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  suspendedBadge: { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  suspendedText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filterTab: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#f3f4f6' },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardSelected: { borderColor: colors.primary },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.primary },
  vendorName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  vendorEmail: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  vendorPlan: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  statusWrap: { alignItems: 'center', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  detail: { marginTop: 12, borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 12 },
  suspendReason: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 10, fontStyle: 'italic' },
  detailActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 6 },
  modalSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  suspendBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#dc2626', alignItems: 'center' },
  suspendText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
