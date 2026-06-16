import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert, Switch, ScrollView, RefreshControl } from 'react-native';
import { useCustomRoles, useCreateCustomRole, useUpdateCustomRole, useDeleteCustomRole } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

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
  const [editing, setEditing] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [selected, setSelected] = useState({});

  const { data: roles = [], isLoading, refetch } = useCustomRoles();
  const { mutateAsync: create, isPending: creating } = useCreateCustomRole();
  const { mutateAsync: update, isPending: updating } = useUpdateCustomRole();
  const { mutate: remove } = useDeleteCustomRole();

  const togglePerm = code => setSelected(p => ({ ...p, [code]: !p[code] }));

  const openCreate = () => {
    setEditing(null);
    setRoleName('');
    setSelected({});
    setShowModal(true);
  };

  const openEdit = role => {
    setEditing(role);
    setRoleName(role.name ?? '');
    const codes = role.permissionCodes ?? [];
    setSelected(Object.fromEntries(codes.map(c => [c, true])));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!roleName.trim()) { Alert.alert('Error', 'Role name is required'); return; }
    const codes = Object.keys(selected).filter(k => selected[k]);
    try {
      if (editing) {
        await update({ id: editing.id, name: roleName.trim(), permissionCodes: codes });
      } else {
        await create({ name: roleName.trim(), permissionCodes: codes });
      }
      setShowModal(false);
      setEditing(null);
      setRoleName('');
      setSelected({});
    } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete Role', `Delete "${r.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const allRoles = Array.isArray(roles) ? roles : (roles?.data ?? []);
  const isSaving = creating || updating;

  const byCategory = ALL_PERMS.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Custom Roles</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ New Role</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={allRoles}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const permsCount = (item.permissionCodes ?? []).length;
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{permsCount} permission{permsCount !== 1 ? 's' : ''}</Text>
                {item.permissionCodes?.length > 0 && (
                  <View style={styles.tagRow}>
                    {item.permissionCodes.slice(0, 3).map(c => {
                      const p = ALL_PERMS.find(x => x.code === c);
                      return (
                        <View key={c} style={styles.tag}>
                          <Text style={styles.tagText}>{p?.label ?? c}</Text>
                        </View>
                      );
                    })}
                    {item.permissionCodes.length > 3 && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>+{item.permissionCodes.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {canManage && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom roles yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Role' : 'New Role'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              placeholder="Role name"
              placeholderTextColor="#999"
              value={roleName}
              onChangeText={setRoleName}
            />
            <Text style={styles.permsLabel}>Permissions</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {Object.entries(byCategory).map(([cat, catPerms]) => (
                <View key={cat}>
                  <Text style={styles.catLabel}>{cat}</Text>
                  {catPerms.map(p => (
                    <View key={p.code} style={styles.permRow}>
                      <Text style={styles.permLabel}>{p.label}</Text>
                      <Switch
                        value={!!selected[p.code]}
                        onValueChange={() => togglePerm(p.code)}
                        trackColor={{ false: '#D0D5DD', true: colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editing ? 'Update' : 'Create'}</Text>}
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
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 16, gap: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: colors.primary },
  actions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  editBtn: { backgroundColor: '#EBF0FF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#6b7280', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  permsLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  catLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  permLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6b7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RolesScreen;
