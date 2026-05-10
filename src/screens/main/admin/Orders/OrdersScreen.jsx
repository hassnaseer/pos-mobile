import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useOrders } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_COLORS = { Completed: '#22c55e', Pending: '#f59e0b', Cancelled: '#ef4444' };

const OrdersScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const { fmt } = useCurrency();
  const { data: raw = [], isLoading, refetch } = useOrders();
  const orders = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const filtered = orders.filter(o => o.orderNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search orders…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={o => String(o.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('OrderDetail', { order: item })} activeOpacity={0.8}>
            <View style={styles.rowTop}>
              <Text style={styles.orderNum}>{item.orderNumber}</Text>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#aaa') + '22' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] ?? '#aaa' }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.meta}>{item.paymentMethod} · {item.itemCount ?? '—'} items</Text>
              <Text style={styles.total}>{fmt(item.totalAmount)}</Text>
            </View>
            <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No orders found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNum: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  total: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  date: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 6 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default OrdersScreen;
