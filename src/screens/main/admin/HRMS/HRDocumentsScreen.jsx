import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick, types, isCancel } from '@react-native-documents/picker'
import {
  useHRDocuments, useCreateHRDocument, useDeleteHRDocument,
  useDocumentCategories, useCreateDocumentCategory,
} from '../../../../services/api/posApi';
import { BASE_URL } from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import QuickCreateModal from '../../../../components/QuickCreateModal/QuickCreateModal';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const EMPTY_FORM = { title: '', category: '', description: '' };

const uploadFile = async (file) => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: file.uri, type: file.type ?? 'application/octet-stream', name: file.name ?? 'document' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? '';
};

const HRDocumentsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_DOCUMENTS);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [catQuickCreateOpen, setCatQuickCreateOpen] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useHRDocuments();
  const { data: rawCats = [] } = useDocumentCategories();
  const { mutateAsync: create, isPending: creating } = useCreateHRDocument();
  const { mutate: remove } = useDeleteHRDocument();
  const { mutateAsync: createCategory } = useCreateDocumentCategory();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const categories = Array.isArray(rawCats) ? rawCats : (rawCats?.data ?? []);
  const categoryOptions = categories.map(c => ({ id: c.name ?? c, name: c.name ?? c }));

  const openAdd = () => { setForm(EMPTY_FORM); setFile(null); setShowModal(true); };

const handlePickFile = async () => {
  try {
    const [picked] = await pick({
      type: [types.allFiles],
    });

    setFile(picked);

  } catch (e) {
    if (!isCancel(e)) {
      Alert.alert('Error', 'Failed to pick file');
    }
  }
};

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!file) { Alert.alert('Error', 'Please select a file'); return; }
    setUploading(true);
    try {
      const fileUrl = await uploadFile(file);
      await create({ ...form, fileUrl });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setFile(null);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Save failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = d => Alert.alert('Delete Document', `Delete "${d.title}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(d.id) },
  ]);

  const handleAddCategory = async values => {
    const created = await createCategory({ name: values.name });
    const cat = created?.data ?? created;
    setForm(p => ({ ...p, category: cat?.name ?? values.name }));
    return cat;
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>HR Documents</Text>
        {canManage && (
          <HeaderAddButton onPress={openAdd} label="Upload" />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>📄</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.title}</Text>
              {item.category ? <Text style={styles.rowSub}>{item.category}</Text> : null}
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
              {item.createdAt ? <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text> : null}
            </View>
            {canManage && (
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No documents uploaded yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upload Document</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={set('title')} placeholder="Document title" placeholderTextColor="#999" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>File *</Text>
              <TouchableOpacity style={styles.filePickBtn} onPress={handlePickFile}>
                <Text style={file ? styles.filePickedText : styles.filePickPlaceholder} numberOfLines={1}>
                  {file ? file.name : 'Tap to select a file'}
                </Text>
              </TouchableOpacity>
            </View>

            <InlinePicker
              label="Category"
              value={form.category}
              options={categoryOptions}
              keyField="id"
              labelField="name"
              onSelect={set('category')}
              onAddNew={() => setCatQuickCreateOpen(true)}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={form.description} onChangeText={set('description')} placeholder="Brief description…" placeholderTextColor="#999" />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || uploading}>
                {(creating || uploading) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <QuickCreateModal
        visible={catQuickCreateOpen}
        title="Add New Category"
        fields={[{ key: 'name', label: 'Category Name *', placeholder: 'e.g. Onboarding' }]}
        onClose={() => setCatQuickCreateOpen(false)}
        onCreate={handleAddCategory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:          { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:     { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  iconText:     { fontSize: 20 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  filePickBtn:  { borderWidth: 1.5, borderColor: '#D0D5DD', borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14, alignItems: 'center' },
  filePickPlaceholder: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#999' },
  filePickedText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default HRDocumentsScreen;
