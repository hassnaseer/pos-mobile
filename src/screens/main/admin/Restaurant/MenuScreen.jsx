import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const CATEGORIES = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Sides', 'Special'];

const useMenu = () =>
  useQuery({
    queryKey: ['restaurant-menu'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/restaurant/menu');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
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

const EMPTY = { name: '', description: '', category: '', price: '', isAvailable: true };

const MenuScreen = () => {
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { fmt } = useCurrency();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const { data: raw = [], isLoading, refetch } = useMenu();
  const allItems = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const items = filterCat ? allItems.filter(i => i.category === filterCat) : allItems;

  const { mutateAsync: create, isPending: creating } = useCreateMenuItem();
  const { mutateAsync: update, isPending: updating } = useUpdateMenuItem();
  const { mutate: remove } = useDeleteMenuItem();

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = item => {
    setEditing(item);
    setForm({ name: item.name ?? '', description: item.description ?? '', category: item.category ?? '', price: String(item.price ?? ''), isAvailable: item.isAvailable ?? true });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const payload = { ...form, price: parseFloat(form.price) || 0 };
    try {
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = item => Alert.alert('Delete Item', `Delete "${item.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {['', ...CATEGORIES].map(c => (
          <TouchableOpacity key={c || 'all'} style={[styles.chip, filterCat === c && styles.chipActive]} onPress={() => setFilterCat(c)}>
            <Text style={[styles.chipText, filterCat === c && styles.chipTextActive]}>{c || 'All'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No menu items yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowPrice}>{fmt(item.price)}</Text>
              </View>
              {item.category ? <Text style={styles.rowCat}>{item.category}</Text> : null}
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
              <View style={styles.availRow}>
                <View style={[styles.availDot, { backgroundColor: item.isAvailable ? '#22c55e' : '#9ca3af' }]} />
                <Text style={styles.availText}>{item.isAvailable ? 'Available' : 'Unavailable'}</Text>
              </View>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Item' : 'New Menu Item'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Name" placeholderTextColor="#999" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 60 }]} value={form.description} onChangeText={set('description')} placeholder="Description" placeholderTextColor="#999" multiline />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chips}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                      <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Price</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={set('price')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
              <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={styles.label}>Available</Text>
                <Switch value={form.isAvailable} onValueChange={v => setForm(f => ({ ...f, isAvailable: v }))} trackColor={{ true: colors.primary }} />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 54 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 4 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 10 },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, flex: 1 },
  rowPrice: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  rowCat: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary, marginTop: 2 },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary },
  rowActions: { gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default MenuScreen;
