import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useSACustomPlans, useActivateSACustomPlan, useWithdrawSACustomPlan, flattenPages,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  active:    { bg: '#dcfce7', text: '#16a34a', label: 'Active' },
  withdrawn: { bg: '#fee2e2', text: '#dc2626', label: 'Withdrawn' },
  rejected:  { bg: '#f3f4f6', text: '#6b7280', label: 'Rejected' },
};

const STATUSES = ['', 'pending', 'active', 'withdrawn', 'rejected'];

const SACustomPlansScreen = ({ navigation }) => {
  const {
    data: planData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useSACustomPlans();
  const plans = flattenPages(planData);

  const { mutateAsync: activate, isPending: activating } = useActivateSACustomPlan();
  const { mutateAsync: withdraw, isPending: withdrawing } = useWithdrawSACustomPlan();

  const [statusFilter, setStatusFilter] = useState('');

  const filtered = statusFilter
    ? plans.filter(p => (p.status ?? '').toLowerCase() === statusFilter)
    : plans;

  const handleActivate = async plan => {
    try { await activate(plan.id); }
    catch { Alert.alert('Error', 'Failed to activate plan'); }
  };

  const handleWithdraw = async plan => {
    Alert.alert('Withdraw Plan', `Withdraw "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try { await withdraw(plan.id); }
          catch { Alert.alert('Error', 'Failed to withdraw plan'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
              {s ? (STATUS_STYLE[s]?.label ?? s) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom plans found.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName} numberOfLines={1}>{item.name ?? '—'}</Text>
                  {item.businessName && (
                    <Text style={styles.bizName} numberOfLines={1}>{item.businessName}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Price</Text>
                <Text style={styles.value}>${item.price ?? '—'} / {item.period ?? 'monthly'}</Text>
              </View>
              {item.maxBranches != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Branches</Text>
                  <Text style={styles.value}>{item.maxBranches}</Text>
                </View>
              )}
              {item.maxStaff != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Staff</Text>
                  <Text style={styles.value}>{item.maxStaff}</Text>
                </View>
              )}
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.submittedAt && (
                <Text style={styles.sub}>{new Date(item.submittedAt).toLocaleDateString()}</Text>
              )}

              {(item.status ?? '').toLowerCase() === 'pending' && (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.activateBtn}
                    onPress={() => handleActivate(item)}
                    disabled={activating}
                  >
                    <Text style={styles.activateBtnText}>Activate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.withdrawBtn}
                    onPress={() => handleWithdraw(item)}
                    disabled={withdrawing}
                  >
                    <Text style={styles.withdrawBtnText}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              )}
              {(item.status ?? '').toLowerCase() === 'active' && (
                <TouchableOpacity
                  style={[styles.withdrawBtn, { marginTop: 10 }]}
                  onPress={() => handleWithdraw(item)}
                  disabled={withdrawing}
                >
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  planName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  bizName: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  value: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a' },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 4 },
  sub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  activateBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  activateBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  withdrawBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  withdrawBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SACustomPlansScreen;
