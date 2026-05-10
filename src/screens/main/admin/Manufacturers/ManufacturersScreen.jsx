import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import {
  useManufacturers, useCreateManufacturer, useUpdateManufacturer, useDeleteManufacturer,
  useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_MFR = { name: '', description: '', country: '', website: '' };
const EMPTY_DEV = { name: '', model: '', description: '' };

// ─── Device sub-list ─────────────────────────────────────────────────────────

const DeviceList = ({ manufacturerId, canManage }) => {
  const { data: raw = [], isLoading } = useDevices(manufacturerId);
  const devices = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateDevice();
  const { mutateAsync: update, isPending: updating } = useUpdateDevice();
  const { mutate: remove } = useDeleteDevice();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_DEV);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = () => { setEditing(null); setForm(EMPTY_DEV); setModal(true); };
  const openEdit = d => { setEditing(d); setForm({ name: d.name ?? '', model: d.model ?? '', description: d.description ?? '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Device name is required'); return; }
    try {
      if (editing) {
        await update({ deviceId: editing.id, manufacturerId, ...form });
      } else {
        await create({ manufacturerId, ...form });
      }
      setModal(false);
    } catch { Alert.alert('Error', 'Failed to save device'); }
  };

  const handleDelete = d => Alert.alert('Delete Device', `Delete "${d.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove({ deviceId: d.id, manufacturerId }) },
  ]);

  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} style={{ margin: 8 }} />;

  return (
    <View style={styles.deviceList}>
      {devices.map(d => (
        <View key={d.id} style={styles.deviceRow}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{d.name}</Text>
            {d.model ? <Text style={styles.deviceSub}>{d.model}</Text> : null}
          </View>
          {canManage && (
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(d)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(d)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {devices.length === 0 && <Text style={styles.deviceEmpty}>No devices</Text>}
      {canManage && (
        <TouchableOpacity style={styles.addDeviceBtn} onPress={openAdd}>
          <Text style={styles.addDeviceText}>+ Add Device</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Device' : 'New Device'}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Device Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. iPhone" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Model</Text>
              <TextInput style={styles.input} value={form.model} onChangeText={set('model')} placeholder="e.g. 15 Pro Max" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Optional" placeholderTextColor="#999" multiline />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Manufacturer item ────────────────────────────────────────────────────────

const ManufacturerItem = ({ item, canManage, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.mfrCard}>
      <TouchableOpacity style={styles.mfrHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.mfrInfo}>
          <Text style={styles.mfrName}>{item.name}</Text>
          {item.country ? <Text style={styles.mfrSub}>{item.country}</Text> : null}
        </View>
        <View style={styles.mfrRight}>
          {canManage && (
            <>
              <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && <DeviceList manufacturerId={item.id} canManage={canManage} />}
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const ManufacturersScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_MANUFACTURERS);

  const { data: raw = [], isLoading, refetch } = useManufacturers();
  const manufacturers = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateManufacturer();
  const { mutateAsync: update, isPending: updating } = useUpdateManufacturer();
  const { mutate: remove } = useDeleteManufacturer();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MFR);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = () => { setEditing(null); setForm(EMPTY_MFR); setModalVisible(true); };
  const openEdit = item => {
    setEditing(item);
    setForm({ name: item.name ?? '', description: item.description ?? '', country: item.country ?? '', website: item.website ?? '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editing) {
        await update({ id: editing.id, ...form });
      } else {
        await create(form);
      }
      setModalVisible(false);
    } catch { Alert.alert('Error', 'Failed to save'); }
  };

  const handleDelete = item => Alert.alert('Delete Manufacturer', `Delete "${item.name}" and all its devices?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(item.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      {canManage && (
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Manufacturer</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={manufacturers}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <ManufacturerItem
              item={item}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No manufacturers found.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Manufacturer' : 'New Manufacturer'}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Apple" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Country</Text>
              <TextInput style={styles.input} value={form.country} onChangeText={set('country')} placeholder="e.g. United States" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Website</Text>
              <TextInput style={styles.input} value={form.website} onChangeText={set('website')} placeholder="https://apple.com" placeholderTextColor="#999" autoCapitalize="none" keyboardType="url" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Optional" placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Create'}</Text>}
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
  loader: { marginTop: 40 },
  addBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  mfrCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  mfrHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  mfrInfo: { flex: 1 },
  mfrName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  mfrSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  mfrRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { fontSize: 11, color: colors.secondary, marginLeft: 4 },
  deviceList: { borderTopWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 14, paddingBottom: 10 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  deviceSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 1 },
  deviceEmpty: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#bbb', paddingVertical: 10 },
  addDeviceBtn: { marginTop: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  addDeviceText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  rowActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', marginTop: 40, color: colors.secondary, fontFamily: 'Outfit-Regular' },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default ManufacturersScreen;
