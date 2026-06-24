import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useSAErrorLogs, flattenPages } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const GROUP_STYLE = {
  '2xx': { bg: '#dcfce7', text: '#16a34a', label: '2xx' },
  '4xx': { bg: '#fef9c3', text: '#b45309', label: '4xx' },
  '5xx': { bg: '#fee2e2', text: '#dc2626', label: '5xx' },
};

function getGroup(statusCode) {
  if (!statusCode) return null;
  const n = Number(statusCode);
  if (n >= 200 && n < 300) return '2xx';
  if (n >= 400 && n < 500) return '4xx';
  if (n >= 500) return '5xx';
  return null;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const SAErrorLogsScreen = () => {
  const {
    data: logData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useSAErrorLogs();
  const logs = flattenPages(logData);

  const [filterGroup, setFilterGroup] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  const filtered = logs.filter(l => {
    if (filterGroup && getGroup(l.statusCode) !== filterGroup) return false;
    if (filterMethod && (l.method ?? '').toUpperCase() !== filterMethod) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', '5xx', '4xx', '2xx'].map(g => {
          const st = GROUP_STYLE[g];
          const isActive = filterGroup === g;
          return (
            <TouchableOpacity
              key={g || 'all'}
              style={[styles.chip, isActive && (g ? { backgroundColor: st.bg, borderColor: st.text } : styles.chipActive)]}
              onPress={() => setFilterGroup(g)}
            >
              <Text style={[styles.chipText, isActive && (g ? { color: st.text, fontFamily: 'Outfit-Bold' } : styles.chipTextActive)]}>
                {g || 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.chipDivider} />
        {METHODS.map(m => {
          const isActive = filterMethod === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.chip, { borderColor: '#8b5cf6' }, isActive && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
              onPress={() => setFilterMethod(isActive ? '' : m)}
            >
              <Text style={[styles.chipText, { color: '#8b5cf6' }, isActive && { color: '#fff' }]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(l, i) => String(l.id ?? i)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No error logs found.</Text>}
        renderItem={({ item }) => {
          const group = getGroup(item.statusCode);
          const st = GROUP_STYLE[group] ?? { bg: '#f3f4f6', text: '#6b7280' };
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>{item.statusCode ?? '—'}</Text>
                  </View>
                  {item.method && (
                    <View style={styles.methodBadge}>
                      <Text style={styles.methodText}>{item.method}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.ts}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</Text>
              </View>
              {item.endpoint && (
                <Text style={styles.endpoint} numberOfLines={1}>{item.endpoint}</Text>
              )}
              <Text style={styles.message} numberOfLines={3}>{item.errorMessage ?? '—'}</Text>
              {item.userId && <Text style={styles.context} numberOfLines={1}>User: {item.userId}</Text>}
              {item.ipAddress && <Text style={styles.context} numberOfLines={1}>IP: {item.ipAddress}</Text>}
              {item.stackTrace && (
                <Text style={styles.stack} numberOfLines={4}>{item.stackTrace}</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, height: 24, backgroundColor: '#e0e0e0', alignSelf: 'center', marginHorizontal: 4 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-Bold' },
  methodBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#ede9fe' },
  methodText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6d28d9' },
  ts: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa' },
  endpoint: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280', marginBottom: 4 },
  message: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', lineHeight: 18 },
  context: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4 },
  stack: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 6, lineHeight: 14 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SAErrorLogsScreen;
