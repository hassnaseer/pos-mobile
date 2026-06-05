import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useMyAnnouncements } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const MyAnnouncementsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyAnnouncements();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>📢</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.title}</Text>
              {item.content ? <Text style={styles.rowContent}>{item.content}</Text> : null}
              {item.createdAt && (
                <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No announcements right now.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f4f6f9' },
  row:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  iconWrap:   { width: 42, height: 42, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 20 },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 4 },
  rowContent: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 20 },
  rowMeta:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 6 },
  empty:      { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyAnnouncementsScreen;
