import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const NotifItem = ({ item, onRead }) => (
  <TouchableOpacity
    style={[styles.item, !item.isRead && styles.itemUnread]}
    onPress={() => !item.isRead && onRead(item.id)}
    activeOpacity={0.7}
  >
    <View style={styles.itemDot}>
      {!item.isRead && <View style={styles.dot} />}
    </View>
    <View style={styles.itemBody}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemMsg}>{item.message}</Text>
      <Text style={styles.itemTime}>
        {(item.insertedDate ?? item.createdAt) ? new Date(item.insertedDate ?? item.createdAt).toLocaleString() : ''}
      </Text>
    </View>
  </TouchableOpacity>
);

const NotificationsScreen = () => {
  const { data: notifs = [], isLoading, refetch } = useNotifications();
  const { mutate: markOne } = useMarkNotificationRead();
  const { mutate: markAll } = useMarkAllNotificationsRead();

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Notifications</Text>
        {notifs.some(n => !n.isRead) && (
          <TouchableOpacity onPress={() => markAll()}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifs}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => <NotifItem item={item} onRead={markOne} />}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        contentContainerStyle={notifs.length === 0 && styles.emptyWrap}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  markAll: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.primary },
  item: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 8, borderRadius: 10, flexDirection: 'row', gap: 12 },
  itemUnread: { backgroundColor: '#EBF0F5' },
  itemDot: { width: 10, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 4 },
  itemMsg: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, lineHeight: 20 },
  itemTime: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 6 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', fontSize: 15 },
  emptyWrap: { flex: 1, justifyContent: 'center' },
});

export default NotificationsScreen;
