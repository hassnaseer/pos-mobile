import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import {
  useMiscCharges, useCreateMiscCharge, useUpdateMiscCharge, useDeleteMiscCharge,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', amount: '', type: 'fixed' };

const MiscChargesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_MISC);

  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data: raw = [], isLoading, refetch } = useMiscCharges();
  const { mutateAsync: create, isPending: creating } = useCreateMiscCharge();
  const { mutateAsync: update, isPending: updating } = useUpdateMiscCharge();
  const { mutate: remove } = useDeleteMiscCharge();

  const charges = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const filtered = charges.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  const isSaving = creating || updating;

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = item => {
    setEditItem(item);
    setForm({ name: item.name ?? '', amount: String(item.amount ?? ''), type: item.type ?? 'fixed' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt)) return Alert.alert('Validation', 'Enter a valid amount');
    try {
      const payload = { name: form.name.trim(), amount: amt, type: form.type };
      if (editItem) {
        await update({ id: editItem.id, ...payload });
      } else {
        await create(payload);
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : (err?.message ?? 'Failed to save'));
    }
  };

  const handleDelete = item => {
    Alert.alert('Delete Charge', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search charges…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {item.type === 'percentage' ? `${item.amount}%` : `${item.amount} (fixed)`}
                {item.isActive === false ? '  · Inactive' : ''}
              </Text>
            </View>
            {canManage && (
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.delText}>Del</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No misc charges yet.</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editItem ? 'Edit Charge' : 'Add Misc Charge'}</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Delivery Fee"
              placeholderTextColor="#999"
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={v => setForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {['fixed', 'percentage'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                  onPress={() => setForm(p => ({ ...p, type: t }))}
                >
                  <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editItem ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:         { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search:         { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', fontFamily: 'Outfit-Regular', color: '#111' },
  addBtn:         { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText:     { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  list:           { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  empty:          { textAlign: 'center', color: '#999', marginTop: 40, fontFamily: 'Outfit-Regular' },
  row:            { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowInfo:        { flex: 1 },
  rowName:        { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:         { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 2 },
  rowActions:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editBtn:        { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editText:       { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:         { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText:        { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  overlay:        { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  sheetTitle:     { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  label:          { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6, marginTop: 12 },
  input:          { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111' },
  typeRow:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  typeBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center' },
  typeBtnActive:  { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  typeBtnText:    { fontFamily: 'Outfit-Medium', fontSize: 14, color: '#666' },
  typeBtnTextActive: { color: colors.primary },
  sheetActions:   { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 8, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center' },
  cancelText:     { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#666' },
  saveBtn:        { flex: 1, paddingVertical: 13, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:       { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default MiscChargesScreen;
