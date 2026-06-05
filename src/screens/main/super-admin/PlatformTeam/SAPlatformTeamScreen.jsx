import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import {
  useSAPlatformTeam, useCreateSAPlatformMember,
  useUpdateSAPlatformMember, useDeleteSAPlatformMember,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SA_PERMISSIONS = [
  'sa_manage_vendors',
  'sa_manage_demo_requests',
  'sa_manage_team',
  'sa_manage_documents',
  'sa_view_activity_logs',
  'sa_manage_guides',
  'sa_manage_businesses',
  'sa_manage_packages',
  'sa_manage_roles',
  'sa_view_reports',
  'sa_manage_support',
  'sa_manage_legal',
];

const EMPTY_FORM = { name: '', email: '', password: '', permissions: [] };

const PermToggle = ({ perm, selected, onToggle }) => (
  <TouchableOpacity
    style={[styles.permChip, selected && styles.permChipActive]}
    onPress={() => onToggle(perm)}
    activeOpacity={0.7}
  >
    <Text style={[styles.permChipText, selected && styles.permChipTextActive]}>
      {perm.replace('sa_', '').replace(/_/g, ' ')}
    </Text>
  </TouchableOpacity>
);

export default function SAPlatformTeamScreen() {
  const { data: team = [], isLoading } = useSAPlatformTeam();
  const { mutateAsync: createMember, isPending: creating } = useCreateSAPlatformMember();
  const { mutateAsync: updateMember, isPending: updating } = useUpdateSAPlatformMember();
  const { mutateAsync: deleteMember, isPending: deleting } = useDeleteSAPlatformMember();

  const [modal, setModal]     = useState(null); // null | 'add' | 'edit'
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState(null);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = member => {
    setForm({ name: member.name, email: member.email, password: '', permissions: member.permissions ?? [] });
    setEditId(member.id);
    setModal('edit');
  };

  const togglePerm = perm => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      Alert.alert('Validation', 'Name and email are required.');
      return;
    }
    if (modal === 'add' && !form.password) {
      Alert.alert('Validation', 'Password is required for new members.');
      return;
    }
    try {
      if (modal === 'add') {
        await createMember(form);
      } else {
        await updateMember({ id: editId, ...form, password: form.password || undefined });
      }
      setModal(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    }
  };

  const handleDelete = member => {
    Alert.alert(
      'Remove Team Member',
      `Remove ${member.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try { await deleteMember(member.id); }
            catch (e) { Alert.alert('Error', e?.message ?? 'Failed to remove'); }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Platform Team</Text>
          <Text style={styles.subtitle}>Manage team members and their access</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : team.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No team members yet</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.8}>
            <Text style={styles.emptyAddText}>Add Team Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {team.map(member => (
            <View key={member.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(member.name ?? 'T')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <View style={styles.permWrap}>
                    {(member.permissions ?? []).slice(0, 3).map(p => (
                      <View key={p} style={styles.permTag}>
                        <Text style={styles.permTagText}>{p.replace('sa_', '').replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                    {(member.permissions ?? []).length > 3 && (
                      <Text style={styles.permMore}>+{member.permissions.length - 3} more</Text>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(member)} activeOpacity={0.7}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDelete(member)}
                    disabled={deleting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.delBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>
              {modal === 'add' ? 'Add Team Member' : 'Edit Team Member'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Full name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholder="email@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{modal === 'add' ? 'Password *' : 'Password (leave blank to keep)'}</Text>
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={v => setForm(f => ({ ...f, password: v }))}
                placeholder={modal === 'add' ? 'Set password' : 'New password (optional)'}
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Permissions</Text>
              <View style={styles.permGrid}>
                {SA_PERMISSIONS.map(p => (
                  <PermToggle
                    key={p}
                    perm={p}
                    selected={form.permissions.includes(p)}
                    onToggle={togglePerm}
                  />
                ))}
              </View>
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
          </ScrollView>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  emptyAddBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  emptyAddText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.primary },
  memberName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  memberEmail: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  permWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  permTag: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  permTagText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#1e40af', textTransform: 'capitalize' },
  permMore: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  actions: { gap: 6, alignItems: 'flex-end' },
  editBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  delBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fee2e2' },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  permChipActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  permChipText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'capitalize' },
  permChipTextActive: { color: colors.primary },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8, paddingBottom: 20 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
