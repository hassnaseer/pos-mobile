import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import {
  useSABusinessCategories, useCreateSABusinessCategory,
  useUpdateSABusinessCategory, useDeleteSABusinessCategory,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY = { name: '', description: '' };

const SABusinessCategoriesScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSABusinessCategories();
  const categories = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateSABusinessCategory();
  const { mutateAsync: update, isPending: updating } = useUpdateSABusinessCategory();
  const { mutateAsync: remove, isPending: deleting } = useDeleteSABusinessCategory();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = item => { setEditing(item); setForm({ name: item.name ?? '', description: item.description ?? '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editing) await update({ id: editing.id, ...form });
      else await create(form);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = item =>
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await remove(item.id); } catch { Alert.alert('Error', 'Delete failed'); } } },
    ]);

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Category</Text>
      </TouchableOpacity>

      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No categories yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{(item.name ?? 'C')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)} disabled={deleting}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Category' : 'New Category'}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Category name" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 72 }]} value={form.description} onChangeText={set('description')} placeholder="Optional description" placeholderTextColor="#999" multiline />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  addBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary + '18', borderRadius: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fee2e2', borderRadius: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SABusinessCategoriesScreen;
