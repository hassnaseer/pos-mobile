import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useMyTasks, useUpdateMyTask } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', in_progress: '#3B82F6', completed: '#10B981', cancelled: '#9CA3AF' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

const MyTasksScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyTasks();
  const { mutateAsync: update, isPending: updating } = useUpdateMyTask();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleMarkDone = item => Alert.alert(
    'Complete Task',
    `Mark "${item.title}" as completed?`,
    [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Mark Done', onPress: async () => {
          try { await update({ id: item.id, status: 'completed' }); }
          catch (e) { Alert.alert('Error', e?.message ?? 'Failed to update'); }
        }
      },
    ]
  );

  const priorityColor = p => {
    if (p === 'high')   return '#EF4444';
    if (p === 'medium') return '#F59E0B';
    return '#6B7280';
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.rowName} numberOfLines={1}>{item.title}</Text>
                {item.priority && (
                  <Text style={[styles.priority, { color: priorityColor(item.priority) }]}>
                    {item.priority}
                  </Text>
                )}
              </View>
              {item.description ? (
                <Text style={styles.rowSub} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.dueDate && (
                <Text style={styles.rowMeta}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
              )}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                  {STATUS_LABEL[item.status] ?? item.status ?? 'Pending'}
                </Text>
              </View>
              {(item.status === 'pending' || item.status === 'in_progress') && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => handleMarkDone(item)} disabled={updating}>
                  {updating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.doneBtnText}>✓ Done</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No tasks assigned to you.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f4f6f9' },
  row:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowInfo:   { flex: 1 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowName:   { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', flex: 1 },
  priority:  { fontSize: 11, fontFamily: 'Outfit-SemiBold', textTransform: 'capitalize' },
  rowSub:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:   { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 4 },
  rowRight:  { alignItems: 'flex-end', gap: 6 },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  doneBtn:   { backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  doneBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyTasksScreen;
