import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import {
  useFingerprintDevices, useCreateFingerprintDevice, useUpdateFingerprintDevice,
  useDeleteFingerprintDevice, useSyncFingerprintDevice,
  useFingerprintStaffMappings, useUpsertFingerprintMapping,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_DEVICE_FORM = { name: '', ipAddress: '', port: '4370', serialNumber: '' };
const EMPTY_MAP_FORM    = { staffId: '', deviceUserId: '' };

const STATUS_COLOR = { online: '#10B981', offline: '#EF4444', unknown: '#9CA3AF' };

// ─── Device Card ──────────────────────────────────────────────────────────────
const DeviceCard = ({ device, onEdit, onDelete, onSync, onMapStaff, syncing }) => {
  const status = device.status ?? 'unknown';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Text style={styles.cardIcon}>🖥️</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName}>{device.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>{status}</Text>
          </View>
          <Text style={styles.cardSub}>{device.ipAddress}{device.port ? `:${device.port}` : ''}</Text>
          {device.serialNumber && <Text style={styles.cardMeta}>SN: {device.serialNumber}</Text>}
          {device.lastSync && (
            <Text style={styles.cardMeta}>
              Last sync: {new Date(device.lastSync).toLocaleString()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.syncBtn} onPress={() => onSync(device)} disabled={syncing}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.syncBtnText}>↺ Sync</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapBtn} onPress={() => onMapStaff(device)}>
          <Text style={styles.mapBtnText}>👥 Map Staff</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(device)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(device)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const FingerprintDevicesScreen = () => {
  const perms     = usePermissions();
  const canManage = perms.can(PERMISSIONS.DEVICE_ATTENDANCE);

  const [deviceModal, setDeviceModal] = useState(false);
  const [mapModal, setMapModal]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [mapTarget, setMapTarget]     = useState(null);
  const [deviceForm, setDeviceForm]   = useState(EMPTY_DEVICE_FORM);
  const [mapForm, setMapForm]         = useState(EMPTY_MAP_FORM);
  const [syncingId, setSyncingId]     = useState(null);

  const { data: raw = [], isLoading, refetch } = useFingerprintDevices();
  const { mutateAsync: createDevice, isPending: creating } = useCreateFingerprintDevice();
  const { mutateAsync: updateDevice, isPending: updating } = useUpdateFingerprintDevice();
  const { mutate: deleteDevice }                           = useDeleteFingerprintDevice();
  const { mutateAsync: syncDevice }                        = useSyncFingerprintDevice();
  const { data: mappings = [] }                            = useFingerprintStaffMappings(mapTarget?.id);
  const { mutateAsync: upsertMapping, isPending: mapping } = useUpsertFingerprintMapping();

  const devices = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const saving  = creating || updating;

  // ── Device CRUD ────────────────────────────────────────────────────────────
  const openAddDevice = () => {
    setEditTarget(null);
    setDeviceForm(EMPTY_DEVICE_FORM);
    setDeviceModal(true);
  };

  const openEditDevice = d => {
    setEditTarget(d);
    setDeviceForm({
      name:         d.name ?? '',
      ipAddress:    d.ipAddress ?? '',
      port:         String(d.port ?? 4370),
      serialNumber: d.serialNumber ?? '',
    });
    setDeviceModal(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceForm.name.trim() || !deviceForm.ipAddress.trim()) {
      Alert.alert('Error', 'Name and IP address are required');
      return;
    }
    try {
      const payload = {
        name:         deviceForm.name.trim(),
        ipAddress:    deviceForm.ipAddress.trim(),
        port:         parseInt(deviceForm.port, 10) || 4370,
        serialNumber: deviceForm.serialNumber.trim() || undefined,
      };
      if (editTarget) {
        await updateDevice({ id: editTarget.id, ...payload });
      } else {
        await createDevice(payload);
      }
      setDeviceModal(false);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Save failed');
    }
  };

  const handleDeleteDevice = d => Alert.alert(
    'Delete Device',
    `Remove "${d.name}"? All staff mappings will also be removed.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          deleteDevice(d.id, {
            onError: e => Alert.alert('Error', e?.message ?? 'Delete failed'),
          }),
      },
    ]
  );

  const handleSync = async d => {
    setSyncingId(d.id);
    try {
      await syncDevice(d.id);
      Alert.alert('Sync Complete', 'Attendance logs have been synced from the device.');
    } catch (e) {
      Alert.alert('Sync Failed', e?.message ?? 'Could not reach the device. Check IP and network.');
    } finally {
      setSyncingId(null);
    }
  };

  // ── Staff Mapping ──────────────────────────────────────────────────────────
  const openMapStaff = d => {
    setMapTarget(d);
    setMapForm(EMPTY_MAP_FORM);
    setMapModal(true);
  };

  const handleAddMapping = async () => {
    if (!mapForm.staffId.trim() || !mapForm.deviceUserId.trim()) {
      Alert.alert('Error', 'Staff ID and device user ID are required');
      return;
    }
    try {
      await upsertMapping({
        deviceId:     mapTarget.id,
        staffId:      mapForm.staffId.trim(),
        deviceUserId: mapForm.deviceUserId.trim(),
      });
      setMapForm(EMPTY_MAP_FORM);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Mapping failed');
    }
  };

  if (!canManage) {
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedIcon}>🔒</Text>
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.deniedSub}>Fingerprint device attendance is not available on your plan.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Fingerprint Devices</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddDevice}>
          <Text style={styles.addBtnText}>+ Add Device</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        keyExtractor={d => String(d.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            onEdit={openEditDevice}
            onDelete={handleDeleteDevice}
            onSync={handleSync}
            onMapStaff={openMapStaff}
            syncing={syncingId === item.id}
          />
        )}
        ListEmptyComponent={!isLoading && (
          <Text style={styles.empty}>No fingerprint devices added yet.</Text>
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />

      {/* Add / Edit Device Modal */}
      <Modal visible={deviceModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editTarget ? 'Edit Device' : 'Add Device'}</Text>
            {[
              { key: 'name',         label: 'Device Name *',    placeholder: 'e.g. Main Entrance' },
              { key: 'ipAddress',    label: 'IP Address *',     placeholder: '192.168.1.100',     keyboard: 'url' },
              { key: 'port',         label: 'Port',             placeholder: '4370',              keyboard: 'number-pad' },
              { key: 'serialNumber', label: 'Serial Number',    placeholder: 'Optional' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={deviceForm[f.key]}
                  onChangeText={v => setDeviceForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#999"
                  keyboardType={f.keyboard ?? 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeviceModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDevice} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editTarget ? 'Save' : 'Add'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Staff Mapping Modal */}
      <Modal visible={mapModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Map Staff — {mapTarget?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Link a staff member's system ID to their ID on this device.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Existing mappings */}
              {(Array.isArray(mappings) ? mappings : []).map(m => (
                <View key={m.id ?? m.staffId} style={styles.mapRow}>
                  <Text style={styles.mapStaffId}>Staff: {m.staffId}</Text>
                  <Text style={styles.mapArrow}>→</Text>
                  <Text style={styles.mapDeviceId}>Device UID: {m.deviceUserId}</Text>
                </View>
              ))}

              {/* Add new mapping */}
              <Text style={[styles.label, { marginTop: 12 }]}>Add / Update Mapping</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Staff ID</Text>
                <TextInput
                  style={styles.input}
                  value={mapForm.staffId}
                  onChangeText={v => setMapForm(p => ({ ...p, staffId: v }))}
                  placeholder="Staff member ID"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Device User ID</Text>
                <TextInput
                  style={styles.input}
                  value={mapForm.deviceUserId}
                  onChangeText={v => setMapForm(p => ({ ...p, deviceUserId: v }))}
                  placeholder="User ID on device"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMapping} disabled={mapping}>
                {mapping
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>Save Mapping</Text>
                }
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setMapModal(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:   { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:    { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:{ color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  // Card
  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardIconWrap:{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIcon:   { fontSize: 20 },
  cardInfo:   { flex: 1 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:   { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', flex: 1 },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  cardSub:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  cardMeta:   { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  cardActions:{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  syncBtn:    { backgroundColor: '#1E293B', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' },
  syncBtnText:{ color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  mapBtn:     { backgroundColor: '#EFF6FF', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7 },
  mapBtnText: { color: '#2563EB', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  editBtn:    { backgroundColor: '#F3F4F6', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText:{ color: '#374151', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  deleteBtn:  { backgroundColor: '#FEE2E2', borderRadius: 7, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:{ color: '#DC2626', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Access denied
  denied:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  deniedIcon:{ fontSize: 48, marginBottom: 12 },
  deniedTitle:{ fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 8 },
  deniedSub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7280', textAlign: 'center' },
  // Modal
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:    { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 16 },
  field:         { marginBottom: 12 },
  label:         { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:         { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  mapRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 8 },
  mapStaffId:    { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  mapArrow:      { fontSize: 14, color: '#9CA3AF' },
  mapDeviceId:   { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', textAlign: 'right' },
  modalActions:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:     { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:    { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:       { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:      { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default FingerprintDevicesScreen;
