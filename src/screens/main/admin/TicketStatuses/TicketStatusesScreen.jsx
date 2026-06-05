import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Switch, ScrollView,
} from 'react-native';
import {
  useTicketStatuses, useCreateTicketStatus,
  useUpdateTicketStatus, useDeleteTicketStatus,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4',
];

const EMPTY_FORM = { name: '', color: '#6B7280', isDefault: false, sortOrder: 0 };

const ColorDot = ({ color, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.colorDot,
      { backgroundColor: color },
      selected && styles.colorDotSelected,
    ]}
  />
);

const TicketStatusesScreen = () => {
  const perms    = usePermissions();
  const canManage = perms.can(PERMISSIONS.CREATE_TICKETS);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [search, setSearch]       = useState('');

  const { data: raw = [], isLoading, refetch } = useTicketStatuses();
  const { mutateAsync: create, isPending: creating } = useCreateTicketStatus();
  const { mutateAsync: update, isPending: updating } = useUpdateTicketStatus();
  const { mutate: remove } = useDeleteTicketStatus();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const filtered = search
    ? items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : items;
  const saving = creating || updating;

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = item => {
    setEditing(item);
    setForm({
      name:      item.name ?? '',
      color:     item.color ?? '#6B7280',
      isDefault: item.isDefault ?? false,
      sortOrder: item.sortOrder ?? 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Status name is required'); return; }
    try {
      const payload = {
        name:      form.name.trim(),
        color:     form.color,
        isDefault: form.isDefault,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (editing) {
        await update({ id: editing.id, ...payload });
      } else {
        await create(payload);
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Save failed');
    }
  };

  const handleDelete = item => Alert.alert(
    'Delete Status',
    `Delete "${item.name}"?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          remove(item.id, {
            onError: e => Alert.alert('Error', e?.message ?? 'Delete failed'),
          }),
      },
    ]
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search statuses…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.colorStripe, { backgroundColor: item.color ?? '#6B7280' }]} />
            <View style={styles.rowInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              {item.sortOrder != null && (
                <Text style={styles.rowMeta}>Order: {item.sortOrder}</Text>
              )}
            </View>
            {canManage && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                {!item.isDefault && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && (
          <Text style={styles.empty}>
            {canManage ? 'No statuses yet. Tap + Add to create one.' : 'No ticket statuses found.'}
          </Text>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Status' : 'Add Status'}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Status Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
                placeholder="e.g. In Progress"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Colour</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(c => (
                  <ColorDot
                    key={c}
                    color={c}
                    selected={form.color === c}
                    onPress={() => setForm(p => ({ ...p, color: c }))}
                  />
                ))}
              </View>
              <View style={styles.customColorRow}>
                <View style={[styles.previewDot, { backgroundColor: form.color }]} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={form.color}
                  onChangeText={v => setForm(p => ({ ...p, color: v }))}
                  placeholder="#6B7280"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sort Order</Text>
              <TextInput
                style={styles.input}
                value={String(form.sortOrder)}
                onChangeText={v => setForm(p => ({ ...p, sortOrder: v }))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Set as Default</Text>
              <Switch
                value={form.isDefault}
                onValueChange={v => setForm(p => ({ ...p, isDefault: v }))}
                trackColor={{ false: '#D0D5DD', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:      { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', borderWidth: 1, borderColor: '#E5E7EB' },
  addBtn:      { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText:  { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  colorStripe: { width: 5, alignSelf: 'stretch' },
  rowInfo:     { flex: 1, padding: 14 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName:     { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  defaultBadge:{ backgroundColor: colors.primary + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  defaultBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  rowMeta:     { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 3 },
  actions:     { flexDirection: 'row', gap: 6, paddingRight: 12 },
  editBtn:     { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#2563EB' },
  deleteBtn:   { backgroundColor: '#FEE2E2', borderRadius: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:{ fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:       { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Modal
  modalBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:       { marginBottom: 14 },
  label:       { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  colorRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  colorDot:    { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#111' },
  customColorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewDot:  { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#D0D5DD', flexShrink: 0 },
  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalActions:{ flexDirection: 'row', gap: 12 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:     { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:    { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default TicketStatusesScreen;
