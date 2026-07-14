import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useMyTasks, useUpdateMyTask } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', in_progress: '#3B82F6', completed: '#10B981', cancelled: '#9CA3AF' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed'];

const MyTasksScreen = () => {
  const [filter, setFilter] = useState('all');
  const { data: raw = [], isLoading, refetch } = useMyTasks();
  const { mutateAsync: update, isPending: updating } = useUpdateMyTask();

  const allItems = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const items = filter === 'all' ? allItems : allItems.filter(i => i.status === filter);

  const handleChangeStatus = item => {
    const options = ['pending', 'in_progress', 'completed']
      .filter(s => s !== item.status)
      .map(s => ({
        text: STATUS_LABEL[s],
        onPress: async () => {
          try { await update({ id: item.id, status: s }); }
          catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to update'); }
        },
      }));
    Alert.alert('Update Status', `"${item.title}"`, [...options, { text: 'Cancel', style: 'cancel' }]);
  };

  const priorityColor = p => {
    if (p === 'high')   return '#EF4444';
    if (p === 'medium') return '#F59E0B';
    return '#6B7280';
  };

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {STATUS_TABS.map(s => (
          <TouchableOpacity key={s} style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
              {item.createdBy?.name && (
                <Text style={styles.rowMeta}>From: {item.createdBy.name}</Text>
              )}
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
                <TouchableOpacity style={styles.doneBtn} onPress={() => handleChangeStatus(item)} disabled={updating}>
                  {updating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.doneBtnText}>Update</Text>
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  filterChipTextActive: { color: '#fff' },
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
