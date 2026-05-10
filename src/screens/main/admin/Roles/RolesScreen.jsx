import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert, Switch, ScrollView, RefreshControl } from 'react-native';
import { useCustomRoles, useCreateCustomRole, useDeleteCustomRole } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

// Must exactly match web frontend Roles.tsx ALL_PERMISSIONS
const ALL_PERMS = [
  { code: 'pos_sales',          label: 'POS / Sales',         category: 'Sales' },
  { code: 'view_orders',        label: 'View Orders',         category: 'Sales' },
  { code: 'process_refunds',    label: 'Process Refunds',     category: 'Sales' },
  { code: 'manage_products',    label: 'Manage Products',     category: 'Inventory' },
  { code: 'view_products',      label: 'View Products',       category: 'Inventory' },
  { code: 'manage_categories',  label: 'Manage Categories',   category: 'Inventory' },
  { code: 'create_tickets',     label: 'Create Tickets',      category: 'Tickets' },
  { code: 'update_tickets',     label: 'Update Tickets',      category: 'Tickets' },
  { code: 'manage_customers',   label: 'Manage Customers',    category: 'Customers' },
  { code: 'view_reports',       label: 'Reports & Analytics', category: 'Reporting' },
];

const RolesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_STAFF);
  const [showModal, setShowModal] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selected, setSelected] = useState({});

  const { data: roles = [], isLoading, refetch } = useCustomRoles();
  const { mutateAsync: create, isPending } = useCreateCustomRole();
  const { mutate: remove } = useDeleteCustomRole();

  const togglePerm = code => setSelected(p => ({ ...p, [code]: !p[code] }));

  const handleSave = async () => {
    if (!roleName.trim()) { Alert.alert('Error', 'Role name is required'); return; }
    const codes = Object.keys(selected).filter(k => selected[k]);
    try {
      await create({ name: roleName.trim(), permissionCodes: codes });
      setShowModal(false);
      setRoleName('');
      setSelected({});
    } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete Role', `Delete "${r.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const allRoles = Array.isArray(roles) ? roles : (roles?.data ?? []);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Custom Roles</Text>
        {canManage && <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}><Text style={styles.addBtnText}>+ New Role</Text></TouchableOpacity>}
      </View>

      <FlatList
        data={allRoles}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>{(item.permissionCodes ?? []).length} permissions</Text>
            </View>
            {canManage && <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delText}>Delete</Text></TouchableOpacity>}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom roles yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Role</Text>
            <TextInput style={[styles.input, { marginBottom: 16 }]} placeholder="Role name" placeholderTextColor="#999" value={roleName} onChangeText={setRoleName} />
            <Text style={styles.permsLabel}>Permissions</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {ALL_PERMS.map(p => (
                <View key={p.code} style={styles.permRow}>
                  <Text style={styles.permLabel}>{p.label}</Text>
                  <Switch value={!!selected[p.code]} onValueChange={() => togglePerm(p.code)} trackColor={{ false: '#D0D5DD', true: colors.primary }} thumbColor="#fff" />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isPending}>
                {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create</Text>}
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
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 16, gap: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  permsLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 10 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  permLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RolesScreen;
