import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView, Switch,
} from 'react-native';
import {
  useCommissionStructures, useCreateCommissionStructure, useUpdateCommissionStructure, useDeleteCommissionStructure,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const EMPTY_TIER = { minAmount: '', maxAmount: '', noLimit: false, commissionPercent: '' };
const EMPTY_FORM = { name: '', employeeType: '', dollarRate: '', isActive: true, tiers: [{ ...EMPTY_TIER }] };

const EMPLOYEE_TYPES = [
  { id: 'full_time', name: 'Full Time' },
  { id: 'part_time', name: 'Part Time' },
  { id: 'intern', name: 'Intern' },
  { id: 'probation', name: 'Probation' },
  { id: 'training_nesting', name: 'Training & Nesting' },
];

const employeeTypeLabel = v => EMPLOYEE_TYPES.find(t => t.id === v)?.name ?? v;

const toTierPayload = rows => rows
  .filter(r => r.minAmount !== '' && r.commissionPercent !== '')
  .map(r => ({
    minAmount: Number(r.minAmount),
    maxAmount: r.noLimit ? null : (r.maxAmount !== '' ? Number(r.maxAmount) : null),
    commissionPercent: Number(r.commissionPercent),
  }));

const fromTierPayload = tiers => {
  if (!tiers?.length) return [{ ...EMPTY_TIER }];
  return tiers.map(t => ({
    minAmount: String(t.minAmount),
    maxAmount: t.maxAmount != null ? String(t.maxAmount) : '',
    noLimit: t.maxAmount == null,
    commissionPercent: String(t.commissionPercent),
  }));
};

const CommissionStructuresScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_COMMISSIONS);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useCommissionStructures();
  const { mutateAsync: create, isPending: creating } = useCreateCommissionStructure();
  const { mutateAsync: update, isPending: updating } = useUpdateCommissionStructure();
  const { mutate: remove } = useDeleteCommissionStructure();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const setTier = (idx, patch) => setForm(f => {
    const tiers = [...f.tiers];
    tiers[idx] = { ...tiers[idx], ...patch };
    return { ...f, tiers };
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = s => {
    setEditing(s);
    setForm({ name: s.name, employeeType: s.employeeType, dollarRate: String(s.dollarRate), isActive: s.isActive, tiers: fromTierPayload(s.tiers) });
    setShowModal(true);
  };

  const handleSave = async () => {
    const tiers = toTierPayload(form.tiers);
    if (!form.name.trim() || !form.employeeType || !form.dollarRate || tiers.length === 0) {
      Alert.alert('Error', 'Name, employee type, dollar rate, and at least one tier are required'); return;
    }
    const payload = { name: form.name.trim(), employeeType: form.employeeType, dollarRate: parseFloat(form.dollarRate), isActive: form.isActive, tiers };
    try {
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save commission structure');
    }
  };

  const handleDelete = s => Alert.alert('Delete Commission Structure', `Delete "${s.name}"? Existing commission entries keep their already-computed figures.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(s.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Commission Structures</Text>
          <Text style={styles.subHeading}>Tiered dollar-amount brackets per employee type</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{employeeTypeLabel(item.employeeType)}</Text></View>
                  {!item.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>}
                </View>
                <Text style={styles.cardSub}>Dollar rate: {item.dollarRate} · {item.tiers?.length ?? 0} tier{(item.tiers?.length ?? 0) !== 1 ? 's' : ''}</Text>
              </View>
              {canManage && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delText}>Del</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.tierRow}>
              {(item.tiers ?? []).map((t, i) => (
                <View key={i} style={styles.tierChip}>
                  <Text style={styles.tierChipText}>${t.minAmount}–{t.maxAmount != null ? `$${t.maxAmount}` : '∞'} · {t.commissionPercent}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No commission structures configured yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editing ? 'Edit' : 'Add'} Commission Structure</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Fresher Structure" placeholderTextColor="#999" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Employee Type *</Text>
                <InlinePicker options={EMPLOYEE_TYPES} value={form.employeeType} onSelect={set('employeeType')} placeholder="Select type" allowNone={false} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Dollar Rate *</Text>
                <TextInput style={styles.input} value={form.dollarRate} onChangeText={set('dollarRate')} placeholder="e.g. 200" placeholderTextColor="#999" keyboardType="decimal-pad" />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Active (assigned to employees of this type)</Text>
                <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }} thumbColor={form.isActive ? colors.primary : '#9ca3af'} />
              </View>

              <Text style={[styles.label, { marginTop: 8 }]}>Tiers *</Text>
              {form.tiers.map((t, idx) => (
                <View key={idx} style={styles.tierEditRow}>
                  <View style={styles.tierEditCol}>
                    <Text style={styles.tierEditLabel}>Min $</Text>
                    <TextInput style={styles.tierInput} value={t.minAmount} onChangeText={v => setTier(idx, { minAmount: v })} placeholder="0" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.tierEditCol}>
                    <Text style={styles.tierEditLabel}>Max $</Text>
                    <TextInput style={styles.tierInput} value={t.maxAmount} editable={!t.noLimit} onChangeText={v => setTier(idx, { maxAmount: v })} placeholder="999" placeholderTextColor="#999" keyboardType="decimal-pad" />
                    <TouchableOpacity style={styles.noLimitRow} onPress={() => setTier(idx, { noLimit: !t.noLimit, maxAmount: !t.noLimit ? '' : t.maxAmount })}>
                      <View style={[styles.checkbox, t.noLimit && styles.checkboxActive]}>{t.noLimit && <Text style={styles.checkboxMark}>✓</Text>}</View>
                      <Text style={styles.noLimitText}>No limit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tierEditCol}>
                    <Text style={styles.tierEditLabel}>%</Text>
                    <TextInput style={styles.tierInput} value={t.commissionPercent} onChangeText={v => setTier(idx, { commissionPercent: v })} placeholder="4" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                  <TouchableOpacity
                    style={styles.tierRemoveBtn}
                    disabled={form.tiers.length === 1}
                    onPress={() => setForm(f => ({ ...f, tiers: f.tiers.filter((_, i) => i !== idx) }))}
                  >
                    <Text style={[styles.tierRemoveText, form.tiers.length === 1 && { color: '#D0D5DD' }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTierBtn} onPress={() => setForm(f => ({ ...f, tiers: [...f.tiers, { ...EMPTY_TIER }] }))}>
                <Text style={styles.addTierBtnText}>+ Add Tier</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading:   { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card:         { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName:     { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  typeBadge:    { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText:{ fontSize: 10, fontFamily: 'Outfit-Medium', color: colors.primary },
  inactiveBadge:{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  cardSub:      { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 4 },
  actions:      { flexDirection: 'row', gap: 6 },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editText:     { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  tierRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
  tierChip:     { backgroundColor: '#f9fafb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tierChipText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#374151' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '88%' },
  modalTitle:   { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  tierEditRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  tierEditCol:  { flex: 1 },
  tierEditLabel:{ fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 3 },
  tierInput:    { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111' },
  noLimitRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  checkbox:     { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: '#fff', fontSize: 9, fontFamily: 'Outfit-Bold' },
  noLimitText:  { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  tierRemoveBtn:{ paddingBottom: 8, paddingHorizontal: 4 },
  tierRemoveText: { fontSize: 15, color: '#ef4444' },
  addTierBtn:   { borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 8 },
  addTierBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default CommissionStructuresScreen;
