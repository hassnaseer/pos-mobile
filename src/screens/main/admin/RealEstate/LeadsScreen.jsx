import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useRELeads, useCreateRELead, useUpdateRELead, useConvertRELead, useStaff,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const SOURCE_OPTIONS = ['Walk-in', 'Website', 'Referral', 'Phone', 'Social Media', 'Portal', 'Other'];
const INTEREST_OPTIONS = [{ id: 'buy', name: 'Buy' }, { id: 'rent', name: 'Rent' }];
// Real-estate businesses get the property-oriented pipeline; a generic lead-management
// business (no real-estate module) gets a neutral sales pipeline.
const RE_STAGES = ['New', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Negotiating', 'Converted', 'Lost'];
const GENERIC_STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Converted', 'Lost'];
const STAGE_COLORS = {
  New: '#3b82f6', Contacted: '#8b5cf6', Qualified: '#0ea5e9', 'Viewing Scheduled': '#f59e0b',
  Negotiating: '#f97316', Converted: '#22c55e', Lost: '#ef4444',
};

const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const EMPTY_FORM = {
  name: '', phone: '', email: '', source: '', interestType: '',
  budgetMin: '', budgetMax: '', currency: '', assignedAgentId: '', notes: '',
};

// ─── Create Lead Modal ──────────────────────────────────────────────────────────
const CreateLeadModal = ({ visible, onClose, onSave, isSaving, agents, bizCurrency, isRealEstate }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => { if (visible) setForm(EMPTY_FORM); }, [visible]);

  const handleSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Lead name is required'); return; }
    if (!form.source) { Alert.alert('Required', 'Please select a source'); return; }
    if (isRealEstate && !form.interestType) { Alert.alert('Required', 'Please select buy or rent'); return; }
    onSave({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      source: form.source,
      // Real-estate-only fields — omitted for a generic lead-management business.
      ...(isRealEstate ? {
        interestType: form.interestType,
        budgetMin: form.budgetMin ? parseFloat(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? parseFloat(form.budgetMax) : undefined,
        currency: form.currency || bizCurrency,
      } : {}),
      assignedAgentId: form.assignedAgentId || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Lead</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSection}>Contact Info</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="Lead name" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={set('phone')} placeholder="+92 300 0000000" placeholderTextColor="#999" keyboardType="phone-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={set('email')} placeholder="lead@example.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />
            </View>

            <Text style={styles.formSection}>{isRealEstate ? 'Interest' : 'Details'}</Text>
            <InlinePicker label="Source *" options={SOURCE_OPTIONS.map(s => ({ id: s, name: s }))} value={form.source} onSelect={set('source')} placeholder="Select source" allowNone={false} />
            {isRealEstate && (
              <>
                <InlinePicker label="Interested In *" options={INTEREST_OPTIONS} value={form.interestType} onSelect={set('interestType')} placeholder="Buy or Rent" allowNone={false} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Budget Min</Text>
                    <TextInput style={styles.input} value={form.budgetMin} onChangeText={set('budgetMin')} placeholder="0" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Budget Max</Text>
                    <TextInput style={styles.input} value={form.budgetMax} onChangeText={set('budgetMax')} placeholder="0" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                </View>
                <InlinePicker label="Currency" options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency || bizCurrency} onSelect={set('currency')} allowNone={false} />
              </>
            )}

            <Text style={styles.formSection}>Assignment</Text>
            <InlinePicker label="Assign To Agent" options={agents.map(a => ({ id: a.id, name: a.name ?? a.fullName }))} value={form.assignedAgentId} onSelect={set('assignedAgentId')} placeholder="Select agent" />
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create Lead</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Stage picker bottom sheet ──────────────────────────────────────────────────
const StageModal = ({ visible, lead, onClose, onUpdate, isUpdating, stages }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <Text style={styles.pickerHeading}>Update Stage</Text>
        {stages.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.pickerOption, lead?.stage === s && { backgroundColor: '#f0f0f0' }]}
            onPress={() => onUpdate(s)}
            disabled={isUpdating}
          >
            <Text style={[styles.pickerOptionText, lead?.stage === s && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Main screen ───────────────────────────────────────────────────────────────
const LeadsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_LEADS);
  const isRealEstate = perms.can(PERMISSIONS.MANAGE_RE_PROPERTIES);
  const STAGES = isRealEstate ? RE_STAGES : GENERIC_STAGES;
  const STAGE_FILTERS = ['All', ...STAGES];
  const { currency: bizCurrency } = useCurrency();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [stageTarget, setStageTarget] = useState(null);

  const queryParams = { stage: stageFilter === 'All' ? undefined : stageFilter, search: search || undefined };

  const { data: raw = [], isLoading, refetch } = useRELeads(queryParams);
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: create, isPending: creating } = useCreateRELead();
  const { mutateAsync: update, isPending: updating } = useUpdateRELead();
  const { mutateAsync: convert, isPending: converting } = useConvertRELead();

  const leads = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const agents = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create lead');
    }
  };

  const handleStageUpdate = async newStage => {
    if (!stageTarget) return;
    try {
      await update({ id: stageTarget.id, stage: newStage });
      setStageTarget(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to update stage');
    }
  };

  const handleConvert = lead => {
    Alert.alert('Convert Lead', `Convert "${lead.name}" to a customer?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert', onPress: async () => {
          try { await convert(lead.id); } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Failed to convert lead'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Leads</Text>
          <Text style={styles.subHeading}>{isRealEstate ? 'Real estate CRM pipeline' : 'Sales CRM pipeline'}</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+ New Lead</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        {STAGE_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, stageFilter === f && styles.filterChipActive]} onPress={() => setStageFilter(f)}>
            <Text style={[styles.filterChipText, stageFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={leads}
        keyExtractor={l => String(l.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, paddingTop: 8 }}
        ListHeaderComponent={
          <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Search leads by name, phone, email…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        }
        renderItem={({ item }) => {
          const sc = STAGE_COLORS[item.stage] ?? '#9ca3af';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.metaText}>{item.phone ?? ''}{item.phone && item.email ? ' · ' : ''}{item.email ?? ''}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc + '22' }]}>
                  <Text style={[styles.badgeText, { color: sc }]}>{item.stage}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>{item.source}{isRealEstate ? ` · ${item.interestType === 'rent' ? 'Rent' : 'Buy'}` : ''}</Text>
              {isRealEstate && (item.budgetMin || item.budgetMax) ? (
                <Text style={styles.metaText}>Budget: {fmtCur(item.budgetMin ?? 0, item.currency ?? bizCurrency)} – {fmtCur(item.budgetMax ?? 0, item.currency ?? bizCurrency)}</Text>
              ) : null}
              {item.assignedAgent?.name ? <Text style={styles.metaText}>Agent: {item.assignedAgent.name}</Text> : null}
              {canManage && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setStageTarget(item)} disabled={updating}>
                    <Text style={styles.actionBtnText}>Stage ▾</Text>
                  </TouchableOpacity>
                  {item.stage !== 'Converted' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleConvert(item)} disabled={converting}>
                      <Text style={styles.actionBtnText}>Convert to Customer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No leads found.</Text>}
      />

      <CreateLeadModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        agents={agents}
        bizCurrency={bizCurrency}
        isRealEstate={isRealEstate}
      />
      <StageModal
        visible={!!stageTarget}
        lead={stageTarget}
        onClose={() => setStageTarget(null)}
        onUpdate={handleStageUpdate}
        isUpdating={updating}
        stages={STAGES}
      />
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

  filterRow: { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', paddingVertical: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold' },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
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

  // Stage picker sheet
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 8 },
  pickerHeading: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827', padding: 12 },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
});

export default LeadsScreen;
