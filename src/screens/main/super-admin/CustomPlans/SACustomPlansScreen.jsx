import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useSACustomPlans, useActivateSACustomPlan, useWithdrawSACustomPlan } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  active:    { bg: '#dcfce7', text: '#16a34a' },
  pending:   { bg: '#fef9c3', text: '#b45309' },
  withdrawn: { bg: '#f3f4f6', text: '#6b7280' },
};

const SACustomPlansScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSACustomPlans();
  const plans = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: activate } = useActivateSACustomPlan();
  const { mutateAsync: withdraw } = useWithdrawSACustomPlan();

  const handleActivate = plan =>
    Alert.alert('Activate Plan', `Activate plan for "${plan.businessName ?? plan.business?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => { try { await activate(plan.id); } catch { Alert.alert('Error', 'Action failed'); } } },
    ]);

  const handleWithdraw = plan =>
    Alert.alert('Withdraw Plan', `Withdraw this custom plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: async () => { try { await withdraw(plan.id); } catch { Alert.alert('Error', 'Action failed'); } } },
    ]);

  return (
    <View style={styles.root}>
      <FlatList
        data={plans}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom plans.</Text>}
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
                <Text style={styles.label}>Price</Text>
                <Text style={styles.value}>PKR {item.price ?? '—'} / {item.billingCycle ?? 'month'}</Text>
              </View>
              {item.maxProducts != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Limits</Text>
                  <Text style={styles.value}>
                    {item.maxProducts > 0 ? `${item.maxProducts}P` : '∞P'} · {item.maxStaff > 0 ? `${item.maxStaff}S` : '∞S'}
                  </Text>
                </View>
              )}
              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
              {item.status !== 'active' && (
                <TouchableOpacity style={styles.activateBtn} onPress={() => handleActivate(item)}>
                  <Text style={styles.activateBtnText}>Activate</Text>
                </TouchableOpacity>
              )}
              {item.status === 'active' && (
                <TouchableOpacity style={styles.withdrawBtn} onPress={() => handleWithdraw(item)}>
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
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bizName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  value: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 6, fontStyle: 'italic' },
  activateBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  activateBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  withdrawBtn: { marginTop: 10, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  withdrawBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SACustomPlansScreen;
