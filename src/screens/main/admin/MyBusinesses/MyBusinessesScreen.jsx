import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useAdminBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_COLORS = {
  Active:  { bg: '#D1FAE5', text: '#065F46' },
  Trial:   { bg: '#DBEAFE', text: '#1E40AF' },
  Expired: { bg: '#FEE2E2', text: '#991B1B' },
  Blocked: { bg: '#F3F4F6', text: '#6B7280' },
};

const emptyForm = { name: '', phone: '', country: '' };

const MyBusinessesScreen = () => {
  const { data, isLoading, refetch } = useAdminBranches();
  const { mutateAsync: create, isPending: creating } = useCreateBranch();
  const { mutateAsync: update, isPending: updating } = useUpdateBranch();
  const { mutate: remove } = useDeleteBranch();

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const mainBusiness = data?.main ?? null;
  const branches = data?.branches ?? [];
  const allItems = [
    ...(mainBusiness ? [{ ...mainBusiness, isMain: true }] : []),
    ...branches.map(b => ({ ...b, isMain: false })),
  ];

  const openAdd = () => { setForm(emptyForm); setModalMode('add'); };
  const openEdit = item => { setEditTarget(item); setForm({ name: item.name, phone: item.phone ?? '', country: item.country ?? '' }); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Branch name is required'); return; }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        await create(form);
      } else {
        await update({ id: editTarget.id, ...form });
      }
      closeModal();
      refetch();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = item => {
    if (item.isMain) { Alert.alert('Cannot Delete', 'Main business cannot be deleted.'); return; }
    Alert.alert('Delete Branch', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  };

  const renderItem = ({ item }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.Active;
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.cardAvatar}>
            {item.logoUrl
              ? <Image source={{ uri: item.logoUrl }} style={styles.cardAvatarImg} resizeMode="contain" />
              : <Text style={styles.cardAvatarText}>{(item.name ?? 'B')[0].toUpperCase()}</Text>}
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.isMain && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
            </View>
            {item.phone ? <Text style={styles.cardSub}>{item.phone}</Text> : null}
            {item.country ? <Text style={styles.cardSub}>{item.country}</Text> : null}
            {item.status ? (
              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {!item.isMain && (
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.delBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>My Businesses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Branch</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>No businesses found.</Text>}
        />
      )}

      <Modal visible={!!modalMode} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add Branch' : 'Edit Branch'}</Text>
            <ScrollView>
              {[
                { key: 'name', label: 'Branch Name *', placeholder: 'Enter name' },
                { key: 'phone', label: 'Phone', placeholder: 'Optional' },
                { key: 'country', label: 'Country', placeholder: 'Optional' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#999"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  cardAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  mainBadge: { backgroundColor: '#EFF6FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  mainBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#3B82F6' },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cardActions: { gap: 6, alignItems: 'flex-end' },
  editBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  delBtn: { borderWidth: 1, borderColor: '#F87171', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  delBtnText: { color: '#EF4444', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default MyBusinessesScreen;
