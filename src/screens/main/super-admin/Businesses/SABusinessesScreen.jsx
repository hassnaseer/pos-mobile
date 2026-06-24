import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image, ScrollView, Modal, Alert,
} from 'react-native';
import ConfirmModal from '../../../../components/Modal/ConfirmModal';
import { useNavigation } from '@react-navigation/native';
import {
  useSABusinessesInfinite, useSABusinessTypes, useDeleteSABusiness, flattenPages,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  Active:   { bg: '#dcfce7', text: '#16a34a' },
  Trial:    { bg: '#fef3c7', text: '#d97706' },
  Expired:  { bg: '#fee2e2', text: '#dc2626' },
  Blocked:  { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUSES = ['', 'Active', 'Trial', 'Expired', 'Blocked'];

function daysLeft(expiryDate) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

const PlanCell = ({ item }) => {
  if (item.status === 'Trial') {
    const days = item.expiryDate ? daysLeft(item.expiryDate) : null;
    return (
      <View>
        <Text style={styles.planTrial}>Trial</Text>
        {days !== null && (
          <Text style={[styles.planSub, { color: days > 0 ? '#d97706' : '#dc2626' }]}>
            {days > 0 ? `${days} days left` : 'Expired'}
          </Text>
        )}
      </View>
    );
  }
  return (
    <View>
      {(item.plan || item.packagePlanName) && (
        <Text style={styles.planName}>{item.plan}</Text>
      )}
      {item.packagePlanName && <Text style={styles.planSub}>{item.packagePlanName}</Text>}
      {item.planLimits && (
        <Text style={styles.planLimits}>
          {item.planLimits.maxProducts > 0 ? `${item.planLimits.maxProducts}P` : '∞P'} · {item.planLimits.maxStaff > 0 ? `${item.planLimits.maxStaff}S` : '∞S'}
        </Text>
      )}
    </View>
  );
};

const SABusinessesScreen = () => {
  const navigation = useNavigation();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bizTypeFilter, setBizTypeFilter] = useState('');
  const [menuItem, setMenuItem]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const {
    data: bizData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useSABusinessesInfinite({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: rawTypes = [] } = useSABusinessTypes();
  const { mutateAsync: deleteBiz } = useDeleteSABusiness();

  const businesses = flattenPages(bizData);
  const types = Array.isArray(rawTypes) ? rawTypes : (rawTypes?.data ?? []);

  const filtered = useMemo(() => {
    if (!bizTypeFilter) return businesses;
    return businesses.filter(b =>
      String(b.businessTypeId ?? b.businessType?.id ?? '') === String(bizTypeFilter)
    );
  }, [businesses, bizTypeFilter]);

  const handleDelete = item => {
    setMenuItem(null);
    setConfirmDelete(item);
  };

  const doDelete = async () => {
    try { await deleteBiz(confirmDelete.id); }
    catch { Alert.alert('Error', 'Failed to delete business'); }
    finally { setConfirmDelete(null); }
  };

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search businesses…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Business type filter chips */}
      {types.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { borderTopWidth: 0 }]} contentContainerStyle={styles.filterRow}>
          {[{ id: '', name: 'All Types' }, ...types].map(t => {
            const isActive = bizTypeFilter === String(t.id);
            return (
              <TouchableOpacity
                key={t.id || 'all'}
                style={[styles.chip, { borderColor: '#8b5cf6' }, isActive && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                onPress={() => setBizTypeFilter(String(t.id))}
              >
                <Text style={[styles.chipText, { color: '#8b5cf6' }, isActive && { color: '#fff' }]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
        keyExtractor={b => String(b.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SABusinessDetail', { businessId: item.id })}
            >
              <View style={styles.bizAvatar}>
                {item.logoUrl
                  ? <Image source={{ uri: item.logoUrl }} style={styles.bizAvatarImg} resizeMode="contain" />
                  : <Text style={styles.bizAvatarText}>{(item.name ?? 'B')[0].toUpperCase()}</Text>}
              </View>

              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.storeId ? <Text style={styles.storeId}>{item.storeId}</Text> : null}
                {item.parentName && <Text style={styles.branch}>↳ {item.parentName}</Text>}
                <Text style={styles.rowSub}>{item.owner ?? ''}{item.email ? ` · ${item.email}` : ''}</Text>
                {item.type ? <Text style={styles.bizTypeTag}>{item.type}</Text> : null}
                <PlanCell item={item} />
              </View>

              <View style={styles.rowRight}>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.text }]}>{item.status}</Text>
                </View>
                {item.revenue != null && (
                  <Text style={styles.revenue}>{item.revenue}</Text>
                )}
                <TouchableOpacity
                  style={styles.menuBtn}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  onPress={() => setMenuItem(item)}
                >
                  <Text style={styles.menuDots}>⋮</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No businesses found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <ConfirmModal
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Delete Business"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* 3-dot action menu */}
      {menuItem && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setMenuItem(null)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuItem(null)}>
            <View style={styles.menuBox}>
              <Text style={styles.menuBizName} numberOfLines={1}>{menuItem.name}</Text>
              <TouchableOpacity style={styles.menuOpt} onPress={() => { setMenuItem(null); navigation.navigate('SABusinessDetail', { businessId: menuItem.id }); }}>
                <Text style={styles.menuOptIcon}>👁</Text>
                <Text style={styles.menuOptText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOpt} onPress={() => { setMenuItem(null); navigation.navigate('SABusinessForm', { business: menuItem }); }}>
                <Text style={styles.menuOptIcon}>✏️</Text>
                <Text style={styles.menuOptText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuOpt, styles.menuOptDanger]} onPress={() => handleDelete(menuItem)}>
                <Text style={styles.menuOptIcon}>🗑</Text>
                <Text style={[styles.menuOptText, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },

  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },

  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bizAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 2 },
  bizAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  bizAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 1 },
  storeId: { fontSize: 10, fontFamily: 'Outfit-Medium', color: colors.primary, marginBottom: 2 },
  branch: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#7c3aed', marginBottom: 2 },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 3 },
  bizTypeTag: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#2563eb', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 3 },
  planName: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  planTrial: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#d97706' },
  planSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  planLimits: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },

  rowRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  revenue: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#22c55e' },
  menuBtn: { padding: 4 },
  menuDots: { fontSize: 18, color: '#9ca3af', fontFamily: 'Outfit-Bold', lineHeight: 20 },

  empty: { textAlign: 'center', color: '#6b7280', fontFamily: 'Outfit-Regular', marginTop: 40 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, width: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, elevation: 8 },
  menuBizName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuOpt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  menuOptDanger: { borderTopWidth: 1, borderColor: '#fef2f2' },
  menuOptIcon: { fontSize: 16 },
  menuOptText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151' },
});

export default SABusinessesScreen;
