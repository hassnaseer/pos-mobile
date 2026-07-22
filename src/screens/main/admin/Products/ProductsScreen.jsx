import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, RefreshControl, Image, ScrollView, Modal,
} from 'react-native';
import { pick, types, isCancel } from '@react-native-documents/picker';
import {
  useProductsInfinite, useCategories, useSuppliers, useDeviceConditions,
  useDeleteProduct, useBulkDeleteProducts, useImportProducts,
  useImportBatches, useDeleteImportBatch, flattenPages,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import { exportProductsToCsv, readCsvFileToRows, shareCsvTemplate } from '../../../../utils/productCsv';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const STATUS_OPTIONS = [
  { id: '', name: 'All' }, { id: 'active', name: 'Active' },
  { id: 'pending', name: 'Pending' }, { id: 'inactive', name: 'Inactive' },
];

const ProductsScreen = ({ navigation }) => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PRODUCTS);
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canBulkOps = perms.can(PERMISSIONS.ACCESS_BULK_OPERATIONS);

  const queryParams = {
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(supplierFilter ? { supplier: supplierFilter } : {}),
    ...(conditionFilter ? { condition: conditionFilter } : {}),
  };

  const {
    data: productData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useProductsInfinite(queryParams);
  const { data: rawCats = [] } = useCategories();
  const { data: rawSuppliers = [] } = useSuppliers();
  const { data: rawConditions = [] } = useDeviceConditions();
  const { mutateAsync: remove } = useDeleteProduct();
  const { mutateAsync: bulkDelete, isPending: bulkDeleting } = useBulkDeleteProducts();
  const { mutateAsync: importProducts } = useImportProducts();
  const { data: rawBatches = [], refetch: refetchBatches } = useImportBatches('products');
  const { mutateAsync: deleteBatch } = useDeleteImportBatch();

  const norm = d => Array.isArray(d) ? d : (d?.data ?? []);
  const products    = flattenPages(productData);
  const categories  = norm(rawCats);
  const suppliers   = norm(rawSuppliers);
  const conditions  = norm(rawConditions);
  const batches     = norm(rawBatches);

  const activeFilterCount = [statusFilter, supplierFilter, conditionFilter, lowStockOnly ? 'x' : ''].filter(Boolean).length;

  const filtered = products.filter(p => {
    if (search && !(p.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (lowStockOnly && !(p.lowStockThreshold > 0 && p.stock <= p.lowStockThreshold)) return false;
    return true;
  });

  const handleDelete = p => Alert.alert('Delete Product', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);

  const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBulkDelete = () => Alert.alert('Delete Products', `Delete ${selectedIds.length} selected product(s)?`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await bulkDelete(selectedIds);
          setSelectedIds([]);
          setSelectMode(false);
        } catch {
          Alert.alert('Error', 'Bulk delete failed');
        }
      },
    },
  ]);

  const handleExport = async () => {
    if (!filtered.length) { Alert.alert('Nothing to export', 'No products loaded to export.'); return; }
    setExporting(true);
    try {
      const rows = selectedIds.length > 0 ? filtered.filter(p => selectedIds.includes(p.id)) : filtered;
      await exportProductsToCsv(rows, selectedIds.length > 0 ? `products_selected_${rows.length}` : 'products');
    } catch {
      Alert.alert('Error', 'Failed to export products');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const [file] = await pick({ type: [types.csv] });
      setImporting(true);
      const rows = await readCsvFileToRows(file.uri);
      if (!rows.length) { Alert.alert('Empty file', 'No valid rows found (a "Name" column is required).'); return; }
      const res = await importProducts(rows);
      const data = res?.data ?? res;
      const errCount = data?.errors?.length ?? 0;
      Alert.alert(
        'Import Complete',
        `${data?.success ?? 0} product(s) imported.${errCount ? ` ${errCount} row(s) failed.` : ''}`,
      );
      refetch();
    } catch (err) {
      if (isCancel(err)) return;
      Alert.alert('Error', 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteBatch = id => Alert.alert('Delete Import Batch', 'This removes the batch from history.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBatch(id); refetchBatches(); } },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search products…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterBtnText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
        </TouchableOpacity>
        {canManage && (
          <TouchableOpacity style={styles.selectToggleBtn} onPress={() => { setSelectMode(v => !v); setSelectedIds([]); }}>
            <Text style={styles.selectToggleBtnText}>{selectMode ? 'Cancel' : 'Select'}</Text>
          </TouchableOpacity>
        )}
        {canManage && !selectMode && <HeaderAddButton onPress={() => navigation.navigate('ProductForm')} label="Add" />}
      </View>

      {canManage && canBulkOps && (
        <View style={styles.bulkOpsBar}>
          <TouchableOpacity style={styles.bulkOpsBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.bulkOpsBtnText}>Export CSV</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkOpsBtn} onPress={handleImport} disabled={importing}>
            {importing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.bulkOpsBtnText}>Import CSV</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkOpsBtn} onPress={shareCsvTemplate}>
            <Text style={styles.bulkOpsBtnText}>Template</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkOpsBtn} onPress={() => setShowHistory(true)}>
            <Text style={styles.bulkOpsBtnText}>History</Text>
          </TouchableOpacity>
        </View>
      )}

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
          {[{ name: '' }, ...categories].map(c => (
            <TouchableOpacity
              key={c.name || 'all'}
              style={[styles.catChip, categoryFilter === c.name && styles.catChipActive]}
              onPress={() => setCategoryFilter(c.name)}
            >
              <Text style={[styles.catChipText, categoryFilter === c.name && styles.catChipTextActive]}>{c.name || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectMode && selectedIds.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionBarText}>{selectedIds.length} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds([])}><Text style={styles.selectionClearText}>Clear</Text></TouchableOpacity>
          <TouchableOpacity style={styles.selectionDeleteBtn} onPress={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.selectionDeleteText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={selectMode ? 0.7 : 1}
            onPress={() => selectMode && toggleSelect(item.id)}
          >
            {selectMode && (
              <View style={[styles.checkbox, selectedIds.includes(item.id) && styles.checkboxActive]}>
                {selectedIds.includes(item.id) && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
            )}
            <View style={styles.thumb}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} resizeMode="cover" />
                : <View style={styles.thumbPlaceholder} />}
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowNameRow}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.status && item.status !== 'active' && (
                  <View style={[styles.inactiveBadge, item.status === 'pending' && styles.pendingBadge]}>
                    <Text style={[styles.inactiveBadgeText, item.status === 'pending' && styles.pendingBadgeText]}>
                      {item.status === 'pending' ? 'Pending' : 'Inactive'}
                    </Text>
                  </View>
                )}
                {item.lowStockThreshold > 0 && item.stock <= item.lowStockThreshold && (
                  <View style={styles.lowStockBadge}><Text style={styles.lowStockBadgeText}>Low Stock</Text></View>
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
            {canManage && !selectMode && (
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProductForm', { product: item })}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delBtnText}>Del</Text></TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No products found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalBg}>
          <View style={styles.filterSheet}>
            <Text style={styles.filterSheetTitle}>Filters</Text>

            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChipRow}>
              {STATUS_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.id || 'all'}
                  style={[styles.filterChip, statusFilter === o.id && styles.filterChipActive]}
                  onPress={() => setStatusFilter(o.id)}
                >
                  <Text style={[styles.filterChipText, statusFilter === o.id && styles.filterChipTextActive]}>{o.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {suppliers.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Supplier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChipRow}>
                    {[{ name: '' }, ...suppliers].map(s => (
                      <TouchableOpacity
                        key={s.name || 'all'}
                        style={[styles.filterChip, supplierFilter === s.name && styles.filterChipActive]}
                        onPress={() => setSupplierFilter(s.name)}
                      >
                        <Text style={[styles.filterChipText, supplierFilter === s.name && styles.filterChipTextActive]}>{s.name || 'All'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {conditions.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Condition</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChipRow}>
                    {[{ name: '' }, ...conditions].map(c => (
                      <TouchableOpacity
                        key={c.name || 'all'}
                        style={[styles.filterChip, conditionFilter === c.name && styles.filterChipActive]}
                        onPress={() => setConditionFilter(c.name)}
                      >
                        <Text style={[styles.filterChipText, conditionFilter === c.name && styles.filterChipTextActive]}>{c.name || 'All'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.lowStockRow} onPress={() => setLowStockOnly(v => !v)}>
              <View style={[styles.checkbox, lowStockOnly && styles.checkboxActive]}>
                {lowStockOnly && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.filterLabel}>Low stock only</Text>
            </TouchableOpacity>

            <View style={styles.filterBtnRow}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => { setStatusFilter(''); setSupplierFilter(''); setConditionFilter(''); setLowStockOnly(false); }}
              >
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.filterApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import History Modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalBg}>
          <View style={styles.filterSheet}>
            <Text style={styles.filterSheetTitle}>Import History</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {batches.length === 0 ? (
                <Text style={styles.empty}>No import batches yet.</Text>
              ) : (
                batches.map(b => (
                  <View key={b.id} style={styles.batchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.batchRowCount}>{b.rowCount} product(s) imported</Text>
                      <Text style={styles.batchRowMeta}>{b.createdAt ? new Date(b.createdAt).toLocaleString() : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteBatch(b.id)}>
                      <Text style={styles.batchDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowHistory(false)}>
              <Text style={styles.filterApplyText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  filterBtn: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  filterBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  selectToggleBtn: { backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  selectToggleBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f6f9' },
  thumbImg: { width: 44, height: 44 },
  thumbPlaceholder: { width: 44, height: 44, backgroundColor: '#e5e7eb' },
  rowInfo: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  inactiveBadge: { backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  inactiveBadgeText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  pendingBadge: { backgroundColor: '#fffbeb' },
  pendingBadgeText: { color: '#92400e' },
  lowStockBadge: { backgroundColor: '#fee2e2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  lowStockBadgeText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#dc2626' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowCost: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  rowPrice: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  rowActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Multi-select
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: '#fff', fontSize: 13, fontFamily: 'Outfit-Bold' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EBF0F5', paddingHorizontal: 16, paddingVertical: 10 },
  selectionBarText: { flex: 1, fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  selectionClearText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  selectionDeleteBtn: { backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  selectionDeleteText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  // Filters modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  filterSheetTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 14 },
  filterLabel: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 8 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  filterChipTextActive: { color: '#fff' },
  lowStockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  filterBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  filterResetBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  filterResetText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  filterApplyBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  filterApplyText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  // Bulk ops
  bulkOpsBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  bulkOpsBtn: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  bulkOpsBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  batchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  batchRowCount: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  batchRowMeta: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  batchDeleteText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
});

export default ProductsScreen;
