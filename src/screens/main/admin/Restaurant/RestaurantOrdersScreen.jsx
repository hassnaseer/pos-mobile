import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Modal, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUSES = ['', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'];
const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  preparing: { bg: '#dbeafe', text: '#1d4ed8', label: 'Preparing' },
  ready:     { bg: '#dcfce7', text: '#16a34a', label: 'Ready' },
  delivered: { bg: '#f3f4f6', text: '#6b7280', label: 'Delivered' },
  cancelled: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
};

const useRestaurantOrders = (status = '') =>
  useQuery({
    queryKey: ['restaurant-orders', status],
    queryFn: async () => {
      const p = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await apiClient.get(`/admin/restaurant/orders${p}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useUpdateRestaurantOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/restaurant/orders/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }),
  });
};

const RestaurantOrdersScreen = () => {
  const { fmt } = useCurrency();
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: raw = [], isLoading, refetch } = useRestaurantOrders(statusFilter);
  const { mutateAsync: updateOrder, isPending: updating } = useUpdateRestaurantOrder();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleStatusChange = async (order, newStatus) => {
    try { await updateOrder({ id: order.id, status: newStatus }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed to update status'); }
  };

  const fmtDate = d => {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const NEXT_STATUS = {
    pending:   'preparing',
    preparing: 'ready',
    ready:     'delivered',
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterWrap}
        contentContainerStyle={styles.filterRow}
      >
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
        data={items}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No restaurant orders.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
          const nextStatus = NEXT_STATUS[(item.status ?? '').toLowerCase()];
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderNo}>Order #{item.orderNo ?? item.id}</Text>
                  {item.tableName && <Text style={styles.table}>Table: {item.tableName}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.date}>{fmtDate(item.createdAt)}</Text>
                <Text style={styles.amount}>{fmt(item.total ?? item.grandTotal ?? 0)}</Text>
              </View>
              {item.itemCount != null && (
                <Text style={styles.meta}>{item.itemCount} item{item.itemCount !== 1 ? 's' : ''}</Text>
              )}
              {nextStatus && (
                <TouchableOpacity
                  style={styles.advanceBtn}
                  onPress={() => handleStatusChange(item, nextStatus)}
                  disabled={updating}
                >
                  <Text style={styles.advanceBtnText}>
                    Mark as {STATUS_STYLE[nextStatus]?.label ?? nextStatus}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {selected && (() => {
              const st = STATUS_STYLE[(selected.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order #{selected.orderNo ?? selected.id}</Text>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {selected.tableName && <Text style={styles.modalMeta}>Table: {selected.tableName}</Text>}
                  <Text style={styles.modalMeta}>Date: {fmtDate(selected.createdAt)}</Text>
                  <Text style={styles.modalMeta}>Status: {st.label}</Text>
                  <Text style={styles.modalMeta}>Total: {fmt(selected.total ?? selected.grandTotal ?? 0)}</Text>

                  {Array.isArray(selected.items) && selected.items.length > 0 && (
                    <>
                      <Text style={styles.itemsHeading}>Items</Text>
                      {selected.items.map((it, i) => (
                        <View key={i} style={styles.orderItem}>
                          <Text style={styles.orderItemName} numberOfLines={1}>
                            {it.name ?? it.menuItem?.name ?? '—'} × {it.quantity ?? 1}
                          </Text>
                          <Text style={styles.orderItemPrice}>{fmt(it.price ?? 0)}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  <Text style={styles.changeStatusLabel}>Change Status</Text>
                  <View style={styles.statusActions}>
                    {Object.entries(STATUS_STYLE).map(([key, s]) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.statusBtn, { backgroundColor: s.bg }, selected.status === key && styles.statusBtnActive]}
                        onPress={() => { handleStatusChange(selected, key); setSelected(prev => prev ? { ...prev, status: key } : null); }}
                        disabled={updating}
                      >
                        <Text style={[styles.statusBtnText, { color: s.text }]}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  orderNo: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  table: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  date: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  meta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#aaa' },
  advanceBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  advanceBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1a1a1a' },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },
  modalMeta: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', marginBottom: 4 },
  itemsHeading: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', marginTop: 12, marginBottom: 6 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  orderItemName: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', flex: 1, marginRight: 8 },
  orderItemPrice: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a' },
  changeStatusLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 14, marginBottom: 8 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  statusBtnActive: { borderWidth: 2, borderColor: '#374151' },
  statusBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
});

export default RestaurantOrdersScreen;
