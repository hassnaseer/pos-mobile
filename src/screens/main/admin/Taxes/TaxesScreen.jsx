import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Switch, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useTaxes, useCreateTax, useUpdateTax, useDeleteTax } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { name: '', percentage: '', isActive: true };

export default function TaxesScreen() {
  const perms = usePermissions();
  if (!perms.can(PERMISSIONS.MANAGE_TAXES)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noAccess}>You don't have permission to manage taxes.</Text>
      </View>
    );
  }

  const { data: taxes = [], isLoading } = useTaxes();
  const { mutateAsync: createTax, isPending: creating } = useCreateTax();
  const { mutateAsync: updateTax, isPending: updating } = useUpdateTax();
  const { mutateAsync: deleteTax, isPending: deleting } = useDeleteTax();

  const [modal, setModal]   = useState(null); // null | 'add' | 'edit'
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = tax => {
    setForm({ name: tax.name ?? '', percentage: String(tax.percentage ?? ''), isActive: tax.isActive ?? true });
    setEditId(tax.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Tax name is required.');
      return;
    }
    const pct = parseFloat(form.percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Validation', 'Percentage must be a number between 0 and 100.');
      return;
    }
    try {
      const payload = { name: form.name.trim(), percentage: pct, isActive: form.isActive };
      if (modal === 'add') {
        await createTax(payload);
      } else {
        await updateTax({ id: editId, ...payload });
      }
      setModal(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to save tax');
    }
  };

  const handleDelete = tax => {
    Alert.alert(
      'Delete Tax',
      `Delete "${tax.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteTax(tax.id); }
            catch (e) { Alert.alert('Error', e?.message ?? 'Failed to delete tax'); }
          },
        },
      ],
    );
  };

  const handleToggleActive = async tax => {
    try {
      await updateTax({ id: tax.id, isActive: !tax.isActive });
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to update tax');
    }
  };

  const renderItem = ({ item: tax }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taxName}>{tax.name}</Text>
          <Text style={styles.taxPct}>{tax.percentage}%</Text>
        </View>
        <View style={styles.cardRight}>
          <Switch
            value={tax.isActive}
            onValueChange={() => handleToggleActive(tax)}
            trackColor={{ false: '#d1d5db', true: colors.primary + '80' }}
            thumbColor={tax.isActive ? colors.primary : '#9ca3af'}
          />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(tax)} activeOpacity={0.7}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.delBtn}
              onPress={() => handleDelete(tax)}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Text style={styles.delBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: tax.isActive ? '#d1fae5' : '#f3f4f6' }]}>
        <Text style={[styles.statusText, { color: tax.isActive ? '#065f46' : '#6b7280' }]}>
          {tax.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Taxes</Text>
          <Text style={styles.subtitle}>Manage tax rates applied to sales</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add Tax</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={taxes}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No taxes configured yet</Text>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal === 'add' ? 'Add Tax' : 'Edit Tax'}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. VAT, GST, Sales Tax"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Percentage *</Text>
              <TextInput
                style={styles.input}
                value={form.percentage}
                onChangeText={v => setForm(f => ({ ...f, percentage: v }))}
                placeholder="e.g. 10"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                trackColor={{ false: '#d1d5db', true: colors.primary + '80' }}
                thumbColor={form.isActive ? colors.primary : '#9ca3af'}
              />
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noAccess: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#6b7280', textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  taxName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  taxPct: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.primary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardActions: { flexDirection: 'row', gap: 6 },
  editBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  delBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fee2e2' },
  delBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
