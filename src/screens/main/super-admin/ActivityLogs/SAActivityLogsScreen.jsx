import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSAActivityLogs } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const ACTION_COLORS = {
  create: { bg: '#d1fae5', text: '#065f46' },
  update: { bg: '#dbeafe', text: '#1e40af' },
  delete: { bg: '#fee2e2', text: '#991b1b' },
  login:  { bg: '#fef3c7', text: '#92400e' },
};

const actionColor = action => {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : { bg: '#f3f4f6', text: '#6b7280' };
};

export default function SAActivityLogsScreen() {
  const { data: logs = [], isLoading, isError } = useSAActivityLogs();

  const [search, setSearch]           = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  const uniqueActions  = useMemo(() => ['all', ...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs]);
  const uniqueEntities = useMemo(() => ['all', ...new Set(logs.map(l => l.entityType).filter(Boolean))].sort(), [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterEntity !== 'all' && log.entityType !== filterEntity) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (log.action ?? '').toLowerCase().includes(q) ||
        (log.entityType ?? '').toLowerCase().includes(q) ||
        (log.user?.fullName ?? '').toLowerCase().includes(q) ||
        (log.business?.name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [logs, search, filterAction, filterEntity]);

  const renderItem = ({ item: log }) => {
    const ac = actionColor(log.action);
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={[styles.actionBadge, { backgroundColor: ac.bg }]}>
            <Text style={[styles.actionText, { color: ac.text }]}>{log.action ?? '—'}</Text>
          </View>
          <Text style={styles.entityType}>{log.entityType ?? '—'}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.user}>{log.user?.fullName ?? log.user?.id ?? 'System'}</Text>
          {log.business?.name && <Text style={styles.business}>{log.business.name}</Text>}
          <Text style={styles.date}>{fmtDate(log.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity Logs</Text>
        <Text style={styles.subtitle}>Audit trail across all tenants</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search logs…"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filter rows */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Action:</Text>
        <FlatList
          data={uniqueActions.slice(0, 8)}
          keyExtractor={i => i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filterAction === item && styles.filterChipActive]}
              onPress={() => setFilterAction(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterAction === item && styles.filterChipTextActive]}>
                {item === 'all' ? 'All' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={[styles.filterSection, { marginBottom: 0 }]}>
        <Text style={styles.filterLabel}>Entity:</Text>
        <FlatList
          data={uniqueEntities.slice(0, 8)}
          keyExtractor={i => i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filterEntity === item && styles.filterChipActive]}
              onPress={() => setFilterEntity(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterEntity === item && styles.filterChipTextActive]}>
                {item === 'all' ? 'All' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Count */}
      <Text style={styles.count}>{filtered.length} of {logs.length} records</Text>

      {/* List */}
      {isError && (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>⚠️</Text>
          <Text style={styles.emptyText}>Activity logs endpoint is not available.{'\n'}This feature may not be enabled on your backend.</Text>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? null : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No logs match your filters</Text>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  filterSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6, gap: 8 },
  filterLabel: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280', width: 46 },
  filterChip: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  filterChipTextActive: { color: '#fff' },
  count: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 12 },
  rowLeft: { flex: 1, gap: 4 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  actionBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', textTransform: 'lowercase' },
  entityType: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  user: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  business: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  date: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  separator: { height: 1, backgroundColor: '#f3f4f6' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
