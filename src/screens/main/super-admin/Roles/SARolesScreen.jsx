import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, ScrollView, Switch,
} from 'react-native';
import { useSARoles, useCreateSARole, useUpdateSARole, useDeleteSARole } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SA_PERMISSIONS = [
  { code: 'manage_businesses',    label: 'Manage Businesses',    category: 'Businesses' },
  { code: 'view_businesses',      label: 'View Businesses',      category: 'Businesses' },
  { code: 'manage_plans',         label: 'Manage Plans',         category: 'Plans' },
  { code: 'view_plans',           label: 'View Plans',           category: 'Plans' },
  { code: 'manage_roles',         label: 'Manage Roles',         category: 'Roles' },
  { code: 'manage_subscriptions', label: 'Manage Subscriptions', category: 'Subscriptions' },
  { code: 'view_reports',         label: 'View Reports',         category: 'Reporting' },
  { code: 'manage_platform',      label: 'Manage Platform',      category: 'Platform' },
  { code: 'manage_legal',         label: 'Manage Legal Pages',   category: 'Platform' },
];

const byCategory = SA_PERMISSIONS.reduce((acc, p) => {
  if (!acc[p.category]) acc[p.category] = [];
  acc[p.category].push(p);
  return acc;
}, {});

const SARolesScreen = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState({});

  const { data: raw = [], isLoading, refetch, isError } = useSARoles();
  const roles = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateSARole();
  const { mutateAsync: update, isPending: updating } = useUpdateSARole();
  const { mutate: remove } = useDeleteSARole();

  const filtered = useMemo(() => {
    if (!search) return roles;
    const q = search.toLowerCase();
    return roles.filter(r => (r.name ?? '').toLowerCase().includes(q));
  }, [roles, search]);

  const togglePerm = code => setSelectedPerms(p => ({ ...p, [code]: !p[code] }));

  const openCreate = () => {
    setEditing(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPerms({});
    setShowModal(true);
  };

  const openEdit = role => {
    setEditing(role);
    setRoleName(role.name ?? '');
    setRoleDesc(role.description ?? '');
    const perms = role.permissions ?? [];
    setSelectedPerms(Object.fromEntries(perms.map(c => [c, true])));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!roleName.trim()) { Alert.alert('Error', 'Role name is required'); return; }
    const permissions = Object.keys(selectedPerms).filter(k => selectedPerms[k]);
    try {
      if (editing) {
        await update({ id: editing.id, name: roleName.trim(), description: roleDesc.trim() || undefined, permissions });
      } else {
        await create({ name: roleName.trim(), description: roleDesc.trim() || undefined, permissions });
      }
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  const handleDelete = role => {
    if (role.isSystemRole) { Alert.alert('Info', 'System roles cannot be deleted'); return; }
    Alert.alert('Delete Role', `Delete "${role.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(role.id) },
    ]);
  };

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search roles…"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isError && (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit-Medium', color: '#ef4444', textAlign: 'center' }}>
            Roles feature unavailable — backend error.{'\n'}Please contact your system administrator.
          </Text>
          <TouchableOpacity onPress={refetch} style={{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontFamily: 'Outfit-SemiBold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={filtered}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const perms = item.permissions ?? [];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={styles.icon}>
                    <Text style={styles.iconText}>{(item.name ?? 'R')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.roleName}>{item.name}</Text>
                      {item.isSystemRole && (
                        <View style={styles.sysBadge}>
                          <Text style={styles.sysBadgeText}>System</Text>
                        </View>
                      )}
                    </View>
                    {item.description ? (
                      <Text style={styles.roleDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{perms.length}</Text>
                    <Text style={styles.countLabel}>perms</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    {!item.isSystemRole && (
                      <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                        <Text style={styles.delBtnText}>Del</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {isExpanded && perms.length > 0 && (
                <View style={styles.permWrap}>
                  {perms.map((p, i) => {
                    const match = SA_PERMISSIONS.find(x => x.code === p);
                    return (
                      <View key={i} style={styles.permTag}>
                        <Text style={styles.permText}>{match?.label ?? p.replace(/_/g, ' ')}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No roles found.</Text>}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
      />

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Role' : 'New Role'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>Role Name *</Text>
                <TextInput
                  style={styles.input}
                  value={roleName}
                  onChangeText={setRoleName}
                  placeholder="e.g. Support Manager"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={roleDesc}
                  onChangeText={setRoleDesc}
                  placeholder="Optional description"
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              <Text style={styles.permsLabel}>Permissions</Text>
              {Object.entries(byCategory).map(([cat, catPerms]) => (
                <View key={cat}>
                  <Text style={styles.catLabel}>{cat}</Text>
                  {catPerms.map(p => (
                    <View key={p.code} style={styles.permRow}>
                      <Text style={styles.permLabel}>{p.label}</Text>
                      <Switch
                        value={!!selectedPerms[p.code]}
                        onValueChange={() => togglePerm(p.code)}
                        trackColor={{ false: '#D0D5DD', true: colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}
                </View>
              ))}

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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  iconText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  roleName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  sysBadge: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  sysBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#7C3AED' },
  roleDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  countBadge: { backgroundColor: '#EBF0F5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 44 },
  countText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  countLabel: { fontSize: 9, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: 5 },
  editBtn: { backgroundColor: '#EBF0FF', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  editBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  delBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  permWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#f0f0f0' },
  permTag: { backgroundColor: '#EBF5FB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  permText: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#1a6e9f', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#6b7280', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#111827', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  permsLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6, marginTop: 4 },
  catLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  permLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6b7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SARolesScreen;
