import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useREMaintenanceRequests, useCreateREMaintenanceRequest, useAssignREMaintenanceRequest,
  useResolveREMaintenanceRequest, useREUnitLookup, useCustomers, useStaff,
} from '../../../../services/api/posApi';
import { BASE_URL } from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PRIORITY_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Urgent: '#ef4444' };
const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Resolved'];
const PRIORITY_FILTERS = ['All', ...PRIORITIES];

const uploadImage = async asset => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'maintenance.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? json.data?.key ?? json.key ?? '';
};

const EMPTY_FORM = {
  title: '', description: '', category: '', priority: 'Medium', tenantId: '', assignedToId: '',
};

// ─── Unit search-as-you-type ────────────────────────────────────────────────────
const UnitSearchField = ({ value, onSelect }) => {
  const [search, setSearch] = useState('');
  const { data: rawResults = [] } = useREUnitLookup(search);
  const results = Array.isArray(rawResults) ? rawResults : (rawResults?.data ?? []);

  if (value) {
    return (
      <View style={styles.selectedChip}>
        <View style={{ flex: 1 }}><Text style={styles.selectedChipName}>{value.label}</Text></View>
        <TouchableOpacity onPress={() => onSelect(null)}><Text style={styles.selectedChipClear}>✕</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Unit (optional)</Text>
      <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search units…" placeholderTextColor="#999" />
      {search.trim().length > 0 && (
        <View style={styles.resultsList}>
          {results.slice(0, 8).map(u => (
            <TouchableOpacity key={u.id} style={styles.resultRow} onPress={() => { onSelect(u); setSearch(''); }}>
              <Text style={styles.resultName}>{u.label}</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && <Text style={styles.emptyResultText}>No matching units</Text>}
        </View>
      )}
    </View>
  );
};

// ─── Create Request Modal ───────────────────────────────────────────────────────
const CreateRequestModal = ({ visible, onClose, onSave, isSaving, tenants, staffList }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (visible) { setForm(EMPTY_FORM); setSelectedUnit(null); setImageUrls([]); }
  }, [visible]);

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
      if (res.didCancel || !res.assets?.length) return;
      setUploading(true);
      try {
        const url = await uploadImage(res.assets[0]);
        setImageUrls(p => [...p, url]);
      } catch (e) {
        Alert.alert('Upload failed', e?.message ?? 'Try again');
      } finally {
        setUploading(false);
      }
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Title is required'); return; }
    if (!form.priority) { Alert.alert('Required', 'Please select a priority'); return; }
    onSave({
      unitId: selectedUnit?.id || undefined,
      tenantId: form.tenantId || undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      priority: form.priority,
      assignedToId: form.assignedToId || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Maintenance Request</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.formSection}>Location</Text>
            <UnitSearchField value={selectedUnit} onSelect={setSelectedUnit} />
            <InlinePicker label="Tenant" options={tenants.map(t => ({ id: t.id, name: t.name }))} value={form.tenantId} onSelect={set('tenantId')} placeholder="Select tenant" />

            <Text style={styles.formSection}>Issue</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={set('title')} placeholder="e.g. Leaking faucet" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Describe the issue…" placeholderTextColor="#999" multiline />
            </View>
            <InlinePicker label="Category" options={CATEGORIES.map(c => ({ id: c, name: c }))} value={form.category} onSelect={set('category')} placeholder="Select category" />
            <View style={styles.field}>
              <Text style={styles.label}>Priority *</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity key={p} style={[styles.chip, form.priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]} onPress={() => set('priority')(p)}>
                    <Text style={[styles.chipText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.formSection}>Photos</Text>
            <View style={styles.imageGrid}>
              {imageUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
              ))}
              <TouchableOpacity style={styles.addImageTile} onPress={handlePickImage} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.addImageTileText}>+ Add</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.formSection}>Assignment</Text>
            <InlinePicker label="Assign To" options={staffList.map(s => ({ id: s.id, name: s.name ?? s.fullName }))} value={form.assignedToId} onSelect={set('assignedToId')} placeholder="Select staff" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving || uploading}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Log Request</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Assign Modal ────────────────────────────────────────────────────────────────
const AssignModal = ({ visible, onClose, onSave, isSaving, staffList }) => {
  const [assignedToId, setAssignedToId] = useState('');
  useEffect(() => { if (visible) setAssignedToId(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Assign Request</Text>
          <InlinePicker label="Assign To *" options={staffList.map(s => ({ id: s.id, name: s.name ?? s.fullName }))} value={assignedToId} onSelect={setAssignedToId} placeholder="Select staff" allowNone={false} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} disabled={isSaving || !assignedToId} onPress={() => onSave({ assignedToId })}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Assign</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Resolve Modal ───────────────────────────────────────────────────────────────
const ResolveModal = ({ visible, onClose, onSave, isSaving }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  useEffect(() => { if (visible) setResolutionNotes(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Resolve Request</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Resolution Notes</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={resolutionNotes} onChangeText={setResolutionNotes} placeholder="What was done…" placeholderTextColor="#999" multiline />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} disabled={isSaving} onPress={() => onSave({ resolutionNotes: resolutionNotes.trim() || undefined })}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Mark Resolved</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const MaintenanceScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_MAINTENANCE);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

  const queryParams = {
    status: statusFilter === 'All' ? undefined : statusFilter,
    priority: priorityFilter === 'All' ? undefined : priorityFilter,
    search: search || undefined,
  };

  const { data: raw = [], isLoading, refetch } = useREMaintenanceRequests(queryParams);
  const { data: rawCustomers = [] } = useCustomers();
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: create, isPending: creating } = useCreateREMaintenanceRequest();
  const { mutateAsync: assign, isPending: assigning } = useAssignREMaintenanceRequest();
  const { mutateAsync: resolve, isPending: resolving } = useResolveREMaintenanceRequest();

  const requests = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const tenants = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to log request');
    }
  };

  const handleAssign = async payload => {
    if (!assignTarget) return;
    try {
      await assign({ id: assignTarget.id, ...payload });
      setAssignTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to assign request');
    }
  };

  const handleResolve = async payload => {
    if (!resolveTarget) return;
    try {
      await resolve({ id: resolveTarget.id, ...payload });
      setResolveTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to resolve request');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Maintenance</Text>
          <Text style={styles.subHeading}>Field maintenance requests</Text>
        </View>
        {canManage && (
          <HeaderAddButton onPress={() => setShowCreate(true)} label="New Request" />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { borderTopWidth: 1, borderColor: '#f5f5f5' }]} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        {PRIORITY_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, priorityFilter === f && styles.filterChipActive]} onPress={() => setPriorityFilter(f)}>
            <Text style={[styles.filterChipText, priorityFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={requests}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, paddingTop: 8 }}
        ListHeaderComponent={
          <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Search requests…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        }
        renderItem={({ item }) => {
          const pc = PRIORITY_COLORS[item.priority] ?? '#9ca3af';
          const isOpen = item.status !== 'Resolved';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refNum}>{item.referenceNumber ?? item.reference}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: pc + '22' }]}>
                  <Text style={[styles.badgeText, { color: pc }]}>{item.priority}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>{item.category ?? 'Uncategorized'} · {item.tenant?.name ?? 'No tenant'}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.badge, item.status === 'Resolved' ? styles.badgeActive : styles.badgeNeutral]}>
                  <Text style={styles.badgeText}>{item.status ?? 'Open'}</Text>
                </View>
                {item.assignedTo?.name ? <Text style={styles.metaText}>→ {item.assignedTo.name}</Text> : null}
              </View>
              {canManage && isOpen && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setAssignTarget(item)}>
                    <Text style={styles.actionBtnText}>Assign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setResolveTarget(item)}>
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No maintenance requests found.</Text>}
      />

      <CreateRequestModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        tenants={tenants}
        staffList={staffList}
      />
      <AssignModal visible={!!assignTarget} onClose={() => setAssignTarget(null)} onSave={handleAssign} isSaving={assigning} staffList={staffList} />
      <ResolveModal visible={!!resolveTarget} onClose={() => setResolveTarget(null)} onSave={handleResolve} isSaving={resolving} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },

  filterRow: { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', paddingVertical: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  refNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#374151' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },

  // Modal
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  formSection: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  centerModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },

  // Unit search
  selectedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 },
  selectedChipName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1e40af' },
  selectedChipClear: { fontSize: 16, color: '#93c5fd', paddingLeft: 12, fontFamily: 'Outfit-Bold' },
  resultsList: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, overflow: 'hidden', marginTop: 8, backgroundColor: '#fff' },
  resultRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  resultName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  emptyResultText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', padding: 14, fontSize: 13 },

  // Images
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6' },
  addImageTile: { width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addImageTileText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
});

export default MaintenanceScreen;
