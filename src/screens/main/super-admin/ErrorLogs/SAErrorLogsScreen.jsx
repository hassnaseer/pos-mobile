import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useSAErrorLogs } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const LEVEL_STYLE = {
  error:   { bg: '#fee2e2', text: '#dc2626' },
  warn:    { bg: '#fef9c3', text: '#b45309' },
  warning: { bg: '#fef9c3', text: '#b45309' },
  info:    { bg: '#dbeafe', text: '#1d4ed8' },
  debug:   { bg: '#f3f4f6', text: '#6b7280' },
};

const SAErrorLogsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSAErrorLogs();
  const logs = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const [filterLevel, setFilterLevel] = useState('');
  const LEVELS = ['error', 'warn', 'info'];

  const filtered = filterLevel ? logs.filter(l => (l.level ?? '').toLowerCase().startsWith(filterLevel)) : logs;

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...LEVELS].map(lv => (
          <TouchableOpacity key={lv || 'all'} style={[styles.chip, filterLevel === lv && styles.chipActive]} onPress={() => setFilterLevel(lv)}>
            <Text style={[styles.chipText, filterLevel === lv && styles.chipTextActive]}>{lv || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(l, i) => String(l.id ?? i)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No error logs found.</Text>}
        renderItem={({ item }) => {
          const level = (item.level ?? 'info').toLowerCase();
          const st = LEVEL_STYLE[level] ?? LEVEL_STYLE.info;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{(item.level ?? 'INFO').toUpperCase()}</Text>
                </View>
                <Text style={styles.ts}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}</Text>
              </View>
              <Text style={styles.message} numberOfLines={3}>{item.message ?? item.error ?? '—'}</Text>
              {item.context && <Text style={styles.context} numberOfLines={1}>{item.context}</Text>}
              {item.stack && <Text style={styles.stack} numberOfLines={4}>{item.stack}</Text>}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 54 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold' },
  ts: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa' },
  message: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', lineHeight: 18 },
  context: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4 },
  stack: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 6, lineHeight: 14 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SAErrorLogsScreen;
