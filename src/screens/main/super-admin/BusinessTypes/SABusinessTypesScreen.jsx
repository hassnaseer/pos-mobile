import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSABusinessTypes } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SABusinessTypesScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSABusinessTypes();
  const types = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={types}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}><Text style={styles.iconText}>{(item.name ?? 'B')[0].toUpperCase()}</Text></View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.description && <Text style={styles.rowSub}>{item.description}</Text>}
            </View>
            <Text style={styles.active}>{item.active !== false ? '✓ Active' : 'Inactive'}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No business types.</Text>}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  active: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#22c55e' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SABusinessTypesScreen;
