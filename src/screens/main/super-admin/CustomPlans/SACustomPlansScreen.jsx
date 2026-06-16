import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useSACustomPlans, useActivateSACustomPlan, useWithdrawSACustomPlan } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  active:    { bg: '#dcfce7', text: '#16a34a' },
  pending:   { bg: '#fef9c3', text: '#b45309' },
  expired:   { bg: '#f3f4f6', text: '#6b7280' },
  declined:  { bg: '#fee2e2', text: '#dc2626' },
  withdrawn: { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUSES = ['all', 'pending', 'active', 'expired', 'declined', 'withdrawn'];

const cycleLabel = c => ({ monthly: 'mo', quarterly: 'qtr', yearly: 'yr', custom: 'custom' }[c] ?? c ?? 'mo');

const SACustomPlansScreen = ({ navigation }) => {
  const { data: raw = [], isLoading, refetch } = useSACustomPlans();
  const allPlans = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: activate } = useActivateSACustomPlan();
  const { mutateAsync: withdraw } = useWithdrawSACustomPlan();

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const plans = useMemo(() => allPlans.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.businessName ?? p.business?.name ?? '').toLowerCase().includes(q);
    }
    return true;
  }), [allPlans, search, statusFilter]);

  const handleActivate = plan =>
    Alert.alert('Activate Plan', `Activate plan for "${plan.businessName ?? plan.business?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => { try { await activate(plan.id); } catch { Alert.alert('Error', 'Action failed'); } } },
    ]);

  const handleWithdraw = plan =>
    Alert.alert('Withdraw Plan', 'Withdraw this custom plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: async () => { try { await withdraw(plan.id); } catch { Alert.alert('Error', 'Action failed'); } } },
    ]);

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by business name…"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SACustomPlanForm')}>
        <Text style={styles.fabText}>+ Create Plan</Text>
      </TouchableOpacity>

      <FlatList
        data={plans}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom plans.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.bizName} numberOfLines={1}>{item.businessName ?? item.business?.name ?? '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>
                    {(item.status ?? 'pending').charAt(0).toUpperCase() + (item.status ?? 'pending').slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>PKR {item.price ?? '—'} / {cycleLabel(item.billingCycle)}</Text>
                </View>
                {item.maxBranches != null && (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Branches</Text>
                    <Text style={styles.detailValue}>{item.maxBranches > 0 ? item.maxBranches : '∞'}</Text>
                  </View>
                )}
                {item.maxStaff != null && (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Staff</Text>
                    <Text style={styles.detailValue}>{item.maxStaff > 0 ? item.maxStaff : '∞'}</Text>
                  </View>
                )}
                {item.maxProducts != null && (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Products</Text>
                    <Text style={styles.detailValue}>{item.maxProducts > 0 ? item.maxProducts : '∞'}</Text>
                  </View>
                )}
              </View>

              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}

              {(item.permissions ?? item.features ?? []).length > 0 && (
                <View style={styles.permWrap}>
                  {(item.permissions ?? item.features ?? []).slice(0, 4).map((p, i) => (
                    <View key={i} style={styles.permTag}>
                      <Text style={styles.permTagText}>{typeof p === 'string' ? p : (p.name ?? p.code ?? '')}</Text>
                    </View>
                  ))}
                  {(item.permissions ?? item.features ?? []).length > 4 && (
                    <Text style={styles.permMore}>+{(item.permissions ?? item.features).length - 4} more</Text>
                  )}
                </View>
              )}

              <View style={styles.actions}>
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
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  searchWrap: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#f9fafb' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bizName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
  detail: { minWidth: 70 },
  detailLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#999' },
  detailValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', marginTop: 1 },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginBottom: 8, fontStyle: 'italic' },
  permWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  permTag: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  permTagText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#1e40af', textTransform: 'capitalize' },
  permMore: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', alignSelf: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  activateBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  activateBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  withdrawBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  withdrawBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  fab: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  fabText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
});

export default SACustomPlansScreen;
