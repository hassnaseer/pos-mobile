import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useVendorListings, useCreateVendorListing, useUpdateVendorListing, useDeleteVendorListing } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import { BASE_URL } from '../../../../services/api/globalApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', price: '', stock: '', description: '', imageUrl: '' };
const STATUS_COLOR = { active: '#10B981', inactive: '#9CA3AF', pending: '#F59E0B' };

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
  const { fmt } = useCurrency();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgUploading, setImgUploading] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useVendorListings();
  const { mutateAsync: create, isPending: creating } = useCreateVendorListing();
  const { mutateAsync: update, isPending: updating } = useUpdateVendorListing();
  const { mutate: remove } = useDeleteVendorListing();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = l => {
    setEditing(l);
    setForm({ name: l.name ?? '', price: String(l.price ?? ''), stock: String(l.stock ?? ''), description: l.description ?? '', imageUrl: l.imageUrl ?? '' });
    setShowModal(true);
  };

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async (res) => {
      if (res.didCancel || !res.assets?.length) return;
      const asset = res.assets[0];
      setImgUploading(true);
      try {
        const key = await uploadImage(asset);
        setForm(p => ({ ...p, imageUrl: key }));
      } catch (e) {
        Alert.alert('Upload failed', e?.message ?? 'Try again');
      } finally {
        setImgUploading(false);
      }
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { Alert.alert('Error', 'Enter a valid price'); return; }
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 };
      editing ? await update({ id: editing.id, ...payload }) : await create(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleDelete = l => Alert.alert('Delete Listing', `Remove "${l.name}"?`, [
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
          <View style={styles.row}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.rowImg} resizeMode="cover" />
            ) : (
              <View style={styles.rowImgPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
            )}
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>{fmt(item.price ?? 0)}  ·  Stock: {item.stock ?? 0}</Text>
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'active'}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.delText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No listings yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Listing' : 'New Listing'}</Text>

            {/* Image upload */}
            <TouchableOpacity style={styles.imgPicker} onPress={handlePickImage} disabled={imgUploading}>
              {imgUploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : form.imageUrl ? (
                <Image source={{ uri: form.imageUrl }} style={styles.imgPreview} resizeMode="cover" />
              ) : (
                <View style={styles.imgPlaceholder}>
                  <Text style={styles.imgPlaceholderIcon}>📷</Text>
                  <Text style={styles.imgPlaceholderText}>Add Image</Text>
                </View>
              )}
            </TouchableOpacity>
            {form.imageUrl ? (
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, imageUrl: '' }))} style={styles.removeImg}>
                <Text style={styles.removeImgText}>Remove image</Text>
              </TouchableOpacity>
            ) : null}

            {[
              { key: 'name',        label: 'Product Name *' },
              { key: 'price',       label: 'Price *', keyboard: 'decimal-pad' },
              { key: 'stock',       label: 'Stock Quantity', keyboard: 'numeric' },
              { key: 'description', label: 'Description' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={set(f.key)} placeholder={f.label.replace(' *', '')} placeholderTextColor="#999" keyboardType={f.keyboard ?? 'default'} />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'List'}</Text>}
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
  row:              { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowImg:           { width: 48, height: 48, borderRadius: 8 },
  rowImgPlaceholder:{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  rowInfo:          { flex: 1 },
  rowName:          { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:           { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:         { alignItems: 'flex-end', gap: 6 },
  badge:            { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:        { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:          { flexDirection: 'row', gap: 6 },
  editBtn:          { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:         { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:           { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:          { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:            { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle:       { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  imgPicker:        { width: '100%', height: 140, borderRadius: 12, borderWidth: 1.5, borderColor: '#D0D5DD', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 4, overflow: 'hidden' },
  imgPreview:       { width: '100%', height: '100%', borderRadius: 12 },
  imgPlaceholder:   { alignItems: 'center', gap: 6 },
  imgPlaceholderIcon:{ fontSize: 28 },
  imgPlaceholderText:{ fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  removeImg:        { alignSelf: 'center', marginBottom: 12 },
  removeImgText:    { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#EF4444' },
  field:            { marginBottom: 12 },
  label:            { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:            { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:       { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:          { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:         { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default VendorListingsScreen;
