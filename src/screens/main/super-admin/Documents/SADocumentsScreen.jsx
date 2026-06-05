import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Linking,
} from 'react-native';
import {
  useSADocuments, useCreateSADocument,
  useUpdateSADocument, useDeleteSADocument,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', url: '' };

const getFileIcon = url => {
  if (!url) return '📄';
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  return '📄';
};

export default function SADocumentsScreen() {
  const { data: documents = [], isLoading } = useSADocuments();
  const { mutateAsync: createDoc, isPending: creating }  = useCreateSADocument();
  const { mutateAsync: updateDoc, isPending: updating }  = useUpdateSADocument();
  const { mutateAsync: deleteDoc, isPending: deleting }  = useDeleteSADocument();

  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null); // null | 'add' | 'edit'
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState(null);

  const filtered = documents.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = doc => {
    setForm({ name: doc.name, url: doc.url ?? '' });
    setEditId(doc.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert('Validation', 'Document name is required.');
      return;
    }
    try {
      if (modal === 'add') {
        await createDoc(form);
      } else {
        await updateDoc({ id: editId, ...form });
      }
      setModal(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    }
  };

  const handleDelete = doc => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteDoc(doc.id); }
            catch (e) { Alert.alert('Error', e?.message ?? 'Failed to delete'); }
          },
        },
      ],
    );
  };

  const handleOpen = async url => {
    if (!url) return;
    try { await Linking.openURL(url); }
    catch { Alert.alert('Error', 'Cannot open this URL'); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Platform-wide documents</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search documents…"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {search ? 'No documents match your search' : 'No documents yet'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {filtered.map(doc => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.fileIcon}>{getFileIcon(doc.url)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  {doc.url && (
                    <TouchableOpacity onPress={() => handleOpen(doc.url)} activeOpacity={0.7}>
                      <Text style={styles.docUrl} numberOfLines={1}>{doc.url}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(doc)} activeOpacity={0.7}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDelete(doc)}
                    disabled={deleting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.delBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {doc.url && (
                <TouchableOpacity style={styles.openBtn} onPress={() => handleOpen(doc.url)} activeOpacity={0.7}>
                  <Text style={styles.openBtnText}>Open Document</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal === 'add' ? 'Add Document' : 'Edit Document'}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Document name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>URL</Text>
              <TextInput
                style={styles.input}
                value={form.url}
                onChangeText={v => setForm(f => ({ ...f, url: v }))}
                placeholder="https://…"
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Paste a direct link to a PDF, image, or document.</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={creating || updating}
                activeOpacity={0.8}
              >
                {(creating || updating)
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { fontSize: 28 },
  docName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  docUrl: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  editBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  delBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fee2e2' },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  openBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', alignItems: 'center' },
  openBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#0284c7' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  hint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
