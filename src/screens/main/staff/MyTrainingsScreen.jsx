import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useMyTrainings } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const STATUS_COLOR = {
  enrolled:   '#3B82F6',
  in_progress:'#F59E0B',
  completed:  '#10B981',
  cancelled:  '#9CA3AF',
};

const ProgressBar = ({ value = 0 }) => (
  <View style={styles.progressBg}>
    <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
  </View>
);

const MyTrainingsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyTrainings();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLOR[item.status] ?? '#9CA3AF';
          const progress = Number(item.progress ?? item.completionPercentage ?? 0);
          return (
            <View style={styles.row}>
              <View style={styles.topRow}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.title}</Text>
                  {item.category && (
                    <Text style={styles.rowCategory}>{item.category}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {item.status?.replace('_', ' ') ?? 'enrolled'}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}

              {progress > 0 && (
                <View style={styles.progressRow}>
                  <ProgressBar value={progress} />
                  <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                {item.startDate && (
                  <Text style={styles.rowMeta}>Start: {new Date(item.startDate).toLocaleDateString()}</Text>
                )}
                {item.endDate && (
                  <Text style={styles.rowMeta}>End: {new Date(item.endDate).toLocaleDateString()}</Text>
                )}
                {item.trainer && (
                  <Text style={styles.rowMeta}>Trainer: {item.trainer}</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No trainings enrolled.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  row:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  topRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  rowCategory:  { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary },
  rowDesc:      { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 8 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8, flexShrink: 0 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold', textTransform: 'capitalize' },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressBg:   { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel:{ fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, minWidth: 32 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rowMeta:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyTrainingsScreen;
