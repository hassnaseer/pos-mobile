import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useVendorOrders, useUpdateIncomingOrder } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', confirmed: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444' };

const VendorOrdersScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.can(PERMISSIONS.ACCESS_VENDOR);

  const { data: raw = [], isLoading, refetch } = useVendorOrders();
  const { mutateAsync: updateOrder } = useUpdateIncomingOrder();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  if (!canAccess) {
    return <View style={styles.centered}><Text style={styles.noAccess}>No access to vendor orders.</Text></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>My Orders</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>Order #{item.orderNumber ?? item.id}</Text>
              <Text style={styles.rowSub}>{item.vendorName ?? item.vendor?.name ?? '—'}</Text>
              {item.totalAmount != null && <Text style={styles.rowSub}>Rs {Number(item.totalAmount).toFixed(2)}</Text>}
              {item.createdAt && <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
            </View>
            <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'pending'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No wholesale orders yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f4f6f9' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:   { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:     { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:    { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  row:        { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:  { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty:      { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default VendorOrdersScreen;
