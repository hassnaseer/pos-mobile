import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useMyPayslips } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const STATUS_COLOR = { paid: '#10B981', pending: '#F59E0B', processing: '#3B82F6' };

const MyPayslipsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyPayslips();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.period ?? item.month ?? '—'}</Text>
              <Text style={styles.rowSub}>
                Gross: Rs {Number(item.grossSalary ?? item.gross ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.rowNet}>
                Net: Rs {Number(item.netSalary ?? item.net ?? 0).toFixed(2)}
              </Text>
              {item.paidAt && (
                <Text style={styles.rowMeta}>Paid on {new Date(item.paidAt).toLocaleDateString()}</Text>
              )}
            </View>
            <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                {item.status ?? 'pending'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No payslips available.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f4f6f9' },
  row:       { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowInfo:   { flex: 1 },
  rowName:   { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowNet:    { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 2 },
  rowMeta:   { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyPayslipsScreen;
