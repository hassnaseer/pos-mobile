import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useDashboard } from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const StatCard = ({ label, value, color = colors.primary }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardValue}>{value ?? '—'}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
  </View>
);

const DashboardScreen = () => {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { data, isLoading, refetch } = useDashboard();

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.welcome}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'User'} 👋</Text>
        {user?.businessName && <Text style={styles.biz}>{user.businessName}</Text>}
      </View>

      {isLoading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          <StatCard label="Today's Sales" value={fmt(data?.todaySales ?? 0)} color="#22c55e" />
          <StatCard label="Total Orders" value={data?.totalOrders ?? 0} color={colors.primary} />
          <StatCard label="Products" value={data?.totalProducts ?? 0} color="#f59e0b" />
          <StatCard label="Customers" value={data?.totalCustomers ?? 0} color="#8b5cf6" />
          <StatCard label="Low Stock Items" value={data?.lowStockCount ?? 0} color={colors.warning} />
          <StatCard label="Pending Tickets" value={data?.openTickets ?? 0} color="#06b6d4" />
        </View>
      )}

      {user?.isTrialExpired && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>⚠️ Your trial has expired. Please upgrade to continue using all features.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  welcome: { padding: 20, backgroundColor: colors.primary, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#fff' },
  biz: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardValue: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 4 },
  cardLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  trialBanner: { margin: 16, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F59E0B' },
  trialText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#92400E', lineHeight: 20 },
});

export default DashboardScreen;
