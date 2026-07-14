import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useVendorDashboard } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  pending:          { bg: '#fef9c3', text: '#a16207' },
  confirmed:        { bg: '#e0e7ff', text: '#4338ca' },
  shipped:          { bg: '#dbeafe', text: '#1e40af' },
  out_for_delivery: { bg: '#f3e8ff', text: '#7e22ce' },
  delivered:        { bg: '#d1fae5', text: '#065f46' },
  cancelled:        { bg: '#fee2e2', text: '#b91c1c' },
};
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};

const SELLER_STATS = [
  { key: 'total', label: 'Total Orders', color: '#3B82F6' },
  { key: 'pending', label: 'Pending', color: '#EAB308' },
  { key: 'confirmed', label: 'Confirmed', color: '#6366F1' },
  { key: 'outForDelivery', label: 'Out for Delivery', color: '#A855F7' },
  { key: 'delivered', label: 'Delivered', color: '#22C55E' },
  { key: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]} />
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function VendorDashboardScreen() {
  const { fmt } = useCurrency();
  const { data: stats, isLoading, isFetching, refetch } = useVendorDashboard();

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!stats) return null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View>
        <Text style={styles.heading}>Vendor Dashboard</Text>
        <Text style={styles.subHeading}>Overview of your vendor activity</Text>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Sales (As Vendor)</Text>
        <View style={styles.statsGrid}>
          {SELLER_STATS.map(s => (
            <StatCard key={s.key} label={s.label} value={stats[s.key] ?? 0} color={s.color} />
          ))}
        </View>
        <View style={styles.revenueCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10B981', width: 44, height: 44, borderRadius: 12 }]} />
          <View>
            <Text style={styles.statLabel}>Total Revenue (Delivered Orders)</Text>
            <Text style={styles.revenueValue}>{fmt(stats.revenue)}</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>Purchases (As Buyer)</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total Purchases" value={stats.buyerStats?.total ?? 0} color="#14B8A6" />
          <StatCard label="Pending Orders" value={stats.buyerStats?.pending ?? 0} color="#F97316" />
          <StatCard label="Received" value={stats.buyerStats?.delivered ?? 0} color="#22C55E" />
        </View>
        <View style={styles.revenueCard}>
          <View style={[styles.statIcon, { backgroundColor: '#14B8A6', width: 44, height: 44, borderRadius: 12 }]} />
          <View>
            <Text style={styles.statLabel}>Total Spent (Received Orders)</Text>
            <Text style={styles.revenueValue}>{fmt(stats.buyerStats?.totalSpent ?? 0)}</Text>
          </View>
        </View>

        {(stats.buyerStats?.recentOrders?.length ?? 0) > 0 ? (
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>Recent Purchase Orders</Text>
            {stats.buyerStats.recentOrders.map(order => {
              const badge = STATUS_STYLE[order.status] ?? { bg: '#f3f4f6', text: '#374151' };
              return (
                <View key={order.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber} numberOfLines={1}>{order.orderNumber}</Text>
                    <Text style={styles.orderVendor} numberOfLines={1}>from {order.vendorName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderTotal}>{fmt(order.total)}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No purchase orders yet.</Text>
            <Text style={styles.emptySub}>Browse the marketplace to place your first wholesale order.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  heading: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statIcon: { width: 32, height: 32, borderRadius: 9 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  statValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 1 },
  revenueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  revenueValue: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 2 },
  recentCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  recentTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937', marginBottom: 8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: '#f3f4f6' },
  orderNumber: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  orderVendor: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  orderTotal: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 24, alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  emptySub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4, textAlign: 'center' },
});
