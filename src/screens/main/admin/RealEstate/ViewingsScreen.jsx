import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useREViewings, useCreateREViewing, useCompleteREViewing,
  useREUnitLookup, useRELeads, useCustomers, useStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const STATUS_FILTERS = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];
const COMPLETE_STATUSES = [{ id: 'Completed', name: 'Completed' }, { id: 'No-Show', name: 'No-Show' }];

const EMPTY_FORM = { scheduledDate: '', scheduledTime: '', durationMinutes: '30', agentId: '', notes: '' };

// Computed once per render (no live ticking timer needed for this use case).
const startingBadge = (scheduledDate, scheduledTime) => {
  if (!scheduledDate) return { label: '—', color: '#9ca3af' };
  const [h, m] = (scheduledTime ?? '00:00').split(':').map(n => parseInt(n, 10) || 0);
  const dt = new Date(scheduledDate);
  dt.setHours(h, m, 0, 0);
  const diffMs = dt.getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Past', color: '#9ca3af' };
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return { label: `in ${mins}m`, color: '#f59e0b' };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `in ${hrs}h`, color: '#3b82f6' };
  return { label: `in ${Math.floor(hrs / 24)}d`, color: '#3b82f6' };
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
      <Text style={styles.label}>Unit</Text>
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

// ─── Create Viewing Modal ───────────────────────────────────────────────────────
const CreateViewingModal = ({ visible, onClose, onSave, isSaving, leads, customers, agents }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (visible) {
      setForm(EMPTY_FORM); setSelectedUnit(null); setSelectedLeadId(''); setSelectedCustomerId('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!form.scheduledDate) { Alert.alert('Required', 'Please select a date'); return; }
    if (!selectedLeadId && !selectedCustomerId) { Alert.alert('Required', 'Select either a lead or a customer'); return; }
    onSave({
      unitId: selectedUnit?.id || undefined,
      leadId: selectedLeadId || undefined,
      customerId: selectedCustomerId || undefined,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime.trim() || undefined,
      durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
      agentId: form.agentId || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Viewing</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSection}>Unit</Text>
            <UnitSearchField value={selectedUnit} onSelect={setSelectedUnit} />

            <Text style={styles.formSection}>Attendee (select one)</Text>
            <InlinePicker
              label="Lead"
              options={leads.map(l => ({ id: l.id, name: l.name }))}
              value={selectedLeadId}
              onSelect={val => { setSelectedLeadId(val); if (val) setSelectedCustomerId(''); }}
              placeholder="Select lead"
            />
            <InlinePicker
              label="Customer"
              options={customers.map(c => ({ id: c.id, name: c.name }))}
              value={selectedCustomerId}
              onSelect={val => { setSelectedCustomerId(val); if (val) setSelectedLeadId(''); }}
              placeholder="Select customer"
            />

            <Text style={styles.formSection}>Schedule</Text>
            <DatePicker label="Date *" value={form.scheduledDate} onDateChange={set('scheduledDate')} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Time (HH:MM)</Text>
                <TextInput style={styles.input} value={form.scheduledTime} onChangeText={set('scheduledTime')} placeholder="14:30" placeholderTextColor="#999" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput style={styles.input} value={form.durationMinutes} onChangeText={set('durationMinutes')} placeholder="30" placeholderTextColor="#999" keyboardType="number-pad" />
              </View>
            </View>
            <InlinePicker label="Agent" options={agents.map(a => ({ id: a.id, name: a.name ?? a.fullName }))} value={form.agentId} onSelect={set('agentId')} placeholder="Select agent" />
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Schedule Viewing</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Complete Viewing Modal ──────────────────────────────────────────────────────
const CompleteModal = ({ visible, onClose, onSave, isSaving }) => {
  const [status, setStatus] = useState('Completed');
  const [feedback, setFeedback] = useState('');

  useEffect(() => { if (visible) { setStatus('Completed'); setFeedback(''); } }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerModalBg}>
        <View style={styles.smallModalCard}>
          <Text style={styles.modalTitle}>Complete Viewing</Text>
          <InlinePicker label="Outcome" options={COMPLETE_STATUSES} value={status} onSelect={setStatus} allowNone={false} />
          <View style={styles.field}>
            <Text style={styles.label}>Feedback</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={feedback} onChangeText={setFeedback} placeholder="Optional feedback" placeholderTextColor="#999" multiline />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} disabled={isSaving} onPress={() => onSave({ status, feedback: feedback.trim() || undefined })}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const ViewingsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_VIEWINGS);

  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);

  const queryParams = { status: statusFilter === 'All' ? undefined : statusFilter };

  const { data: raw = [], isLoading, refetch } = useREViewings(queryParams);
  const { data: rawLeads = [] } = useRELeads();
  const { data: rawCustomers = [] } = useCustomers();
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: create, isPending: creating } = useCreateREViewing();
  const { mutateAsync: complete, isPending: completing } = useCompleteREViewing();

  const viewings = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const leads = Array.isArray(rawLeads) ? rawLeads : (rawLeads?.data ?? []);
  const customers = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const agents = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to schedule viewing');
    }
  };

  const handleComplete = async payload => {
    if (!completeTarget) return;
    try {
      await complete({ id: completeTarget.id, ...payload });
      setCompleteTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to update viewing');
    }
  };

  const handleCancel = viewing => {
    Alert.alert('Cancel Viewing', 'Mark this viewing as cancelled?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { await complete({ id: viewing.id, status: 'Cancelled' }); } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Failed to cancel viewing'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Property Viewings</Text>
          <Text style={styles.subHeading}>Scheduled viewings & appointments</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+ New Viewing</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={viewings}
        keyExtractor={v => String(v.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, paddingTop: 10 }}
        renderItem={({ item }) => {
          const isScheduled = item.status === 'Scheduled';
          const badge = isScheduled ? startingBadge(item.scheduledDate, item.scheduledTime) : null;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.unit?.label ?? item.unit?.unitNumber ?? 'Unit'}</Text>
                  <Text style={styles.metaText}>{item.lead?.name ?? item.customer?.name ?? 'No attendee'}</Text>
                </View>
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeNeutral]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.metaText}>{item.scheduledDate?.slice(0, 10)} {item.scheduledTime ?? ''}</Text>
              {item.agent?.name ? <Text style={styles.metaText}>Agent: {item.agent.name}</Text> : null}
              {canManage && isScheduled && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setCompleteTarget(item)}>
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(item)} disabled={completing}>
                    <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No viewings found.</Text>}
      />

      <CreateViewingModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        leads={leads}
        customers={customers}
        agents={agents}
      />
      <CompleteModal visible={!!completeTarget} onClose={() => setCompleteTarget(null)} onSave={handleComplete} isSaving={completing} />
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

  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', paddingVertical: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 60 },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#374151' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
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
});

export default ViewingsScreen;
