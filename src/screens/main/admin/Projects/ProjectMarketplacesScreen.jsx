import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import {
  useProjectMarketplaces, useCreateProjectMarketplace, useUpdateProjectMarketplace, useDeleteProjectMarketplace,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
const EMPTY = { name: '', description: '', color: COLORS[0] };

export default function ProjectMarketplacesScreen() {
  const { data: raw = [], isLoading, isFetching, refetch } = useProjectMarketplaces();
  const { mutateAsync: create, isPending: creating } = useCreateProjectMarketplace();
  const { mutateAsync: update, isPending: updating } = useUpdateProjectMarketplace();
  const { mutate: remove } = useDeleteProjectMarketplace();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = m => { setEditing(m); setForm({ name: m.name, description: m.description ?? '', color: m.color ?? COLORS[0] }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editing) await update({ id: editing.id, ...form });
      else await create(form);
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save marketplace');
    }
  };

  const handleDelete = m => Alert.alert('Delete Marketplace', `Delete "${m.name}"? Projects using this marketplace will keep their existing value.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(m.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.heading}>Marketplaces</Text>
          <Text style={styles.subHeading}>Manage your sales channels — TikTok, Daraz, Amazon, etc.</Text>
        </View>
        <HeaderAddButton onPress={openAdd} label="Add" />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No marketplaces yet. Add your first sales channel.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: item.color ?? COLORS[0] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.description ? <Text style={styles.rowSub}>{item.description}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delText}>Del</Text></TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Marketplace' : 'Add Marketplace'}</Text>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. TikTok Shop" placeholderTextColor="#999" />
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={form.description} onChangeText={set('description')} placeholder="Optional note" placeholderTextColor="#999" />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => set('color')(c)} style={[styles.colorSwatch, { backgroundColor: c }, form.color === c && styles.colorSwatchActive]} />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  topBarText: { flex: 1 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  loader: { marginTop: 30 },
  list: { padding: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#1e3a5f' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
