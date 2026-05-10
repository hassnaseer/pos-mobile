import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useSARevenueReports } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const SAReportsScreen = () => {
  const { fmt } = useCurrency();
  const { data, isLoading, refetch } = useSARevenueReports();
  const topBusinesses = data?.topBusinesses ?? [];

  return (
    <View style={styles.root}>
      {isLoading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        : (
          <>
            <View style={styles.summaryRow}>
              {[
                { label: 'Total Revenue', value: fmt(data?.totalRevenue) },
                { label: 'Total Subscriptions', value: data?.totalSubscriptions ?? 0 },
                { label: 'Active Businesses', value: data?.activeBusinesses ?? 0 },
              ].map(s => (
                <View key={s.label} style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{s.value}</Text>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {topBusinesses.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Top Businesses by Revenue</Text>
                <FlatList
                  data={topBusinesses}
                  keyExtractor={(b, i) => String(b.id ?? i)}
                  refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
                  renderItem={({ item, index }) => (
                    <View style={styles.row}>
                      <Text style={styles.rank}>#{index + 1}</Text>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        <Text style={styles.rowSub}>{item.owner}</Text>
                      </View>
                      <Text style={styles.revenue}>{fmt(item.revenue)}</Text>
                    </View>
                  )}
                />
              </>
            )}
          </>
        )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  summaryRow: { flexDirection: 'row', padding: 12, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2 },
  summaryValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.primary, marginBottom: 4 },
  summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 14, gap: 10 },
  rank: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary, width: 32 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  revenue: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#22c55e' },
});

export default SAReportsScreen;
