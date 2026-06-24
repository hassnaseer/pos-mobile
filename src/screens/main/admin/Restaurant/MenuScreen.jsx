import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const useMenuItems = (category = '') =>
  useQuery({
    queryKey: ['restaurant-menu', category],
    queryFn: async () => {
      const p = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await apiClient.get(`/admin/restaurant/menu${p}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

const useMenuCategories = () =>
  useQuery({
    queryKey: ['restaurant-menu-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/restaurant/menu/categories');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

const useCreateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/restaurant/menu', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu'] }),
  });
};

const useUpdateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/restaurant/menu/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu'] }),
  });
};

const useDeleteMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/restaurant/menu/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu'] }),
  });
};

const EMPTY_FORM = { name: '', description: '', price: '', category: '', isAvailable: true };

const MenuScreen = () => {
  const { fmt } = useCurrency();
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useMenuItems(catFilter);
  const { data: catRaw = [] } = useMenuCategories();
  const { mutateAsync: create, isPending: creating } = useCreateMenuItem();
  const { mutateAsync: update, isPending: updating } = useUpdateMenuItem();
  const { mutate: remove } = useDeleteMenuItem();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const cats = Array.isArray(catRaw) ? catRaw : (catRaw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      name: r.name ?? '',
      description: r.description ?? '',
      price: String(r.price ?? ''),
      category: r.category ?? '',
      isAvailable: r.isAvailable ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Item name is required'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { Alert.alert('Error', 'Enter a valid price'); return; }
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      editing ? await update({ id: editing.id, ...payload }) : await create(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete', `Delete "${r.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Menu</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {cats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterWrap}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.chip, catFilter === '' && styles.chipActive]}
            onPress={() => setCatFilter('')}
          >
            <Text style={[styles.chipText, catFilter === '' && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {cats.map(c => {
            const name = typeof c === 'string' ? c : (c.name ?? String(c));
            return (
              <TouchableOpacity
                key={name}
                style={[styles.chip, catFilter === name && styles.chipActive]}
                onPress={() => setCatFilter(name)}
              >
                <Text style={[styles.chipText, catFilter === name && styles.chipTextActive]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No menu items found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.price}>{fmt(item.price ?? 0)}</Text>
            </View>
            {item.category && <Text style={styles.category}>{item.category}</Text>}
            {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
            <View style={styles.footer}>
              <View style={[styles.availBadge, { backgroundColor: item.isAvailable ? '#dcfce7' : '#f3f4f6' }]}>
                <Text style={[styles.availText, { color: item.isAvailable ? '#16a34a' : '#6b7280' }]}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Menu Item' : 'New Menu Item'}</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Item name" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={set('price')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput style={styles.input} value={form.category} onChangeText={set('category')} placeholder="Category" placeholderTextColor="#999" />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 70 }]} value={form.description} onChangeText={set('description')} placeholder="Description" placeholderTextColor="#999" multiline />

            <TouchableOpacity
              style={[styles.availToggle, form.isAvailable && styles.availToggleActive]}
              onPress={() => set('isAvailable')(!form.isAvailable)}
            >
              <Text style={[styles.availToggleText, form.isAvailable && { color: '#fff' }]}>
                {form.isAvailable ? 'Available' : 'Mark as Available'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1a1a1a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  price: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },
  category: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#888', marginBottom: 4 },
  desc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  availBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  availText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  deleteBtn: { borderWidth: 1, borderColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  availToggle: { marginTop: 12, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  availToggleActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  availToggleText: { fontFamily: 'Outfit-SemiBold', color: '#666' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default MenuScreen;
