import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', description: '', parentId: '' };

const CategoriesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_CATEGORIES);

  const { data: raw = [], isLoading, refetch } = useCategories();
  const { mutateAsync: create, isPending: creating } = useCreateCategory();
  const { mutateAsync: update, isPending: updating } = useUpdateCategory();
  const { mutate: remove } = useDeleteCategory();

  const allCats = useMemo(() => {
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list;
  }, [raw]);

  const roots = useMemo(() => allCats.filter(c => !c.parentId), [allCats]);
  const childrenOf = id => allCats.filter(c => c.parentId === id);

  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = (parentId = '') => {
    setEditing(null);
    setForm({ name: '', description: '', parentId });
    setShowModal(true);
  };

  const openEdit = cat => {
    setEditing(cat);
    setForm({ name: cat.name ?? '', description: cat.description ?? '', parentId: cat.parentId ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Category name is required'); return; }
    const payload = { name: form.name.trim(), description: form.description || undefined, parentId: form.parentId || undefined };
    try {
      if (editing) {
        await update({ id: editing.id, ...payload });
      } else {
        await create(payload);
      }
      setShowModal(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  const handleDelete = cat => Alert.alert('Delete', `Delete "${cat.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(cat.id) },
  ]);

  const isSaving = creating || updating;

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const renderCategory = (cat, depth = 0) => {
    const children = childrenOf(cat.id);
    const isExpanded = expanded[cat.id];

    return (
      <View key={cat.id}>
        <View style={[styles.row, { marginLeft: 12 + depth * 16 }]}>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => toggleExpand(cat.id)}
            disabled={children.length === 0}
          >
            <Text style={styles.expandIcon}>
              {children.length > 0 ? (isExpanded ? '▾' : '▸') : '  '}
            </Text>
          </TouchableOpacity>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{cat.name}</Text>
            {cat.description ? <Text style={styles.rowDesc}>{cat.description}</Text> : null}
            <Text style={styles.rowCount}>
              {(cat.productCount ?? 0)} products{children.length > 0 ? ` · ${children.length} subcategories` : ''}
            </Text>
          </View>
          {canManage && (
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.subBtn} onPress={() => openAdd(cat.id)}>
                <Text style={styles.subBtnText}>+ Sub</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(cat)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(cat)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isExpanded && children.map(child => renderCategory(child, depth + 1))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Categories</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd()}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={roots}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => renderCategory(item)}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No categories yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 4 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit Category' : form.parentId ? 'New Subcategory' : 'New Category'}
            </Text>

            {!editing && form.parentId ? (
              <View style={styles.parentLabel}>
                <Text style={styles.parentLabelText}>
                  Under: {allCats.find(c => c.id === form.parentId)?.name}
                </Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Category name"
                placeholderTextColor="#999"
                value={form.name}
                onChangeText={set('name')}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Optional description"
                placeholderTextColor="#999"
                value={form.description}
                onChangeText={set('description')}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginRight: 12, marginTop: 8, borderRadius: 10, padding: 10, gap: 6 },
  expandBtn: { width: 24, alignItems: 'center', justifyContent: 'center' },
  expandIcon: { fontSize: 14, color: colors.secondary },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 1 },
  rowCount: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  subBtn: { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#86efac' },
  subBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  editText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  delText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  parentLabel: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#86efac' },
  parentLabelText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#16a34a' },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default CategoriesScreen;
