import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useSAPackagePlans, useDeleteSAPackagePlan, useSABusinessTypes } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SAPackagePlansScreen = ({ navigation }) => {
  const { data: plans = [], isLoading, refetch } = useSAPackagePlans();
  const { data: bizTypes = [] } = useSABusinessTypes();
  const { mutate: remove } = useDeleteSAPackagePlan();

  const [selectedBizType, setSelectedBizType] = useState('all');

  const allPlans = Array.isArray(plans) ? plans : (plans?.data ?? []);
  const types = Array.isArray(bizTypes) ? bizTypes : (bizTypes?.data ?? []);
  const planList = selectedBizType === 'all'
    ? allPlans
    : allPlans.filter(p => String(p.businessTypeId ?? p.businessType?.id) === String(selectedBizType));

  const handleDelete = plan => Alert.alert('Delete Plan', `Delete "${plan.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(plan.id) },
  ]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.planName}>{item.name}</Text>
          <Text style={styles.planPrice}>${item.price ?? 0} / {item.period ?? 'monthly'}</Text>
        </View>
        <View style={styles.cardBadges}>
          {item.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
          <View style={[styles.activeBadge, { backgroundColor: item.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
            <Text style={[styles.activeText, { color: item.isActive ? '#065F46' : '#6B7280' }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      {item.description ? <Text style={styles.planDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.limits}>
        {[
          ['Branches', item.maxBranches],
          ['Staff', item.maxStaff],
          ['Products', item.maxProducts],
          ['Customers', item.maxCustomers],
        ].map(([label, val]) => (
          <View key={label} style={styles.limitItem}>
            <Text style={styles.limitVal}>{val ?? 0}</Text>
            <Text style={styles.limitLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('SAPackagePlanForm', { plan: item })}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.delBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Package Plans</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('SAPackagePlanForm')}>
          <Text style={styles.addBtnText}>+ Add Plan</Text>
        </TouchableOpacity>
      </View>

      {types.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedBizType === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedBizType('all')}
          >
            <Text style={[styles.filterChipText, selectedBizType === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {types.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.filterChip, selectedBizType === String(t.id) && styles.filterChipActive]}
              onPress={() => setSelectedBizType(String(t.id))}
            >
              <Text style={[styles.filterChipText, selectedBizType === String(t.id) && styles.filterChipTextActive]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={planList}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No package plans yet.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  filterChipTextActive: { color: '#fff' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  planName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  planPrice: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 2 },
  cardBadges: { gap: 4, alignItems: 'flex-end' },
  popularBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  popularText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#92400E' },
  activeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  activeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  planDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 10 },
  limits: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  limitItem: { alignItems: 'center' },
  limitVal: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  limitLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: colors.secondary },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  delBtn: { flex: 1, borderWidth: 1, borderColor: '#F87171', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  delBtnText: { color: '#EF4444', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SAPackagePlansScreen;
