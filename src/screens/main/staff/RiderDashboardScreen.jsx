import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useRiderDashboard } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const STAT_CARDS = [
  { key: 'assigned',       label: 'Assigned',         color: '#3B82F6' },
  { key: 'outForDelivery', label: 'Out for Delivery', color: '#F97316' },
  { key: 'delivered',      label: 'Delivered',        color: '#16A34A' },
  { key: 'total',          label: 'Total',            color: '#6B7280' },
];

export default function RiderDashboardScreen() {
  const { user } = useAuth();
  const { data: raw, isLoading, isFetching, refetch } = useRiderDashboard();
  const stats = raw?.data ?? raw ?? { assigned: 0, outForDelivery: 0, delivered: 0, total: 0 };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View>
        <Text style={styles.heading}>My Dashboard</Text>
        <Text style={styles.subHeading}>Welcome back, {user?.fullName ?? 'Rider'} — here's your delivery overview</Text>
      </View>

      <View style={styles.statsGrid}>
        {STAT_CARDS.map(s => (
          <View key={s.key} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color }]} />
            <View>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{stats[s.key] ?? 0}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          You have <Text style={styles.bold}>{stats.assigned ?? 0}</Text> order{(stats.assigned ?? 0) !== 1 ? 's' : ''} ready for pickup
          {(stats.outForDelivery ?? 0) > 0 ? ` and ${stats.outForDelivery} currently out for delivery` : ''}.
        </Text>
        <Text style={styles.bannerSub}>Go to My Deliveries to manage your active orders.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  statIcon: { width: 36, height: 36, borderRadius: 10 },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  statValue: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 2 },
  banner: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 16 },
  bannerText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1d4ed8' },
  bold: { fontFamily: 'Outfit-Bold' },
  bannerSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#2563eb', marginTop: 4 },
});
