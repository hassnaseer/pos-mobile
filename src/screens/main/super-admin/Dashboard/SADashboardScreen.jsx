import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSABusinesses, useSARevenueReports } from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const StatCard = ({ label, value, color = colors.primary }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardValue}>{value ?? '—'}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
  </View>
);

const SADashboardScreen = () => {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { data: bizData, isLoading: bizLoading, refetch: refetchBiz } = useSABusinesses({ limit: 5 });
  const { data: revenue, isLoading: revLoading, refetch: refetchRev } = useSARevenueReports();

  const pagination = bizData?.pagination ?? {};
  const totalBiz = pagination.total ?? 0;

  const isLoading = bizLoading || revLoading;
  const refetch = () => { refetchBiz(); refetchRev(); };

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.welcome}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Super Admin'} 👋</Text>
        <Text style={styles.subtitle}>Super Admin Dashboard</Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Total Businesses" value={totalBiz} color="#3b82f6" />
        <StatCard label="Platform Revenue" value={fmt(revenue?.totalRevenue ?? 0)} color="#22c55e" />
        <StatCard label="Active Plans" value={revenue?.activePlans ?? 0} color="#f59e0b" />
        <StatCard label="New This Month" value={revenue?.newBusinesses ?? 0} color="#8b5cf6" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  welcome: { padding: 20, backgroundColor: colors.primary, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#fff' },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  cardValue: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 4 },
  cardLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
});

export default SADashboardScreen;
