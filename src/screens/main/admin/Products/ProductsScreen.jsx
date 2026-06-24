import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, RefreshControl, Image, ScrollView,
} from 'react-native';
import {
  useProductsInfinite, useCategories, useDeleteProduct, flattenPages,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';


const ProductsScreen = ({ navigation }) => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PRODUCTS);
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const {
    data: productData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useProductsInfinite();
  const { data: rawCats = [] } = useCategories();
  const { mutateAsync: remove } = useDeleteProduct();

  const products   = flattenPages(productData);
  const categories = Array.isArray(rawCats) ? rawCats : (rawCats?.data ?? []);

  const filtered = products.filter(p => {
    if (categoryFilter && String(p.categoryId ?? p.category?.id ?? '') !== String(categoryFilter)) return false;
    if (search && !(p.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = p => Alert.alert('Delete Product', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search products…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        {canManage && <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductForm')}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>}
      </View>

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
          {[{ id: '', name: 'All' }, ...categories].map(c => (
            <TouchableOpacity
              key={c.id || 'all'}
              style={[styles.catChip, categoryFilter === c.id && styles.catChipActive]}
              onPress={() => setCategoryFilter(c.id)}
            >
              <Text style={[styles.catChipText, categoryFilter === c.id && styles.catChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.thumb}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} resizeMode="cover" />
                : <View style={styles.thumbPlaceholder} />}
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowNameRow}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.isActive === false && (
                  <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>
                )}
              </View>
              <Text style={styles.rowSub}>
                {item.sku ? `SKU: ${item.sku}  ` : ''}{item.categoryRef?.name ?? item.category ?? 'No cat'} · Stock: {item.stock}
              </Text>
              {item.cost != null && (
                <Text style={styles.rowCost}>Cost: {fmt(item.cost)}</Text>
              )}
            </View>
            <Text style={styles.rowPrice}>{fmt(item.price)}</Text>
            {canManage && (
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProductForm', { product: item })}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delBtnText}>Del</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No products found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0},
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', gap: 8 },
  catChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  catChipTextActive: { color: '#fff' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f6f9' },
  thumbImg: { width: 44, height: 44 },
  thumbPlaceholder: { width: 44, height: 44, backgroundColor: '#e5e7eb' },
  rowInfo: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  inactiveBadge: { backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveBadgeText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowCost: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  rowPrice: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  rowActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default ProductsScreen;
