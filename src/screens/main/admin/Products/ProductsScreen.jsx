import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, Image, ScrollView,
} from 'react-native';
import {
  useProducts, useCategories, useSuppliers, useDeviceConditions,
  useCreateProduct, useUpdateProduct, useDeleteProduct, useTaxes,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', price: '', cost: '', minSellingPrice: '',
  stock: '', lowStockThreshold: '', categoryId: '', supplierId: '',
  description: '', condition: '', physicalLocation: '',
  warrantyDays: '', taxId: '',
};

const InlineSelect = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>{selected?.name ?? 'Select…'}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={styles.pickerOptionText}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.pickerOption} onPress={() => { onSelect(opt.id); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const ProductsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PRODUCTS);
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: rawProducts = [], isLoading, refetch } = useProducts();
  const { data: rawCats = [] } = useCategories();
  const { data: rawSuppliers = [] } = useSuppliers();
  const { data: rawConditions = [] } = useDeviceConditions();
  const { data: rawTaxes = [] } = useTaxes();
  const { mutateAsync: create, isPending: creating } = useCreateProduct();
  const { mutateAsync: update, isPending: updating } = useUpdateProduct();
  const { mutateAsync: remove } = useDeleteProduct();

  const products   = Array.isArray(rawProducts)  ? rawProducts  : (rawProducts?.data  ?? []);
  const categories = Array.isArray(rawCats)      ? rawCats      : (rawCats?.data      ?? []);
  const suppliers  = Array.isArray(rawSuppliers) ? rawSuppliers : (rawSuppliers?.data ?? []);
  const conditions = Array.isArray(rawConditions)? rawConditions: (rawConditions?.data?? []);
  const taxes      = Array.isArray(rawTaxes)     ? rawTaxes     : (rawTaxes?.data     ?? []);

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({
      name:             p.name ?? '',
      sku:              p.sku ?? '',
      barcode:          p.barcode ?? '',
      price:            p.price != null ? String(p.price) : '',
      cost:             p.cost != null ? String(p.cost) : '',
      minSellingPrice:  p.minSellingPrice != null ? String(p.minSellingPrice) : '',
      stock:            p.stock != null ? String(p.stock) : '',
      lowStockThreshold:p.lowStockThreshold != null ? String(p.lowStockThreshold) : '',
      categoryId:       p.categoryId ?? '',
      supplierId:       p.supplierId ?? '',
      description:      p.description ?? '',
      condition:        p.condition ?? '',
      physicalLocation: p.physicalLocation ?? '',
      warrantyDays:     p.warrantyDays != null ? String(p.warrantyDays) : '',
      taxId:            p.taxId ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.price) { Alert.alert('Error', 'Price is required'); return; }
    const payload = {
      name:             form.name,
      sku:              form.sku || undefined,
      barcode:          form.barcode || undefined,
      price:            parseFloat(form.price),
      cost:             form.cost ? parseFloat(form.cost) : undefined,
      minSellingPrice:  form.minSellingPrice ? parseFloat(form.minSellingPrice) : undefined,
      stock:            form.stock ? parseInt(form.stock) : 0,
      lowStockThreshold:form.lowStockThreshold ? parseInt(form.lowStockThreshold) : 0,
      categoryId:       form.categoryId || undefined,
      supplierId:       form.supplierId || undefined,
      description:      form.description || undefined,
      condition:        form.condition || undefined,
      physicalLocation: form.physicalLocation || undefined,
      warrantyDays:     form.warrantyDays ? parseInt(form.warrantyDays) : undefined,
      taxId:            form.taxId || undefined,
    };
    try {
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  const handleDelete = p => Alert.alert('Delete Product', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);

  const F = ({ label, fkey, placeholder, keyboard }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#999" value={form[fkey]} onChangeText={set(fkey)} keyboardType={keyboard ?? 'default'} />
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search products…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        {canManage && <TouchableOpacity style={styles.addBtn} onPress={openCreate}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.thumb}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} resizeMode="cover" />
                : <View style={styles.thumbPlaceholder} />}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
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
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delBtnText}>Del</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No products found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.fullModalBg}>
          <View style={styles.fullModalCard}>
            <View style={styles.formHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Product' : 'New Product'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formSection}>Basic Info</Text>
              <F label="Product Name *" fkey="name" placeholder="Product name" />
              <F label="SKU" fkey="sku" placeholder="e.g. PRD-001" />
              <F label="Barcode" fkey="barcode" placeholder="Scan or enter barcode" />

              <InlineSelect label="Category" value={form.categoryId} options={categories} onSelect={set('categoryId')} />
              <InlineSelect label="Supplier" value={form.supplierId} options={suppliers} onSelect={set('supplierId')} />
              <InlineSelect label="Condition" value={form.condition} options={conditions.map(c => ({ id: c.name, name: c.name }))} onSelect={set('condition')} />
              <InlineSelect
                label="Tax"
                value={form.taxId}
                options={taxes.filter(t => t.isActive).map(t => ({ id: String(t.id), name: `${t.name} (${t.percentage}%)` }))}
                onSelect={set('taxId')}
              />

              <F label="Physical Location" fkey="physicalLocation" placeholder="e.g. Shelf A3" />

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  value={form.description}
                  onChangeText={set('description')}
                  placeholder="Optional product description"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <Text style={styles.formSection}>Pricing</Text>
              <F label="Sale Price *" fkey="price" placeholder="0.00" keyboard="decimal-pad" />
              <F label="Cost Price" fkey="cost" placeholder="0.00" keyboard="decimal-pad" />
              <F label="Min Selling Price" fkey="minSellingPrice" placeholder="0.00" keyboard="decimal-pad" />

              <Text style={styles.formSection}>Stock</Text>
              <F label="Stock Quantity" fkey="stock" placeholder="0" keyboard="number-pad" />
              <F label="Low Stock Alert" fkey="lowStockThreshold" placeholder="0" keyboard="number-pad" />
              <F label="Warranty (Days)" fkey="warrantyDays" placeholder="e.g. 365" keyboard="number-pad" />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                  {creating || updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f6f9' },
  thumbImg: { width: 44, height: 44 },
  thumbPlaceholder: { width: 44, height: 44, backgroundColor: '#e5e7eb' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowCost: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  rowPrice: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  rowActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  formSection: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chevron: { fontSize: 12, color: colors.secondary },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 320, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', fontSize: 15, color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default ProductsScreen;
