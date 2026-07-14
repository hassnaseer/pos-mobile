import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, Image, ScrollView, Switch,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useVendorListings, useCreateVendorListing, useUpdateVendorListing, useDeleteVendorListing } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import { BASE_URL } from '../../../../services/api/globalApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../../theme/colors';

const EMPTY_FORM = {
  productName: '', description: '', basePrice: '', moq: '1', unit: 'piece',
  category: '', imageUrl: '', isActive: true, deliveryCharge: '', deliveryPaymentMethods: '',
};
const PAYMENT_METHODS = [
  { key: '', label: 'Not set' },
  { key: 'cod', label: 'Cash on Delivery' },
  { key: 'bank', label: 'Direct Bank / Wallet' },
  { key: 'both', label: 'Both' },
];

function calcTierPrice(base, discountPct) {
  return (base * (1 - discountPct / 100)).toFixed(2);
}

const uploadImage = async (asset) => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'listing.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Upload failed');
  return json.data?.key ?? json.data?.url ?? '';
};

const VendorListingsScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorSeller();
  const { fmt, currency } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useVendorListings();
  const { mutateAsync: create, isPending: creating } = useCreateVendorListing();
  const { mutateAsync: update, isPending: updating } = useUpdateVendorListing();
  const { mutate: remove } = useDeleteVendorListing();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setTiers([]); setShowModal(true); };
  const openEdit = l => {
    setEditing(l);
    setForm({
      productName: l.productName ?? '', description: l.description ?? '', basePrice: String(l.basePrice ?? ''),
      moq: String(l.moq ?? '1'), unit: l.unit ?? 'piece', category: l.category ?? '', imageUrl: l.imageUrl ?? '',
      isActive: l.isActive ?? true, deliveryCharge: l.deliveryCharge != null ? String(l.deliveryCharge) : '',
      deliveryPaymentMethods: l.deliveryPaymentMethods ?? '',
    });
    setTiers((l.priceTiers ?? []).map(t => ({ minQty: t.minQty, discountPct: t.discountPct })));
    setShowModal(true);
  };

  const addTier = () => setTiers(p => [...p, { minQty: 10, discountPct: 10 }]);
  const removeTier = i => setTiers(p => p.filter((_, idx) => idx !== i));
  const updateTier = (i, field, val) => setTiers(p => p.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async (res) => {
      if (res.didCancel || !res.assets?.length) return;
      const asset = res.assets[0];
      setImgUploading(true);
      try {
        const key = await uploadImage(asset);
        setForm(p => ({ ...p, imageUrl: key }));
      } catch (e) {
        Alert.alert('Upload failed', typeof e === 'string' ? e : 'Try again');
      } finally {
        setImgUploading(false);
      }
    });
  };

  const handleSave = async () => {
    if (!form.productName.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    const basePrice = parseFloat(form.basePrice);
    if (!basePrice || basePrice <= 0) { Alert.alert('Error', 'Base price must be greater than 0'); return; }
    const payload = {
      productName: form.productName, basePrice, moq: parseInt(form.moq, 10) || 1, unit: form.unit,
      isActive: form.isActive, description: form.description || undefined, category: form.category || undefined,
      imageUrl: form.imageUrl || undefined, priceTiers: tiers.map(t => ({ minQty: Number(t.minQty), discountPct: Number(t.discountPct) })),
      deliveryCharge: form.deliveryCharge ? parseFloat(form.deliveryCharge) : null,
      deliveryPaymentMethods: form.deliveryPaymentMethods || null,
    };
    try {
      editing ? await update({ id: editing.id, ...payload }) : await create(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Save failed'); }
  };

  const handleToggleActive = l => {
    update({ id: l.id, isActive: !l.isActive }).catch(() => Alert.alert('Error', 'Failed to update listing'));
  };

  const handleDelete = l => Alert.alert('Delete Listing', `Remove "${l.productName}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(l.id) },
  ]);

  if (!canAccess) {
    return <View style={styles.centered}><Text style={styles.noAccess}>No access to vendor listings.</Text></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>My Listings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ List</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.isActive && { opacity: 0.6 }]}>
            <View style={styles.rowTop}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.rowImg} resizeMode="cover" />
              ) : (
                <View style={styles.rowImgPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
              )}
              <View style={styles.rowInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.rowName}>{item.productName}</Text>
                  {item.category ? <Text style={styles.categoryTag}>{item.category}</Text> : null}
                </View>
                <Text style={styles.rowSub}>Base: {fmt(item.basePrice)} · MOQ: {item.moq} {item.unit}{(item.priceTiers ?? []).length > 0 ? ` · ${item.priceTiers.length} tier${item.priceTiers.length > 1 ? 's' : ''}` : ''}</Text>
              </View>
              <TouchableOpacity style={[styles.activeToggle, { backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6' }]} onPress={() => handleToggleActive(item)}>
                <Text style={[styles.activeToggleText, { color: item.isActive ? '#16a34a' : '#6b7280' }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Delete</Text>
              </TouchableOpacity>
              {(item.priceTiers ?? []).length > 0 && (
                <TouchableOpacity style={styles.tiersBtn} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <Text style={styles.tiersBtnText}>{expandedId === item.id ? '▲ Hide Tiers' : '▼ Show Tiers'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {expandedId === item.id && (item.priceTiers ?? []).length > 0 && (
              <View style={styles.tiersGrid}>
                {[...item.priceTiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => (
                  <View key={i} style={styles.tierChip}>
                    <Text style={styles.tierChipQty}>≥ {t.minQty} {item.unit}</Text>
                    <Text style={styles.tierChipPrice}>{fmt(Number(calcTierPrice(item.basePrice, t.discountPct)))} <Text style={styles.tierChipPct}>({t.discountPct}% off)</Text></Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No listings yet. Add your first product to the marketplace.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Listing' : 'New Listing'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.imgPicker} onPress={handlePickImage} disabled={imgUploading}>
                {imgUploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : form.imageUrl ? (
                  <Image source={{ uri: form.imageUrl }} style={styles.imgPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Text style={styles.imgPlaceholderIcon}>📷</Text>
                    <Text style={styles.imgPlaceholderText}>Add Image (optional)</Text>
                  </View>
                )}
              </TouchableOpacity>
              {form.imageUrl ? (
                <TouchableOpacity onPress={() => setForm(p => ({ ...p, imageUrl: '' }))} style={styles.removeImg}>
                  <Text style={styles.removeImgText}>Remove image</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.label}>Product Name *</Text>
              <TextInput style={styles.input} value={form.productName} onChangeText={set('productName')} placeholder="e.g. Wireless Earbuds" placeholderTextColor="#999" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Short product description…" placeholderTextColor="#999" multiline />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Base Price ({currency}) *</Text>
                  <TextInput style={styles.input} value={form.basePrice} onChangeText={set('basePrice')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>MOQ</Text>
                  <TextInput style={styles.input} value={form.moq} onChangeText={set('moq')} placeholder="1" placeholderTextColor="#999" keyboardType="number-pad" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput style={styles.input} value={form.unit} onChangeText={set('unit')} placeholder="piece, kg, box…" placeholderTextColor="#999" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput style={styles.input} value={form.category} onChangeText={set('category')} placeholder="Optional" placeholderTextColor="#999" />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active (visible in marketplace)</Text>
                <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }} thumbColor={form.isActive ? colors.primary : '#fff'} />
              </View>

              <Text style={styles.sectionTitle}>Delivery</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Delivery Charge ({currency})</Text>
                  <TextInput style={styles.input} value={form.deliveryCharge} onChangeText={set('deliveryCharge')} placeholder="0.00 — blank = free" placeholderTextColor="#999" keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.chips}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m.key} style={[styles.chip, form.deliveryPaymentMethods === m.key && styles.chipActive]} onPress={() => set('deliveryPaymentMethods')(m.key)}>
                    <Text style={[styles.chipText, form.deliveryPaymentMethods === m.key && styles.chipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Bulk Discount Tiers</Text>
              <Text style={styles.sectionSub}>Apply discounts when buyers order larger quantities</Text>
              {tiers.length === 0 && <Text style={styles.noTiersText}>No tiers — all quantities pay the base price.</Text>}
              {tiers.map((t, i) => (
                <View key={i} style={styles.tierRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierRowLabel}>Min. Qty</Text>
                    <TextInput style={styles.tierInput} keyboardType="number-pad" value={String(t.minQty)} onChangeText={v => updateTier(i, 'minQty', parseInt(v, 10) || 0)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierRowLabel}>Discount %</Text>
                    <TextInput style={styles.tierInput} keyboardType="decimal-pad" value={String(t.discountPct)} onChangeText={v => updateTier(i, 'discountPct', parseFloat(v) || 0)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierRowLabel}>Unit price</Text>
                    <Text style={styles.tierUnitPrice}>{fmt(Number(calcTierPrice(parseFloat(form.basePrice) || 0, t.discountPct)))}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeTier(i)}><Text style={{ color: '#ef4444', fontSize: 18 }}>✕</Text></TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTierBtn} onPress={addTier}>
                <Text style={styles.addTierBtnText}>+ Add Tier</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save Changes' : 'Create Listing'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#f4f6f9' },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:         { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:          { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:           { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:       { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:              { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  rowTop:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowImg:           { width: 48, height: 48, borderRadius: 8 },
  rowImgPlaceholder:{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  rowInfo:          { flex: 1 },
  rowName:          { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  categoryTag:      { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6b7280', backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  rowSub:           { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  activeToggle:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  activeToggleText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:          { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  editBtn:          { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText:         { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:           { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText:          { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  tiersBtn:         { paddingHorizontal: 10, paddingVertical: 5 },
  tiersBtnText:     { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  tiersGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 10 },
  tierChip:         { backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  tierChipQty:      { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  tierChipPrice:    { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111' },
  tierChipPct:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#16a34a' },
  empty:            { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40, paddingHorizontal: 24 },
  modalBg:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  modalTitle:       { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  imgPicker:        { width: '100%', height: 140, borderRadius: 12, borderWidth: 1.5, borderColor: '#D0D5DD', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 4, overflow: 'hidden' },
  imgPreview:       { width: '100%', height: '100%', borderRadius: 12 },
  imgPlaceholder:   { alignItems: 'center', gap: 6 },
  imgPlaceholderIcon:{ fontSize: 28 },
  imgPlaceholderText:{ fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  removeImg:        { alignSelf: 'center', marginBottom: 12 },
  removeImgText:    { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#EF4444' },
  label:            { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4, marginTop: 8 },
  input:            { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  switchRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  switchLabel:      { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', flex: 1, marginRight: 8 },
  sectionTitle:     { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111', marginTop: 16, borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 14 },
  sectionSub:       { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:             { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive:       { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:         { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive:   { color: '#fff' },
  noTiersText:      { fontSize: 12, fontFamily: 'Outfit-Regular', fontStyle: 'italic', color: '#9ca3af', marginBottom: 8 },
  tierRow:          { flexDirection: 'row', gap: 8, alignItems: 'flex-end', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 8 },
  tierRowLabel:     { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 4 },
  tierInput:        { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', backgroundColor: '#fff' },
  tierUnitPrice:     { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#15803d', paddingVertical: 7 },
  addTierBtn:       { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginBottom: 8 },
  addTierBtnText:   { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:       { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:          { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:         { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default VendorListingsScreen;
