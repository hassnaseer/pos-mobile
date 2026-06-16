import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ScrollView } from 'react-native';
import { useOrders } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  Completed: { bg: '#dcfce7', text: '#16a34a' },
  Pending:   { bg: '#fef3c7', text: '#d97706' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

const STATUSES = ['', 'Completed', 'Pending', 'Cancelled'];

const fmtDate = d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const OrdersScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { fmt } = useCurrency();
  const { data: raw = [], isLoading, refetch } = useOrders({ limit: 200 });
  const orders = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (o.orderNumber ?? '').toLowerCase().includes(q) ||
          (o.customer?.name ?? '').toLowerCase().includes(q) ||
          (o.customerName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search by order# or customer…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
        {STATUSES.map(s => {
          const isActive = statusFilter === s;
          return (
            <TouchableOpacity
              key={s || 'all'}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{s || 'All'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
          const customerName = item.customer?.name ?? item.customerName ?? null;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('OrderDetail', { order: item })}
              activeOpacity={0.8}
            >
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.orderNum}>{item.orderNumber ?? `#${item.id}`}</Text>
                  {customerName ? <Text style={styles.customerName}>{customerName}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.meta}>
                  {item.paymentMethod ?? '—'} · {item.itemCount ?? '—'} items
                </Text>
                <Text style={styles.total}>{fmt(item.totalAmount ?? 0)}</Text>
              </View>
              {item.createdAt ? <Text style={styles.date}>{fmtDate(item.createdAt)}</Text> : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No orders found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 52 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderNum: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  customerName: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  total: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  date: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#6b7280', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default OrdersScreen;
