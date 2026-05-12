import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

// ── Inline select picker ──────────────────────────────────────────────────────
const InlineSelect = ({ label, value, options, onSelect, placeholder = 'None (root category)' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>{selected?.name ?? placeholder}</Text>
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
                  <Text style={[styles.pickerOptionText, value === opt.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>
                    {opt._depth > 0 ? '  '.repeat(opt._depth) + '↳ ' : ''}{opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Depth-annotated list for parent picker ─────────────────────────────────
  const flatWithDepth = useMemo(() => {
    const result = [];
    const walk = (nodes, depth) => nodes.forEach(n => {
      result.push({ ...n, _depth: depth });
      walk(childrenOf(n.id), depth + 1);
    });
    walk(roots, 0);
    return result;
  }, [allCats]);

  const [expanded, setExpanded] = useState({});

  // ── Add modal state ────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState('');
  const [mainName, setMainName] = useState('');
  const [mainDesc, setMainDesc] = useState('');
  const [subNames, setSubNames] = useState(['']);

  // ── Edit modal state ───────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editParentId, setEditParentId] = useState('');

  const isSaving = creating || updating;

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const openAdd = (parentId = '') => {
    setAddParentId(parentId);
    setMainName('');
    setMainDesc('');
    setSubNames(['']);
    setAddOpen(true);
  };

  const openEdit = cat => {
    setEditTarget(cat);
    setEditName(cat.name ?? '');
    setEditDesc(cat.description ?? '');
    setEditParentId(cat.parentId ?? '');
    setEditOpen(true);
  };

  // ── Sub-name helpers ───────────────────────────────────────────────────────
  const updateSubName = (i, val) => setSubNames(p => p.map((s, idx) => idx === i ? val : s));
  const addSubRow = () => setSubNames(p => [...p, '']);
  const removeSubRow = i => setSubNames(p => p.length === 1 ? [''] : p.filter((_, idx) => idx !== i));

  // ── Save: Add ─────────────────────────────────────────────────────────────
  const handleSaveAdd = async () => {
    if (!mainName.trim()) { Alert.alert('Error', 'Category name is required'); return; }
    try {
      const res = await create({ name: mainName.trim(), description: mainDesc.trim() || undefined, parentId: addParentId || undefined });
      const newId = res?.data?.id ?? res?.id;
      if (newId) {
        const filled = subNames.map(s => s.trim()).filter(Boolean);
        await Promise.all(filled.map(name => create({ name, parentId: newId })));
      }
      setAddOpen(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  // ── Save: Edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editName.trim() || !editTarget) { Alert.alert('Error', 'Name is required'); return; }
    try {
      await update({ id: editTarget.id, name: editName.trim(), description: editDesc.trim() || undefined, parentId: editParentId || undefined });
      setEditOpen(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  const handleDelete = cat => {
    const hasChildren = allCats.some(c => c.parentId === cat.id);
    const msg = hasChildren
      ? `"${cat.name}" has subcategories. Deleting it will unparent them. Continue?`
      : `Delete "${cat.name}"?`;
    Alert.alert('Delete', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(cat.id) },
    ]);
  };

  // Exclude descendants when editing (can't set parent to own child)
  const editableParents = useMemo(() => {
    if (!editTarget) return flatWithDepth;
    const descendants = new Set();
    const collect = id => {
      descendants.add(id);
      allCats.filter(c => c.parentId === id).forEach(c => collect(c.id));
    };
    collect(editTarget.id);
    return flatWithDepth.filter(c => !descendants.has(c.id) && c.id !== editTarget.id);
  }, [editTarget, flatWithDepth, allCats]);

  const renderCategory = (cat, depth = 0) => {
    const children = childrenOf(cat.id);
    const isExpanded = expanded[cat.id];
    return (
      <View key={cat.id}>
        <View style={[styles.row, { marginLeft: 12 + depth * 16 }]}>
          <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(cat.id)} disabled={children.length === 0}>
            <Text style={styles.expandIcon}>{children.length > 0 ? (isExpanded ? '▾' : '▸') : '  '}</Text>
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
        <Text style={styles.heading}>Categories ({allCats.length})</Text>
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

      {/* ── Add Modal ── */}
      <Modal visible={addOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {addParentId ? `Add Sub-category` : 'Add Category'}
            </Text>
            {addParentId ? (
              <View style={styles.parentChip}>
                <Text style={styles.parentChipText}>
                  Under: {allCats.find(c => c.id === addParentId)?.name}
                </Text>
              </View>
            ) : null}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Main category ── */}
              {!addParentId && <Text style={styles.sectionLabel}>MAIN CATEGORY</Text>}
              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={addParentId ? 'Sub-category name' : 'e.g. Electronics'}
                  placeholderTextColor="#999"
                  value={mainName}
                  onChangeText={setMainName}
                  autoFocus
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Optional description"
                  placeholderTextColor="#999"
                  value={mainDesc}
                  onChangeText={setMainDesc}
                  multiline
                />
              </View>

              {/* ── Sub-categories (only when adding root) ── */}
              {!addParentId && (
                <View>
                  <Text style={styles.sectionLabel}>SUB-CATEGORIES <Text style={{ fontFamily: 'Outfit-Regular', textTransform: 'none' }}>(optional)</Text></Text>
                  {subNames.map((s, i) => (
                    <View key={i} style={styles.subRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`Sub-category ${i + 1}`}
                        placeholderTextColor="#999"
                        value={s}
                        onChangeText={val => updateSubName(i, val)}
                      />
                      <TouchableOpacity style={styles.subRemoveBtn} onPress={() => removeSubRow(i)}>
                        <Text style={styles.subRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addSubBtn} onPress={addSubRow}>
                    <Text style={styles.addSubBtnText}>+ Add Sub-category</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAdd} disabled={isSaving || !mainName.trim()}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Category name"
                  placeholderTextColor="#999"
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Optional description"
                  placeholderTextColor="#999"
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                />
              </View>
              <InlineSelect
                label="Parent Category"
                value={editParentId}
                options={editableParents}
                onSelect={setEditParentId}
                placeholder="None (root category)"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={isSaving || !editName.trim()}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  rowActions: { flexDirection: 'row', gap: 5 },
  subBtn: { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, borderWidth: 1, borderColor: '#86efac' },
  subBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  editText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  delText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 14 },
  parentChip: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#86efac' },
  parentChipText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#16a34a' },
  sectionLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, flex: 1 },
  chevron: { fontSize: 12, color: colors.secondary },

  // Sub-category rows in add form
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subRemoveBtn: { padding: 8 },
  subRemoveText: { fontSize: 16, color: '#9ca3af' },
  addSubBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 16 },
  addSubBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  // Picker
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
});

export default CategoriesScreen;
