import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const EMPTY = { name: '', subject: '', body: '' };

export default function EmailTemplatesScreen() {
  const { data: raw = [], isLoading, isFetching, refetch } = useEmailTemplates();
  const { mutateAsync: create, isPending: creating } = useCreateEmailTemplate();
  const { mutateAsync: update, isPending: updating } = useUpdateEmailTemplate();
  const { mutateAsync: remove } = useDeleteEmailTemplate();

  const templates = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setEditId(null); setForm(EMPTY); setModal(true); };
  const openEdit = t => { setEditId(t.id); setForm({ name: t.name ?? '', subject: t.subject ?? '', body: t.body ?? '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      Alert.alert('Required', 'Name, subject and body are all required'); return;
    }
    try {
      if (editId) await update({ id: editId, ...form });
      else await create(form);
      setModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save template');
    }
  };

  const handleDelete = t => {
    Alert.alert('Delete Template', `Remove "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(t.id).catch(() => Alert.alert('Error', 'Failed to delete')) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Email Templates</Text>
          <Text style={styles.sub}>Reusable templates for emailing leads & customers</Text>
        </View>
        <HeaderAddButton onPress={openAdd} label="Add" />
      </View>

      <FlatList
        data={templates}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{item.subject}</Text>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delText}>✕</Text></TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No templates yet.</Text>}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Template' : 'Add Template'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.field}><Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Welcome Email" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Subject *</Text>
                <TextInput style={styles.input} value={form.subject} onChangeText={set('subject')} placeholder="Email subject" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Body *</Text>
                <TextInput style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} value={form.body} onChangeText={set('body')} placeholder="Email body… you can use {{name}} placeholders" placeholderTextColor="#999" multiline /></View>
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  cardMeta: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '88%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
