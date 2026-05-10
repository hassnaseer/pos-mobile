import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
const STATUS_COLORS = {
  pending:   { bg: '#fef9c3', text: '#b45309' },
  preparing: { bg: '#dbeafe', text: '#1d4ed8' },
  ready:     { bg: '#d1fae5', text: '#065f46' },
  served:    { bg: '#dcfce7', text: '#16a34a' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

const useRestaurantOrders = status =>
  useQuery({
    queryKey: ['restaurant-orders', status],
    queryFn: async () => {
      const qs = status ? `?status=${status}` : '';
      const res = await apiClient.get(`/admin/restaurant/orders${qs}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/admin/restaurant/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }),
  });
};

const RestaurantOrdersScreen = () => {
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { fmt } = useCurrency();

  const { data: raw = [], isLoading, refetch } = useRestaurantOrders(filterStatus);
  const orders = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus();

  const handleStatusUpdate = (order, newStatus) => {
    updateStatus({ id: order.id, status: newStatus }, {
      onSuccess: () => setSelectedOrder(null),
      onError: () => Alert.alert('Error', 'Failed to update status'),
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...ORDER_STATUSES].map(s => (
          <TouchableOpacity key={s || 'all'} style={[styles.chip, filterStatus === s && styles.chipActive]} onPress={() => setFilterStatus(s)}>
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={orders}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No orders found.</Text>}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
          return (
            <TouchableOpacity style={styles.row} onPress={() => setSelectedOrder(item)}>
              <View style={styles.rowLeft}>
                <Text style={styles.tableLabel}>Table</Text>
                <Text style={styles.tableNum}>#{item.table?.tableNumber ?? item.tableNumber ?? '—'}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowItems} numberOfLines={2}>
                  {Array.isArray(item.items) ? item.items.map(i => `${i.name} ×${i.quantity ?? 1}`).join(', ') : 'Items'}
                </Text>
                {item.total != null && (
                  <Text style={styles.rowTotal}>{fmt(item.total)}</Text>
                )}
                <Text style={styles.rowTime}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Status update modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            {selectedOrder && (
              <>
                <Text style={styles.modalSub}>
                  Table #{selectedOrder.table?.tableNumber ?? selectedOrder.tableNumber ?? '—'} · Current: {selectedOrder.status}
                </Text>
                <View style={styles.statusGrid}>
                  {ORDER_STATUSES.map(s => {
                    const sc = STATUS_COLORS[s] ?? {};
                    const isCurrent = selectedOrder.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, { backgroundColor: sc.bg }, isCurrent && styles.statusBtnCurrent]}
                        onPress={() => !isCurrent && handleStatusUpdate(selectedOrder, s)}
                        disabled={isCurrent || updating}
                      >
                        {updating ? <ActivityIndicator size="small" color={sc.text} /> : (
                          <Text style={[styles.statusBtnText, { color: sc.text }]}>{s}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 54 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10 },
  rowLeft: { alignItems: 'center', minWidth: 46 },
  tableLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tableNum: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  rowInfo: { flex: 1 },
  rowItems: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  rowTotal: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 2 },
  rowTime: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 6 },
  modalSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minWidth: '45%', alignItems: 'center' },
  statusBtnCurrent: { opacity: 0.5 },
  statusBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  closeBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
});

export default RestaurantOrdersScreen;
