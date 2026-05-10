import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { useStaff, useCreateStaff, useDeleteStaff, useCustomRoles } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const StaffScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_STAFF);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', customRoleId: '' });

  const { data: staff = [], isLoading, refetch } = useStaff();
  const { data: roles = [] } = useCustomRoles();
  const { mutateAsync: create, isPending } = useCreateStaff();
  const { mutate: remove } = useDeleteStaff();

  const members = Array.isArray(staff) ? staff : (staff?.data ?? []);

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.password) { Alert.alert('Error', 'Name, email, and password are required'); return; }
    try { await create(form); setShowModal(false); setForm({ fullName: '', email: '', password: '', customRoleId: '' }); }
    catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create staff'); }
  };

  const handleDelete = s => Alert.alert('Remove Staff', `Remove "${s.fullName}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => remove(s.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Staff</Text>
        {canManage && <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}><Text style={styles.addBtnText}>+ Add Staff</Text></TouchableOpacity>}
      </View>

      <FlatList
        data={members}
        keyExtractor={s => String(s.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              {item.profileImg
                ? <Image source={{ uri: item.profileImg }} style={styles.avatarImg} />
                : <Text style={styles.avatarText}>{(item.fullName ?? item.name ?? 'S')[0].toUpperCase()}</Text>}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.fullName ?? item.name}</Text>
              <Text style={styles.rowEmail}>{item.email}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.isActive !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[styles.statusText, { color: item.isActive !== false ? '#16a34a' : '#dc2626' }]}>{item.isActive !== false ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text style={styles.roleBadge}>{item.customRoleName ?? item.role ?? 'staff'}</Text>
            {canManage && (
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No staff members yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Staff Member</Text>
            {[{ key: 'fullName', label: 'Full Name' }, { key: 'email', label: 'Email', keyboard: 'email-address' }, { key: 'password', label: 'Password', secure: true }].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label} <Text style={{ color: colors.warning }}>*</Text></Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} keyboardType={f.keyboard ?? 'default'} secureTextEntry={!!f.secure} autoCapitalize="none" />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isPending}>
                {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add</Text>}
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
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowEmail: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  statusBadge: { marginTop: 4, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  roleBadge: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, textTransform: 'capitalize' },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default StaffScreen;
