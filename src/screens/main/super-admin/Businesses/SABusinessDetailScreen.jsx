import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, FlatList,
} from 'react-native';
import {
  useSABusinessDetail, useSABusinessStats, useSABusinessStaff,
  useSABusinessSubscriptions, useExtendBusinessTrial,
  useBlockBusiness, useSAResetBusinessPassword,
} from '../../../../services/api/posApi';
import { useNavigation } from '@react-navigation/native';
import colors from '../../../../theme/colors';

const STATUS_COLORS = { Active: '#22c55e', Trial: '#f59e0b', Expired: '#ef4444', Blocked: '#6b7280' };
const TABS = ['Overview', 'Subscription', 'Staff', 'Branch Slots', 'Activity Log'];

function daysLeft(expiryDate) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

const InfoRow = ({ label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value ?? 'N/A'}</Text>
  </View>
);

const SABusinessDetailScreen = ({ route }) => {
  const { businessId } = route.params;
  const navigation = useNavigation();
  const { data: biz, isLoading } = useSABusinessDetail(businessId);
  const { data: stats } = useSABusinessStats(businessId);
  const { data: staffList = [] } = useSABusinessStaff(businessId);
  const { data: subsList = [] } = useSABusinessSubscriptions(businessId);

  const { mutate: extendTrial, isPending: extending } = useExtendBusinessTrial();
  const { mutate: blockBusiness, isPending: blocking } = useBlockBusiness();
  const { mutate: resetPassword, isPending: resetting } = useSAResetBusinessPassword();

  const [activeTab, setActiveTab] = useState('Overview');
  const [showExtend, setShowExtend] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!biz) {
    return <View style={styles.center}><Text style={styles.emptyText}>Business not found.</Text></View>;
  }

  const status = biz.status ?? 'Unknown';
  const statusColor = STATUS_COLORS[status] ?? '#aaa';
  const isBlocked = status === 'Blocked';
  const days = biz.expiryDate ? daysLeft(biz.expiryDate) : null;

  const statCards = [
    { label: 'Total Revenue',  value: biz.revenue ?? '$0.00',         color: '#22c55e', icon: '$' },
    { label: 'Total Orders',   value: String(stats?.ordersCount ?? 0), color: '#3b82f6', icon: '📦' },
    { label: 'Customers',      value: String(stats?.customersCount ?? 0), color: '#8b5cf6', icon: '👥' },
    { label: 'Staff Members',  value: String(stats?.staffCount ?? 0),  color: '#f59e0b', icon: '👤' },
  ];

  const handleExtend = () => {
    if (!expiryDate.trim()) { Alert.alert('Error', 'Enter a valid date (YYYY-MM-DD)'); return; }
    extendTrial({ id: businessId, expiryDate }, {
      onSuccess: () => { setShowExtend(false); setExpiryDate(''); },
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
          onError: () => Alert.alert('Error', 'Failed to send reset email'),
        }),
      },
    ]);
  };

  const renderOverview = () => (
    <>
      {/* Business Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business Information</Text>
        <InfoRow label="Business Name" value={biz.name} />
        <InfoRow label="Owner" value={biz.owner ?? biz.ownerName} />
        <InfoRow label="Email" value={biz.email} />
        <InfoRow label="Phone" value={biz.phone} />
        <InfoRow label="Country" value={biz.country} />
        {biz.address ? <InfoRow label="Address" value={biz.address} /> : null}
        {biz.parentName ? <InfoRow label="Parent Business" value={biz.parentName} /> : null}
      </View>

      {/* Account Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <InfoRow label="Business Type" value={biz.type ?? biz.businessType} />
        <InfoRow label="Plan"
          value={status === 'Trial'
            ? `Trial${days !== null ? ` · ${days > 0 ? `${days} days left` : 'Expired'}` : ''}`
            : (biz.plan ?? biz.packagePlanName)}
        />
        <InfoRow label="Signup Date" value={biz.signupDate ? new Date(biz.signupDate).toLocaleDateString() : (biz.createdAt ? new Date(biz.createdAt).toLocaleDateString() : null)} />
        <InfoRow label="Expiry Date" value={biz.expiryDate ? new Date(biz.expiryDate).toLocaleDateString() : null} />
        <InfoRow label="Last Login" value={biz.lastLogin ? new Date(biz.lastLogin).toLocaleDateString() : null} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
        {biz.storeId ? <InfoRow label="Store ID" value={biz.storeId} /> : null}
      </View>

      {/* Plan Limits */}
      {biz.planLimits && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Limits</Text>
          <View style={styles.limitsRow}>
            <View style={styles.limitBox}>
              <Text style={styles.limitVal}>{biz.planLimits.maxProducts > 0 ? biz.planLimits.maxProducts : '∞'}</Text>
              <Text style={styles.limitLabel}>Products</Text>
            </View>
            <View style={styles.limitBox}>
              <Text style={styles.limitVal}>{biz.planLimits.maxStaff > 0 ? biz.planLimits.maxStaff : '∞'}</Text>
              <Text style={styles.limitLabel}>Staff</Text>
            </View>
            <View style={styles.limitBox}>
              <Text style={styles.limitVal}>{biz.planLimits.maxBranches > 0 ? biz.planLimits.maxBranches : '∞'}</Text>
              <Text style={styles.limitLabel}>Branches</Text>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowExtend(true)} disabled={extending}>
          <Text style={styles.actionBtnText}>Extend Trial Date</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { marginTop: 8, backgroundColor: isBlocked ? '#22c55e' : '#ef4444' }]}
          onPress={handleToggleBlock}
          disabled={blocking}
        >
          {blocking ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.actionBtnText}>{isBlocked ? 'Unblock Business' : 'Block Business'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { marginTop: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary }]}
          onPress={handleResetPassword}
          disabled={resetting}
        >
          {resetting ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.actionBtnText, { color: colors.primary }]}>Reset Owner Password</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSubscription = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Subscription History</Text>
      {subsList.length === 0
        ? <Text style={styles.emptyText}>No subscription records.</Text>
        : subsList.map((s, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{s.planName ?? s.plan ?? 'Plan'}</Text>
            <Text style={styles.listItemSub}>{s.status} · {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'} → {s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</Text>
          </View>
        ))
      }
    </View>
  );

  const renderStaff = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Staff Members ({stats?.staffCount ?? staffList.length})</Text>
      {staffList.length === 0
        ? <Text style={styles.emptyText}>No staff members found.</Text>
        : staffList.map((s, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{s.name ?? s.fullName ?? '—'}</Text>
            <Text style={styles.listItemSub}>{s.role ?? ''}{s.email ? ` · ${s.email}` : ''}</Text>
          </View>
        ))
      }
    </View>
  );

  const renderBranchSlots = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Branch Slots</Text>
      <InfoRow label="Max Branches" value={biz.planLimits?.maxBranches > 0 ? String(biz.planLimits.maxBranches) : 'Unlimited'} />
      {biz.parentId
        ? <InfoRow label="This is a branch of" value={biz.parentName ?? biz.parentId} />
        : <Text style={styles.listItemSub}>This is a parent (root) business.</Text>
      }
    </View>
  );

  const renderActivityLog = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Activity Log</Text>
      <Text style={styles.emptyText}>Activity log is available on the web portal.</Text>
    </View>
  );

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.body}>
        {/* Business Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(biz.name ?? 'B')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bizName}>{biz.name}</Text>
              <Text style={styles.bizSub}>{biz.owner ?? biz.ownerName ?? ''}</Text>
              {biz.storeId ? <Text style={styles.storeId}>{biz.storeId}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          {/* Create Custom Plan button */}
          <TouchableOpacity
            style={styles.createPlanBtn}
            onPress={() => navigation.navigate('SACustomPlans')}
          >
            <Text style={styles.createPlanBtnText}>+ Create Custom Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Stat Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statCardsRow}>
          {statCards.map(s => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={[styles.statIcon]}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'Overview'      && renderOverview()}
          {activeTab === 'Subscription'  && renderSubscription()}
          {activeTab === 'Staff'         && renderStaff()}
          {activeTab === 'Branch Slots'  && renderBranchSlots()}
          {activeTab === 'Activity Log'  && renderActivityLog()}
        </View>
      </ScrollView>

      {/* Extend Trial Modal */}
      <Modal visible={showExtend} transparent animationType="slide" onRequestClose={() => setShowExtend(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Extend Trial</Text>
              <TouchableOpacity onPress={() => setShowExtend(false)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
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
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  body: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#9ca3af', fontFamily: 'Outfit-Regular', fontSize: 13, textAlign: 'center', marginTop: 8 },

  // Header
  headerCard: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold' },
  bizName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827' },
  bizSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  storeId: { fontSize: 11, fontFamily: 'Outfit-Medium', color: colors.primary, marginTop: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  createPlanBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  createPlanBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  // Stat cards
  statCardsRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderTopWidth: 3, width: 140, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2, textAlign: 'center' },

  // Tabs
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', height: 46 },
  tabBarContent: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 14, height: 46, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent', marginRight: 4 },
  tabActive: { borderColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  tabTextActive: { color: colors.primary, fontFamily: 'Outfit-SemiBold' },

  tabContent: { padding: 12 },

  // Cards
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f4f6f9' },
  infoLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', flex: 1 },
  infoValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', flex: 2, textAlign: 'right' },

  // Limits
  limitsRow: { flexDirection: 'row', gap: 8 },
  limitBox: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 10, padding: 12, alignItems: 'center' },
  limitVal: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.primary },
  limitLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },

  // Actions
  actionBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  // List items (for staff / subs)
  listItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f4f6f9' },
  listItemTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  listItemSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  // Extend Trial Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  modalNote: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 14 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6b7280' },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SABusinessDetailScreen;
