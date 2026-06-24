import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useOrdersInfinite, flattenPages } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  paid:       { bg: '#dcfce7', text: '#16a34a', label: 'Paid' },
  pending:    { bg: '#fef9c3', text: '#b45309', label: 'Pending' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
  refunded:   { bg: '#ede9fe', text: '#7c3aed', label: 'Refunded' },
};

const STATUSES = ['', 'paid', 'pending', 'cancelled', 'refunded'];

const OrdersScreen = ({ navigation }) => {
  const { fmt } = useCurrency();
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: orderData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useOrdersInfinite({ status: statusFilter });

  const orders = flattenPages(orderData);

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
        data={orders}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No orders found.</Text>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[(item.status ?? '').toLowerCase()] ?? STATUS_STYLE.pending;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <Text style={styles.invoiceNo}>#{item.invoiceNo ?? item.id}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              {item.customerName && (
                <Text style={styles.customer} numberOfLines={1}>{item.customerName}</Text>
              )}
              <View style={styles.cardRow}>
                <Text style={styles.date}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </Text>
                <Text style={styles.amount}>{fmt(item.total ?? item.grandTotal ?? 0)}</Text>
              </View>
              {item.paymentMethod && (
                <Text style={styles.meta}>{item.paymentMethod}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invoiceNo: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  customer: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#555', marginBottom: 4 },
  date: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  amount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  meta: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default OrdersScreen;
