import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import {
  usePropertyOptions, useCreatePropertyOption, useDeletePropertyOption,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const LISTS = [
  { key: 'property_type', title: 'Property Type', hint: 'e.g. Apartment, House, Plot' },
  { key: 'purpose',       title: 'Purpose',       hint: 'e.g. Sale, Rent' },
  { key: 'furnishing',    title: 'Furnishing',    hint: 'e.g. Furnished, Unfurnished' },
];

const OptionList = ({ listType, title, hint }) => {
  const { data: raw = [], isLoading } = usePropertyOptions(listType);
  const { mutateAsync: create, isPending: creating } = useCreatePropertyOption();
  const { mutateAsync: remove } = useDeletePropertyOption();

  const options = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');

  const openAdd = () => { setName(''); setModal(true); };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    try {
      await create({ listType, name: name.trim() });
      setModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to add option');
    }
  };

  const handleDelete = opt => {
    Alert.alert('Delete', `Remove "${opt.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(opt.id).catch(() => Alert.alert('Error', 'Failed to delete')) },
    ]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
        <HeaderAddButton onPress={openAdd} label="Add" />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
      ) : options.length === 0 ? (
        <Text style={styles.empty}>None configured yet.</Text>
      ) : (
        options.map(opt => (
          <View key={opt.id} style={styles.row}>
            <Text style={styles.rowName}>{opt.name}</Text>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(opt)}><Text style={styles.delText}>✕</Text></TouchableOpacity>
          </View>
        ))
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add {title}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={hint} placeholderTextColor="#999" autoFocus />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function PropertyOptionsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} tintColor={colors.primary} />}
    >
      <Text style={styles.pageTitle}>Property Options</Text>
      <Text style={styles.pageSub}>Manage the dropdowns used when adding properties</Text>
      {LISTS.map(l => <OptionList key={l.key} listType={l.key} title={l.title} hint={l.hint} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  pageTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  pageSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2, marginBottom: 12 },
  section: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  sectionHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  rowName: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { color: '#9ca3af', fontFamily: 'Outfit-Regular', fontSize: 13, paddingVertical: 6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
