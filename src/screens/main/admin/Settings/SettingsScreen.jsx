import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Switch, ActivityIndicator, Alert,
} from 'react-native';
import {
  useTaxes, useCreateTax, useToggleTax, useDeleteTax,
  useMiscCharges, useCreateMiscCharge, useUpdateMiscCharge, useDeleteMiscCharge,
  useAdminSettings, useUpdateAdminSettings,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

// ─── Static data ──────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Africa/Nairobi',
];

// ─── Shared helpers ───────────────────────────────────────────────────────────
const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999"
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

const PickerRow = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={styles.pickerBtnText}>{value || 'Select…'}</Text>
        <Text style={styles.pickerChevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              {options.map(opt => (
                <TouchableOpacity key={opt} style={styles.pickerOption} onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Business tab ─────────────────────────────────────────────────────────────
const BusinessTab = () => {
  const { data: settings, isLoading } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateAdminSettings();
  const [form, setForm] = useState({
    name: '', ownerName: '', email: '', phone: '', country: '',
    address: '', currency: 'USD', timezone: 'UTC',
    openingTime: '', closingTime: '', invoiceTerms: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name ?? '',
        ownerName: settings.ownerName ?? '',
        email: settings.email ?? '',
        phone: settings.phone ?? '',
        country: settings.country ?? '',
        address: settings.address ?? '',
        currency: settings.currency ?? 'USD',
        timezone: settings.timezone ?? 'UTC',
        openingTime: settings.openingTime ?? '',
        closingTime: settings.closingTime ?? '',
        invoiceTerms: settings.invoiceTerms ?? '',
      });
    }
  }, [settings]);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Business name is required'); return; }
    try {
      await updateSettings(form);
      Alert.alert('Success', 'Business settings saved');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Business Information</Text>
      <Field label="Business Name" value={form.name} onChangeText={set('name')} placeholder="My Business" />
      <Field label="Owner Name" value={form.ownerName} onChangeText={set('ownerName')} placeholder="John Doe" />
      <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="email@business.com" keyboardType="email-address" />
      <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="+1 234 567 890" keyboardType="phone-pad" />
      <Field label="Country" value={form.country} onChangeText={set('country')} placeholder="United States" />
      <Field label="Address" value={form.address} onChangeText={set('address')} placeholder="123 Main St, City" />

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Regional</Text>
      <PickerRow label="Currency" value={form.currency} options={CURRENCIES.map(c => c.code)} onSelect={set('currency')} />
      <PickerRow label="Timezone" value={form.timezone} options={TIMEZONES} onSelect={set('timezone')} />

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Hours & Terms</Text>
      <Field label="Opening Time" value={form.openingTime} onChangeText={set('openingTime')} placeholder="09:00" />
      <Field label="Closing Time" value={form.closingTime} onChangeText={set('closingTime')} placeholder="18:00" />
      <Field label="Invoice Terms" value={form.invoiceTerms} onChangeText={set('invoiceTerms')} placeholder="Payment due within 30 days…" multiline />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Business Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Taxes tab ────────────────────────────────────────────────────────────────
const TaxesTab = ({ canManage }) => {
  const { data: raw = [], isLoading } = useTaxes();
  const { mutateAsync: createTax, isPending: creating } = useCreateTax();
  const { mutate: toggleTax } = useToggleTax();
  const { mutate: deleteTax } = useDeleteTax();

  const taxes = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', percentage: '', type: 'EXCLUDED' });
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleCreate = async () => {
    if (!form.name || !form.percentage) { Alert.alert('Error', 'Name and percentage are required'); return; }
    try {
      await createTax({ name: form.name, percentage: parseFloat(form.percentage), type: form.type, isActive: true });
      setShowModal(false);
      setForm({ name: '', percentage: '', type: 'EXCLUDED' });
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tax Rates</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Add Tax</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : taxes.map(tax => (
        <View key={tax.id} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{tax.name}</Text>
            <Text style={styles.rowSub}>{tax.percentage}% · {tax.type}</Text>
          </View>
          {canManage && (
            <>
              <Switch
                value={tax.isActive}
                onValueChange={() => toggleTax({ id: tax.id, isActive: !tax.isActive })}
                trackColor={{ false: '#D0D5DD', true: colors.primary }}
                thumbColor="#fff"
              />
              <TouchableOpacity
                style={styles.delBtn}
                onPress={() => Alert.alert('Delete Tax', `Delete "${tax.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteTax(tax.id) },
                ])}
              >
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}
      {!isLoading && taxes.length === 0 && <Text style={styles.empty}>No taxes configured.</Text>}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Tax</Text>
            <Field label="Name" value={form.name} onChangeText={set('name')} placeholder="e.g. GST" />
            <Field label="Percentage (%)" value={form.percentage} onChangeText={set('percentage')} placeholder="e.g. 10" keyboardType="decimal-pad" />
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {['EXCLUDED', 'INCLUDED'].map(t => (
                  <TouchableOpacity key={t} style={[styles.typeOption, form.type === t && styles.typeOptionActive]} onPress={() => set('type')(t)}>
                    <Text style={[styles.typeText, form.type === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// ─── Misc Charges tab ─────────────────────────────────────────────────────────
const MiscTab = ({ canManage }) => {
  const { data: raw = [], isLoading } = useMiscCharges();
  const { mutateAsync: create, isPending: creating } = useCreateMiscCharge();
  const { mutateAsync: update, isPending: updating } = useUpdateMiscCharge();
  const { mutate: remove } = useDeleteMiscCharge();

  const miscList = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', amount: '', type: 'fixed' });
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = () => { setEditing(null); setForm({ name: '', amount: '', type: 'fixed' }); setShowModal(true); };
  const openEdit = item => {
    setEditing(item);
    setForm({ name: item.name ?? '', amount: String(item.amount ?? ''), type: item.type ?? 'fixed' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) { Alert.alert('Error', 'Name and amount are required'); return; }
    try {
      const payload = { name: form.name, amount: parseFloat(form.amount), type: form.type };
      if (editing) {
        await update({ id: editing.id, ...payload });
      } else {
        await create(payload);
      }
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const isSaving = creating || updating;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Misc Charges</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Charge</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : miscList.map(mc => (
        <View key={mc.id} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{mc.name}</Text>
            <Text style={styles.rowSub}>{mc.type === 'percentage' ? `${mc.amount}%` : `$${mc.amount}`} · {mc.type}</Text>
          </View>
          {canManage && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(mc)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.delBtn}
                onPress={() => Alert.alert('Delete Charge', `Delete "${mc.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => remove(mc.id) },
                ])}
              >
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {!isLoading && miscList.length === 0 && <Text style={styles.empty}>No misc charges configured.</Text>}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Charge' : 'New Misc Charge'}</Text>
            <Field label="Name" value={form.name} onChangeText={set('name')} placeholder="e.g. Service Fee" />
            <Field label="Amount" value={form.amount} onChangeText={set('amount')} placeholder="e.g. 5" keyboardType="decimal-pad" />
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {['fixed', 'percentage'].map(t => (
                  <TouchableOpacity key={t} style={[styles.typeOption, form.type === t && styles.typeOptionActive]} onPress={() => set('type')(t)}>
                    <Text style={[styles.typeText, form.type === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
const SettingsScreen = () => {
  const perms = usePermissions();
  const canManageTaxes = perms.can(PERMISSIONS.MANAGE_TAXES);
  const canManageMisc = perms.can(PERMISSIONS.MANAGE_MISC);
  const [tab, setTab] = useState('business');

  const TABS = [
    { key: 'business', label: 'Business' },
    { key: 'taxes',    label: 'Taxes' },
    { key: 'misc',     label: 'Misc' },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'business' && <BusinessTab />}
      {tab === 'taxes'    && <TaxesTab canManage={canManageTaxes} />}
      {tab === 'misc'     && <MiscTab  canManage={canManageMisc} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  body: { padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, gap: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  pickerBtnText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  pickerChevron: { fontSize: 12, color: colors.secondary },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 320, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeOption: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#D0D5DD', paddingVertical: 10, alignItems: 'center' },
  typeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
});

export default SettingsScreen;
