import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Image,
} from 'react-native';
import {
  useSABusinessDetail, useExtendBusinessTrial,
  useBlockBusiness, useSAResetBusinessPassword,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_COLORS = { Active: '#22c55e', Trial: '#f59e0b', Expired: '#ef4444', Blocked: '#6b7280' };

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value ?? '—'}</Text>
  </View>
);

const StatCard = ({ label, value, limit }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value ?? 0}{limit ? ` / ${limit}` : ''}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SABusinessDetailScreen = ({ route }) => {
  const { businessId } = route.params;
  const { data: biz, isLoading } = useSABusinessDetail(businessId);
  const { mutate: extendTrial, isPending: extending } = useExtendBusinessTrial();
  const { mutate: blockBusiness, isPending: blocking } = useBlockBusiness();
  const { mutate: resetPassword, isPending: resetting } = useSAResetBusinessPassword();

  const [showExtend, setShowExtend] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!biz) {
    return <View style={styles.center}><Text style={styles.errorText}>Business not found.</Text></View>;
  }

  const isBlocked = biz.status === 'Blocked';
  const status = biz.status ?? 'Unknown';
  const statusColor = STATUS_COLORS[status] ?? '#aaa';

  const handleExtend = () => {
    if (!expiryDate.trim()) { Alert.alert('Error', 'Enter a valid date (YYYY-MM-DD)'); return; }
    extendTrial({ id: businessId, expiryDate }, {
      onSuccess: () => { setShowExtend(false); setExpiryDate(''); Alert.alert('Success', 'Trial extended'); },
      onError: () => Alert.alert('Error', 'Failed to extend trial'),
    });
  };

  const handleToggleBlock = () => {
    const action = isBlocked ? 'Unblock' : 'Block';
    Alert.alert(`${action} Business`, `Are you sure you want to ${action.toLowerCase()} "${biz.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action, style: isBlocked ? 'default' : 'destructive',
        onPress: () => blockBusiness({ id: businessId, blocked: !isBlocked }, {
          onSuccess: () => Alert.alert('Success', `Business ${action.toLowerCase()}ed`),
          onError: () => Alert.alert('Error', `Failed to ${action.toLowerCase()} business`),
        }),
      },
    ]);
  };

  const handleResetPassword = () => {
    Alert.alert('Reset Password', `Send a password reset to the owner of "${biz.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', onPress: () => resetPassword(businessId, {
          onSuccess: () => Alert.alert('Success', 'Password reset email sent'),
          onError: () => Alert.alert('Error', 'Failed to send reset email'),
        }),
      },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.bizInitial}>
            {biz.logoUrl
              ? <Image source={{ uri: biz.logoUrl }} style={styles.bizLogoImg} resizeMode="contain" />
              : <Text style={styles.bizInitialText}>{(biz.name ?? 'B')[0].toUpperCase()}</Text>}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.bizName}>{biz.name}</Text>
            <Text style={styles.bizOwner}>{biz.owner}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
      </View>

      {/* Usage stats */}
      <Text style={styles.sectionTitle}>Usage</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Products" value={biz.productsCount} limit={biz.maxProducts} />
        <StatCard label="Staff" value={biz.staffCount} limit={biz.maxStaff} />
        <StatCard label="Customers" value={biz.customersCount} limit={biz.maxCustomers} />
        <StatCard label="Orders" value={biz.ordersCount} />
      </View>

      {/* Business info */}
      <Text style={styles.sectionTitle}>Business Details</Text>
      <View style={styles.infoCard}>
        <InfoRow label="Email" value={biz.email} />
        <InfoRow label="Phone" value={biz.phone} />
        <InfoRow label="Type" value={biz.businessType} />
        <InfoRow label="Plan" value={biz.packagePlanName} />
        <InfoRow label="Country" value={biz.country} />
        <InfoRow label="Address" value={biz.address} />
        <InfoRow label="Registered" value={biz.createdAt ? new Date(biz.createdAt).toLocaleDateString() : undefined} />
        <InfoRow label="Expiry" value={biz.expiryDate ? new Date(biz.expiryDate).toLocaleDateString() : undefined} />
        {biz.parentName && <InfoRow label="Parent" value={biz.parentName} />}
      </View>

      {/* Actions */}
      <Text style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowExtend(true)} disabled={extending}>
          <Text style={styles.actionBtnText}>Extend Trial</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, isBlocked ? styles.actionBtnSuccess : styles.actionBtnWarning]}
          onPress={handleToggleBlock}
          disabled={blocking}
        >
          {blocking ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={styles.actionBtnText}>{isBlocked ? 'Unblock Business' : 'Block Business'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleResetPassword} disabled={resetting}>
          {resetting ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Reset Owner Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Extend Trial Modal */}
      <Modal visible={showExtend} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Extend Trial</Text>
            <Text style={styles.modalNote}>Enter new expiry date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="2025-12-31"
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowExtend(false); setExpiryDate(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleExtend} disabled={extending}>
                {extending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmText}>Extend</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  body: { padding: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.secondary, fontFamily: 'Outfit-Regular', fontSize: 15 },
  headerCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bizInitial: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bizLogoImg: { width: 48, height: 48, borderRadius: 24 },
  bizInitialText: { color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold' },
  headerInfo: { flex: 1 },
  bizName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  bizOwner: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 10, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.primary },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 4 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, flex: 1 },
  infoValue: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, flex: 2, textAlign: 'right' },
  actionsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10, marginBottom: 16 },
  actionBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  actionBtnSuccess: { backgroundColor: '#22c55e' },
  actionBtnWarning: { backgroundColor: '#ef4444' },
  actionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary },
  actionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 6 },
  modalNote: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 14 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SABusinessDetailScreen;
