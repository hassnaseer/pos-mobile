import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const ORDER_STATUS_COLOR = {
  Pending: '#b45309', Preparing: '#b45309', Ready: '#1d4ed8', Served: '#16a34a', Cancelled: '#dc2626',
};

const useRestaurantDashboard = () =>
  useQuery({
    queryKey: ['restaurant-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/restaurant/dashboard');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

const StatCard = ({ label, value, color = colors.primary, sub }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub != null && <Text style={styles.statSub}>{sub}</Text>}
  </View>
);

const QuickLink = ({ label, route }) => {
  const nav = useNavigation();
  return (
    <TouchableOpacity style={styles.quickLink} onPress={() => nav.navigate(route)}>
      <Text style={styles.quickLinkText}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
};

const RestaurantDashboardScreen = () => {
  const { data = {}, isLoading, refetch } = useRestaurantDashboard();
  const availableTables = Math.max(0, (data.tables ?? 0) - (data.occupiedTables ?? 0));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.sectionTitle}>Overview</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Total Tables" value={data.tables} />
          <StatCard label="Available Tables" value={`${availableTables}/${data.tables ?? 0}`} color="#16a34a" />
          <StatCard label="Occupied" value={data.occupiedTables} color="#dc2626" />
          <StatCard label="Pending Orders" value={data.pendingOrders} color="#b45309" />
          <StatCard label="Menu Items" value={data.menuItems} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Active Orders</Text>
      {!isLoading && (
        <View style={styles.ordersCard}>
          {(data.recentOrders ?? []).length === 0 ? (
            <Text style={styles.emptyOrders}>No recent orders</Text>
          ) : data.recentOrders.map(order => {
            const itemsLabel = Array.isArray(order.items) ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : '';
            return (
              <View key={order.id} style={styles.orderRow}>
                <View style={styles.orderRowTop}>
                  <Text style={styles.orderRowTitle}>{order.orderNumber} · Table {order.table?.tableNumber ?? '—'}</Text>
                  <Text style={[styles.orderRowStatus, { color: ORDER_STATUS_COLOR[order.status] ?? '#6b7280' }]}>{order.status}</Text>
                </View>
                {itemsLabel ? <Text style={styles.orderRowItems} numberOfLines={1}>{itemsLabel}</Text> : null}
                <Text style={styles.orderRowTotal}>${order.total}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickLinks}>
        <QuickLink label="Orders" route="RestaurantOrders" />
        <QuickLink label="Tables" route="RestaurantTables" />
        <QuickLink label="Menu" route="RestaurantMenu" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.secondary, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flex: 1, minWidth: '45%', alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.primary },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 4, textAlign: 'center' },
  statSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  quickLinks: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  quickLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  quickLinkText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack },
  arrow: { fontSize: 20, color: colors.secondary },
  ordersCard: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  emptyOrders: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', padding: 20 },
  orderRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  orderRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRowTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, flex: 1, marginRight: 8 },
  orderRowStatus: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  orderRowItems: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  orderRowTotal: { fontSize: 13, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginTop: 4 },
});

export default RestaurantDashboardScreen;
