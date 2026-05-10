import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSARoles } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SARolesScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSARoles();
  const roles = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={roles}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.description && <Text style={styles.rowSub}>{item.description}</Text>}
            </View>
            <Text style={styles.roleBadge}>{item.id}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No roles found.</Text>}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 16, gap: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  roleBadge: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, backgroundColor: '#EBF0F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SARolesScreen;
