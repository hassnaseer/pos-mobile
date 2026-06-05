import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', description: '' };

const DepartmentsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_DEPARTMENTS);

  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateDepartment();
  const { mutateAsync: update, isPending: updating } = useUpdateDepartment();
  const { mutate: remove } = useDeleteDepartment();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const saving = creating || updating;

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = item => {
    setEditing(item);
    setForm({ name: item.name ?? '', description: item.description ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Department name is required'); return; }
    try {
      if (editing) {
        await update({ id: editing.id, ...form });
      } else {
        await create(form);
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditing(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Save failed');
    }
  };

  const handleDelete = item => Alert.alert(
    'Delete Department',
    `Delete "${item.name}"? This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          remove(item.id, {
            onError: e => Alert.alert('Error', e?.message ?? 'Delete failed'),
          }),
      },
    ]
  );

  return (
    <View style={styles.root}>
      {canManage && (
        <View style={styles.topBar}>
          <Text style={styles.heading}>Departments</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🏢</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.employeeCount != null && (
                <Text style={styles.rowMeta}>{item.employeeCount} member{item.employeeCount !== 1 ? 's' : ''}</Text>
              )}
            </View>
            {canManage && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && (
          <Text style={styles.empty}>
            {canManage ? 'No departments yet. Tap + Add to create one.' : 'No departments found.'}
          </Text>
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Department' : 'Add Department'}</Text>
            {[
              { key: 'name',        label: 'Department Name *' },
              { key: 'description', label: 'Description' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={set(f.key)}
                  placeholder={f.label.replace(' *', '')}
                  placeholderTextColor="#999"
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:     { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:      { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  iconWrap:    { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:        { fontSize: 20 },
  rowInfo:     { flex: 1 },
  rowName:     { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  rowDesc:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280' },
  rowMeta:     { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 4 },
  actions:     { flexDirection: 'row', gap: 6 },
  editBtn:     { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#2563EB' },
  deleteBtn:   { backgroundColor: '#FEE2E2', borderRadius: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:{ fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:       { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40, paddingHorizontal: 24 },
  // Modal
  modalBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:       { marginBottom: 12 },
  label:       { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:       { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:     { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:    { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default DepartmentsScreen;
