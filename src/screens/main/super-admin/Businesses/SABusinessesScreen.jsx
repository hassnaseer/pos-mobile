import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSABusinesses } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_COLORS = { Active: '#22c55e', Trial: '#f59e0b', Expired: '#ef4444', Blocked: '#6b7280' };

const SABusinessesScreen = () => {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useSABusinesses({ search: search || undefined, limit: 50 });
  const businesses = data?.data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search businesses…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={businesses}
        keyExtractor={b => String(b.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => navigation.navigate('SABusinessDetail', { businessId: item.id })}>
            <View style={styles.bizAvatar}>
              {item.logoUrl
                ? <Image source={{ uri: item.logoUrl }} style={styles.bizAvatarImg} resizeMode="contain" />
                : <Text style={styles.bizAvatarText}>{(item.name ?? 'B')[0].toUpperCase()}</Text>}
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.parentName && <Text style={styles.branch}>↳ {item.parentName}</Text>}
              </View>
              <Text style={styles.rowSub}>{item.owner} · {item.email}</Text>
              <Text style={styles.rowPlan}>{item.plan} {item.packagePlanName ? `· ${item.packagePlanName}` : ''}</Text>
              {item.expiryDate && <Text style={styles.rowExpiry}>Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#aaa') + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#aaa' }]}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No businesses found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bizAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 2 },
  bizAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  bizAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowTop: { marginBottom: 4 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  branch: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#7c3aed', marginTop: 2 },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  rowPlan: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 2 },
  rowExpiry: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SABusinessesScreen;
