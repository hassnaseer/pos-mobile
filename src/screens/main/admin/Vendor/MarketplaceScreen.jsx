import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useMarketplace } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const MarketplaceScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorBuyer();
  const { fmt } = useCurrency();

  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('all');

  const { data: raw = [], isLoading, refetch } = useMarketplace();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const vendorSpecializations = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.vendor?.vendorCategory) set.add(i.vendor.vendorCategory); });
    return [...set];
  }, [items]);

  const filtered = items.filter(i => {
    const nameMatch = (i.name ?? i.title ?? '').toLowerCase().includes(search.toLowerCase());
    const specMatch = specFilter === 'all' || i.vendor?.vendorCategory === specFilter;
    return nameMatch && specMatch;
  });

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

        {/* Specialization filter — only shown when options exist */}
        {vendorSpecializations.length > 0 && (
          <FlatList
            data={['all', ...vendorSpecializations]}
            keyExtractor={i => i}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, specFilter === item && styles.filterChipActive]}
                onPress={() => setSpecFilter(item)}
              >
                <Text style={[styles.filterChipText, specFilter === item && styles.filterChipTextActive]}>
                  {item === 'all' ? 'All' : item}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
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
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <Text style={styles.cardEmoji}>🛒</Text>
              )}
            </View>
            <Text style={styles.cardName} numberOfLines={2}>{item.name ?? item.title ?? '—'}</Text>
            {item.price != null && (
              <Text style={styles.cardPrice}>{fmt(item.price)}</Text>
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
  root:                { flex: 1, backgroundColor: '#f4f6f9' },
  centered:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:            { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:              { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 12 },
  search:              { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 8 },
  filterList:          { marginTop: 2 },
  filterChip:          { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#F3F4F6' },
  filterChipActive:    { backgroundColor: colors.primary },
  filterChipText:      { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6B7280' },
  filterChipTextActive:{ color: '#fff' },
  list:                { padding: 10, paddingBottom: 24 },
  row:                 { justifyContent: 'space-between', marginBottom: 10 },
  card:                { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardImg:             { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardImage:           { width: '100%', height: '100%', borderRadius: 8 },
  cardEmoji:           { fontSize: 32 },
  cardName:            { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 4 },
  cardPrice:           { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, marginBottom: 2 },
  cardVendor:          { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginBottom: 8 },
  orderBtn:            { backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  orderBtnText:        { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty:               { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MarketplaceScreen;
