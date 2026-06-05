import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useActivityLogs } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const LIMIT = 20;

const actionColor = action => {
  if (action === 'CREATE') return '#16a34a';
  if (action === 'DELETE') return '#DC2626';
  if (action === 'UPDATE') return '#D97706';
  return '#6B7280';
};

const ActivityLogsScreen = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useActivityLogs({ page, limit: LIMIT });

  const logs       = data?.data  ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT) || 1;

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.badge, { backgroundColor: actionColor(item.action) + '18' }]}>
          <Text style={[styles.badgeText, { color: actionColor(item.action) }]}>{item.action}</Text>
        </View>
        <Text style={styles.entity}>{item.entityType}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.user} numberOfLines={1}>
        {item.user?.name ?? 'System'}
        {item.impersonatedBy ? ` (via ${item.impersonatedBy?.name})` : ''}
      </Text>
      {item.details ? (
        <Text style={styles.details} numberOfLines={2}>
          {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No activity logs found.</Text>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <Text style={styles.pageBtnText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                >
                  <Text style={styles.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  list:           { padding: 16, paddingBottom: 24 },
  empty:          { textAlign: 'center', color: '#999', marginTop: 40, fontFamily: 'Outfit-Regular' },
  row:            { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowTop:         { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  badge:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  entity:         { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', flex: 1 },
  time:           { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  user:           { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 2 },
  details:        { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  pagination:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  pageBtn:        { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 8 },
  pageBtnDisabled:{ opacity: 0.4 },
  pageBtnText:    { color: '#fff', fontFamily: 'Outfit-Medium', fontSize: 13 },
  pageInfo:       { fontFamily: 'Outfit-Regular', color: '#6B7280' },
});

export default ActivityLogsScreen;
