import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useMarketplace } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const MarketplaceScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.can(PERMISSIONS.ACCESS_VENDOR);
  const [search, setSearch] = useState('');

  const { data: raw = [], isLoading, refetch } = useMarketplace();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const filtered = items.filter(i =>
    (i.name ?? i.title ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (!canAccess) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noAccess}>You don't have access to the Marketplace.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search marketplace…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardImg}>
              <Text style={styles.cardEmoji}>🛒</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={2}>{item.name ?? item.title ?? '—'}</Text>
            {item.price != null && (
              <Text style={styles.cardPrice}>Rs {Number(item.price).toFixed(2)}</Text>
            )}
            {item.vendor?.name ? (
              <Text style={styles.cardVendor} numberOfLines={1}>{item.vendor.name}</Text>
            ) : null}
            <TouchableOpacity style={styles.orderBtn}>
              <Text style={styles.orderBtnText}>Order</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No products in marketplace yet.</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:     { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:       { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search:       { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', fontFamily: 'Outfit-Regular', color: '#111' },
  list:         { padding: 10, paddingBottom: 24 },
  row:          { justifyContent: 'space-between', marginBottom: 10 },
  card:         { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardImg:      { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardEmoji:    { fontSize: 32 },
  cardName:     { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 4 },
  cardPrice:    { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, marginBottom: 2 },
  cardVendor:   { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginBottom: 8 },
  orderBtn:     { backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MarketplaceScreen;
