import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Switch, ActivityIndicator, Alert,
} from 'react-native';
import {
  useAdminSettings, useUpdateAdminSettings,
  useClaimCategories, useCreateClaimCategory, useUpdateClaimCategory, useDeleteClaimCategory,
  useLeaveQuotas, useCreateLeaveQuota, useDeleteLeaveQuota,
  useDocumentCategories, useCreateDocumentCategory, useDeleteDocumentCategory,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
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

const PickerRow = ({ label, value, options, onSelect, disabled, lockedNote }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, disabled && { backgroundColor: '#f4f6f9', borderColor: '#e0e0e0' }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.pickerBtnText, disabled && { color: '#aaa' }]}>{value || 'Select…'}</Text>
        <Text style={styles.pickerChevron}>{disabled ? '🔒' : '▾'}</Text>
      </TouchableOpacity>
      {disabled && lockedNote ? (
        <Text style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Outfit-Regular', marginTop: 3 }}>{lockedNote}</Text>
      ) : null}
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
    name: '', ownerName: '', email: '', phone: '', country: '', address: '',
    registrationNumber: '', taxId: '', nationalId: '',
  });

  useEffect(() => {
    if (settings) setForm({
      name: settings.name ?? '',
      ownerName: settings.ownerName ?? '',
      email: settings.email ?? '',
      phone: settings.phone ?? '',
      country: settings.country ?? '',
      address: settings.address ?? '',
      registrationNumber: settings.registrationNumber ?? '',
      taxId: settings.taxId ?? '',
      nationalId: settings.nationalId ?? '',
    });
  }, [settings]);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Business name is required'); return; }
    try {
      // Merge with full settings so General tab fields are preserved
      await updateSettings({ ...settings, ...form });
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      {settings?.storeId && (
        <View style={styles.storeIdRow}>
          <Text style={styles.storeIdLabel}>Store ID</Text>
          <View style={styles.storeIdBadge}><Text style={styles.storeIdText}>{settings.storeId}</Text></View>
        </View>
      )}
      <Text style={styles.sectionTitle}>Business Information</Text>
      {settings?.businessType && (
        <View style={styles.field}>
          <Text style={styles.label}>Business Type</Text>
          <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#f9fafb' }]}>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 14, color: '#6b7280' }}>{settings.businessType}</Text>
          </View>
        </View>
      )}
      <Field label="Business Name" value={form.name} onChangeText={set('name')} placeholder="My Business" />
      <Field label="Owner Name" value={form.ownerName} onChangeText={set('ownerName')} placeholder="John Doe" />
      <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="email@business.com" keyboardType="email-address" />
      <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="+1 234 567 890" keyboardType="phone-pad" />
      <Field label="Country" value={form.country} onChangeText={set('country')} placeholder="United States" />
      <Field label="Address" value={form.address} onChangeText={set('address')} placeholder="123 Main St, City" />

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Legal & Documentation</Text>
      <Field label="Business Registration Number" value={form.registrationNumber} onChangeText={set('registrationNumber')} placeholder="e.g. 0012345-6" />
      <Field label="Tax ID / NTN / VAT Number" value={form.taxId} onChangeText={set('taxId')} placeholder="e.g. 1234567-8" />
      <Field label="Owner National ID / Passport No." value={form.nationalId} onChangeText={set('nationalId')} placeholder="ID or passport number" />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Business Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── General tab ──────────────────────────────────────────────────────────────
const GeneralTab = () => {
  const { data: settings, isLoading } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateAdminSettings();
  const { refreshCurrency } = useCurrency();
  const perms = usePermissions();
  const showVendorSuggestions = perms.can(PERMISSIONS.POS_SALES) || perms.can(PERMISSIONS.CREATE_TICKETS);
  const [form, setForm] = useState({
    currency: 'USD', timezone: 'UTC',
    openingTime: '', closingTime: '', invoiceTerms: '',
    defaultTaxRate: '', vendorSuggestions: false,
  });

  useEffect(() => {
    if (settings) setForm({
      currency: settings.currency ?? 'USD',
      timezone: settings.timezone ?? 'UTC',
      openingTime: settings.openingTime ?? '',
      closingTime: settings.closingTime ?? '',
      invoiceTerms: settings.invoiceTerms ?? '',
      defaultTaxRate: settings.defaultTaxRate != null ? String(settings.defaultTaxRate) : '',
      vendorSuggestions: settings.vendorSuggestions ?? false,
    });
  }, [settings]);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await updateSettings({
        ...settings,
        ...form,
        defaultTaxRate: form.defaultTaxRate ? parseFloat(form.defaultTaxRate) : null,
      });
      refreshCurrency();
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Regional</Text>
      <PickerRow
        label="Currency"
        value={form.currency}
        options={CURRENCIES.map(c => c.code)}
        onSelect={set('currency')}
        disabled={settings?.hasTransactions || settings?.hasHRMSActivity}
        lockedNote={
          settings?.hasTransactions
            ? 'Locked after first invoice'
            : settings?.hasHRMSActivity
              ? 'Locked after first HRMS financial record'
              : undefined
        }
      />
      <PickerRow label="Timezone" value={form.timezone} options={TIMEZONES} onSelect={set('timezone')} />

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Hours & Terms</Text>
      <Field label="Opening Time" value={form.openingTime} onChangeText={set('openingTime')} placeholder="09:00" />
      <Field label="Closing Time" value={form.closingTime} onChangeText={set('closingTime')} placeholder="18:00" />
      <Field label="Invoice Terms" value={form.invoiceTerms} onChangeText={set('invoiceTerms')} placeholder="Payment due within 30 days…" multiline />

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Sales & Financial</Text>
      <Field label="Default Tax Rate (%)" value={form.defaultTaxRate} onChangeText={set('defaultTaxRate')} placeholder="e.g. 10" keyboardType="decimal-pad" />
      {showVendorSuggestions && (
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Vendor Suggestions</Text>
            <Text style={styles.switchDesc}>Show vendor product suggestions at POS checkout</Text>
          </View>
          <Switch
            value={form.vendorSuggestions}
            onValueChange={set('vendorSuggestions')}
            trackColor={{ false: '#D0D5DD', true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save General Settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Configuration tab ───────────────────────────────────────────────────────
const CONFIG_ITEMS = [
  { label: 'Suppliers',          desc: 'Manage product suppliers and vendor contacts',        route: 'Suppliers',        permission: PERMISSIONS.MANAGE_SUPPLIERS },
  { label: 'Manufacturers',      desc: 'Manage device manufacturers and their models',        route: 'Manufacturers',    permission: PERMISSIONS.MANAGE_MANUFACTURERS },
  { label: 'Device Conditions',  desc: 'Manage condition options (New, Used, Refurbished…)', route: 'DeviceConditions', permission: PERMISSIONS.MANAGE_CONDITIONS },
  { label: 'Taxes',              desc: 'Configure tax rates and types for your business',     route: 'Taxes',            permission: PERMISSIONS.MANAGE_TAXES },
  { label: 'Categories',         desc: 'Organise products with a nested category tree',       route: 'Categories',       permission: PERMISSIONS.MANAGE_CATEGORIES },
  { label: 'Roles & Permissions',desc: 'Define staff roles and their access levels',          route: 'Roles',            permission: PERMISSIONS.MANAGE_STAFF },
  { label: 'Departments',        desc: 'Manage departments and organisational structure',     route: 'Departments',      permission: PERMISSIONS.MANAGE_DEPARTMENTS },
  { label: 'Ticket Statuses',    desc: 'Manage status options for repair ticket workflows',  route: 'TicketStatuses',   permission: PERMISSIONS.CREATE_TICKETS },
  { label: 'Misc Charges',       desc: 'Extra fees added at checkout (delivery, service…)',  route: 'MiscCharges',      permission: PERMISSIONS.MANAGE_MISC },
  { label: 'Appointment Types',  desc: 'Manage appointment type options for medical bookings', route: 'AppointmentTypes', permission: PERMISSIONS.ACCESS_MEDICAL },
];

const ConfigTab = ({ navigation }) => {
  const perms = usePermissions();

  const visible = CONFIG_ITEMS.filter(item =>
    item.permission == null || perms.can(item.permission),
  );

  const handlePress = item => {
    if (item.route) navigation?.navigate(item.route);
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.sectionTitle}>Configuration</Text>
      {visible.map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.configCard}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.configInfo}>
            <Text style={styles.configLabel}>{item.label}</Text>
            <Text style={styles.configDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// ─── HRMS Settings tab ───────────────────────────────────────────────────────
// Section: generic CRUD list (Claim Categories, Leave Quotas, Document Categories)
const CRUDSection = ({
  title, addLabel, items = [], isLoading,
  renderRow, onAdd, onDelete,
  formFields, formState, setFormState, onSave, saving, editTarget,
  canManage,
}) => {
  const [modal, setModal] = useState(false);

  const openAdd = () => { onAdd(); setModal(true); };
  const close   = () => setModal(false);

  return (
    <View style={styles.hrmsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>{addLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading
        ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        : items.length === 0
          ? <Text style={styles.empty}>None configured yet.</Text>
          : items.map((item, idx) => (
              <View key={item.id ?? idx} style={styles.row}>
                {renderRow(item)}
                {canManage && (
                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => Alert.alert(`Delete`, `Remove this ${title.slice(0, -1)}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
                    ])}
                  >
                    <Text style={styles.delText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
      }

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editTarget ? `Edit ${title.slice(0, -1)}` : addLabel}</Text>
            {formFields.map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={String(formState[f.key] ?? '')}
                  onChangeText={v => setFormState(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder ?? f.label}
                  placeholderTextColor="#999"
                  keyboardType={f.keyboard ?? 'default'}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1 }]}
                onPress={async () => { await onSave(); close(); }}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const HRMSTab = ({ canManage, onNavigateFingerprint }) => {
  // ── Claim Categories ──────────────────────────────────────────────────────
  const { data: claimCatsRaw = [], isLoading: loadingCC } = useClaimCategories();
  const { mutateAsync: createCC, isPending: creatingCC } = useCreateClaimCategory();
  const { mutateAsync: updateCC, isPending: updatingCC } = useUpdateClaimCategory();
  const { mutate: deleteCC } = useDeleteClaimCategory();
  const [ccForm, setCcForm] = useState({ name: '', description: '', defaultAmount: '' });
  const [ccEdit, setCcEdit] = useState(null);
  const claimCats = Array.isArray(claimCatsRaw) ? claimCatsRaw : (claimCatsRaw?.data ?? []);

  const openAddCC = () => { setCcEdit(null); setCcForm({ name: '', description: '', defaultAmount: '' }); };
  const handleSaveCC = async () => {
    if (!ccForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const payload = {
      name:          ccForm.name.trim(),
      description:   ccForm.description.trim() || undefined,
      defaultAmount: ccForm.defaultAmount ? parseFloat(ccForm.defaultAmount) : undefined,
    };
    if (ccEdit) await updateCC({ id: ccEdit.id, ...payload });
    else        await createCC(payload);
  };

  // ── Leave Quotas ─────────────────────────────────────────────────────────
  const { data: quotasRaw = [], isLoading: loadingLQ } = useLeaveQuotas();
  const { mutateAsync: createLQ, isPending: creatingLQ } = useCreateLeaveQuota();
  const { mutate: deleteLQ } = useDeleteLeaveQuota();
  const [lqForm, setLqForm] = useState({ title: '', totalDays: '' });
  const quotas = Array.isArray(quotasRaw) ? quotasRaw : (quotasRaw?.data ?? []);

  const openAddLQ = () => setLqForm({ title: '', totalDays: '' });
  const handleSaveLQ = async () => {
    if (!lqForm.title.trim() || !lqForm.totalDays) { Alert.alert('Error', 'Title and days are required'); return; }
    await createLQ({ title: lqForm.title.trim(), totalDays: parseInt(lqForm.totalDays, 10) });
  };

  // ── Document Categories ────────────────────────────────────────────────────
  const { data: docCatsRaw = [], isLoading: loadingDC } = useDocumentCategories();
  const { mutateAsync: createDC, isPending: creatingDC } = useCreateDocumentCategory();
  const { mutate: deleteDC } = useDeleteDocumentCategory();
  const [dcForm, setDcForm] = useState({ name: '' });
  const docCats = Array.isArray(docCatsRaw) ? docCatsRaw : (docCatsRaw?.data ?? []);

  const openAddDC = () => setDcForm({ name: '' });
  const handleSaveDC = async () => {
    if (!dcForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    await createDC({ name: dcForm.name.trim() });
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {/* Fingerprint Devices card */}
      {canManage && (
        <TouchableOpacity style={styles.fpCard} onPress={onNavigateFingerprint} activeOpacity={0.8}>
          <View style={styles.fpIconWrap}>
            <Text style={styles.fpIcon}>🖐️</Text>
          </View>
          <View style={styles.fpInfo}>
            <Text style={styles.fpTitle}>Fingerprint Devices</Text>
            <Text style={styles.fpSub}>Connect machines, sync attendance logs, map staff IDs</Text>
          </View>
          <Text style={styles.fpArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Claim Categories */}
      <CRUDSection
        title="Claim Categories"
        addLabel="+ Add"
        items={claimCats}
        isLoading={loadingCC}
        canManage={canManage}
        editTarget={ccEdit}
        formState={ccForm}
        setFormState={setCcForm}
        onAdd={openAddCC}
        onDelete={id => deleteCC(id)}
        onSave={handleSaveCC}
        saving={creatingCC || updatingCC}
        formFields={[
          { key: 'name',          label: 'Category Name *',     placeholder: 'e.g. Medical' },
          { key: 'description',   label: 'Description',          placeholder: 'Optional' },
          { key: 'defaultAmount', label: 'Default Amount',       placeholder: '0.00', keyboard: 'decimal-pad' },
        ]}
        renderRow={item => (
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{item.name}</Text>
            {item.description ? <Text style={styles.rowSub}>{item.description}</Text> : null}
            {item.defaultAmount ? <Text style={styles.rowSub}>Default: {item.defaultAmount}</Text> : null}
          </View>
        )}
      />

      {/* Leave Quotas */}
      <CRUDSection
        title="Leave Quotas"
        addLabel="+ Add"
        items={quotas}
        isLoading={loadingLQ}
        canManage={canManage}
        editTarget={null}
        formState={lqForm}
        setFormState={setLqForm}
        onAdd={openAddLQ}
        onDelete={id => deleteLQ(id)}
        onSave={handleSaveLQ}
        saving={creatingLQ}
        formFields={[
          { key: 'title',     label: 'Leave Type *',   placeholder: 'e.g. Sick Leave' },
          { key: 'totalDays', label: 'Total Days *',    placeholder: 'e.g. 6', keyboard: 'number-pad' },
        ]}
        renderRow={item => (
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{item.title}</Text>
            <Text style={styles.rowSub}>{item.totalDays} day{item.totalDays !== 1 ? 's' : ''}</Text>
          </View>
        )}
      />

      {/* Document Categories */}
      <CRUDSection
        title="Document Categories"
        addLabel="+ Add"
        items={docCats}
        isLoading={loadingDC}
        canManage={canManage}
        editTarget={null}
        formState={dcForm}
        setFormState={setDcForm}
        onAdd={openAddDC}
        onDelete={id => deleteDC(id)}
        onSave={handleSaveDC}
        saving={creatingDC}
        formFields={[
          { key: 'name', label: 'Category Name *', placeholder: 'e.g. Policy' },
        ]}
        renderRow={item => (
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{item.name}</Text>
          </View>
        )}
      />
    </ScrollView>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
const SettingsScreen = ({ navigation }) => {
  const perms = usePermissions();
  const hasHRMS           = perms.hasAnyHRMS();
  const canDeviceAttend   = perms.can(PERMISSIONS.DEVICE_ATTENDANCE);
  const [tab, setTab]     = useState('business');

  const TABS = [
    { key: 'business', label: 'Business' },
    { key: 'general',  label: 'General' },
    { key: 'config',   label: 'Configuration' },
    ...(hasHRMS ? [{ key: 'hrms', label: 'HRMS' }] : []),
  ];

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'business' && <BusinessTab />}
      {tab === 'general'  && <GeneralTab />}
      {tab === 'config'   && <ConfigTab navigation={navigation} />}
      {tab === 'hrms'     && (
        <HRMSTab
          canManage={canDeviceAttend || hasHRMS}
          onNavigateFingerprint={() => navigation?.navigate('FingerprintDevices')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  tabs: { flexDirection: 'row' },
  tab: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  // HRMS section
  hrmsSection: { marginBottom: 20 },
  fpCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 16, gap: 12 },
  fpIconWrap:{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fpIcon:    { fontSize: 22 },
  fpInfo:    { flex: 1 },
  fpTitle:   { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1D4ED8' },
  fpSub:     { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#3B82F6', marginTop: 2 },
  fpArrow:   { fontSize: 22, color: '#93C5FD' },
  body: { padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  storeIdRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  storeIdLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  storeIdBadge: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  storeIdText:  { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
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
  // Switch row (General tab)
  switchRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, gap: 12 },
  switchInfo: { flex: 1 },
  switchLabel:{ fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  switchDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  // Configuration tab
  configCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  configInfo: { flex: 1 },
  configLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  configDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  configArrow: { fontSize: 22, color: '#CBD5E1', fontFamily: 'Outfit-Regular' },
});

export default SettingsScreen;
