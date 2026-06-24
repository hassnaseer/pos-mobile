import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Switch, ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import {
  useSAPlatformSettings, useUpdateSAPlatformSetting,
  useSABankAccounts, useCreateSABankAccount, useUpdateSABankAccount, useDeleteSABankAccount,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

// ─── Setting key → label / description ───────────────────────────────────────
const LABELS = {
  trial_days_business_owner:           'Trial Days',
  trial_max_products:                  'Max Products (Trial)',
  trial_max_staff:                     'Max Staff (Trial)',
  trial_max_branches:                  'Max Branches (Trial)',
  extra_slot_price:                    'Extra Staff Slot Price ($/slot/month)',
  extra_branch_slot_price:             'Extra Branch Slot Price ($/slot/month)',
  maintenance_mode:                    'Maintenance Mode',
  announcement_enabled:                'Global Announcement',
  announcement_text:                   'Announcement Text',
  notifications_enabled:               'Push Notifications',
  payment_method_swich_enabled:        'Swich Card Payment',
  payment_method_bank_transfer_enabled:'Bank Transfer Payment',
  token_lifetime_minutes:              'Session Token Lifetime',
  apk_download_url:                    'APK Download URL',
};
const DESCS = {
  trial_days_business_owner:           'Trial days granted to business owners.',
  trial_max_products:                  'Max products allowed during trial period.',
  trial_max_staff:                     'Max staff members allowed during trial period.',
  trial_max_branches:                  'Max branches allowed during trial period.',
  extra_slot_price:                    'Monthly price per extra staff slot.',
  extra_branch_slot_price:             'Monthly price per extra branch slot.',
  maintenance_mode:                    'Disable all business logins platform-wide.',
  announcement_enabled:                'Show announcement banner to all users.',
  announcement_text:                   'Text shown in the global announcement banner.',
  notifications_enabled:               'Send push notifications to all users.',
  payment_method_swich_enabled:        'Show Swich card payment option on billing pages.',
  payment_method_bank_transfer_enabled:'Show bank transfer option on billing pages.',
  token_lifetime_minutes:              'How long users stay logged in before being forced to re-login.',
  apk_download_url:                    'Direct link to the Android APK for the landing page and portal sidebar.',
};

// Toggle-type settings (boolean string "true"/"false")
const TOGGLE_KEYS = new Set([
  'maintenance_mode', 'announcement_enabled', 'notifications_enabled',
  'payment_method_swich_enabled', 'payment_method_bank_transfer_enabled',
]);

// Email template settings
const EMAIL_KEYS = new Set([
  'signup_email_subject', 'signup_email_body',
  'expiry_warning_subject', 'expiry_warning_body',
  'blocked_email_subject', 'blocked_email_body',
]);

function fmtEmailLabel(name) {
  return name.replace(/_/g, ' ').replace(/\b(email|subject|body)\b/gi, w => w.toUpperCase())
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Token lifetime presets ───────────────────────────────────────────────────
const TOKEN_PRESETS = [
  { label: '30 min',  value: 30 },
  { label: '1 hour',  value: 60 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '1 day',   value: 1440 },
  { label: '7 days',  value: 10080 },
  { label: '30 days', value: 43200 },
];

function toTokenLabel(m) {
  if (m < 60) return `${m} min`;
  if (m < 1440) { const h = m / 60; return `${h} hr${h !== 1 ? 's' : ''}`; }
  const d = m / 1440; return `${d} day${d !== 1 ? 's' : ''}`;
}

// ─── Shared section card ──────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
    <View style={styles.cardBody}>{children}</View>
  </View>
);

// ─── Mobile App Card ──────────────────────────────────────────────────────────
const MobileAppCard = ({ settingMap, local, set, onSave }) => {
  const [focused, setFocused] = useState(false);
  const apkUrl = local['apk_download_url'] ?? '';
  const hasUrl = apkUrl.trim().length > 0;

  const save = () => {
    const s = settingMap['apk_download_url'];
    if (s) onSave(s.id, apkUrl);
  };

  const clear = () => {
    Alert.alert('Remove APK', 'This will hide the download link from users.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          set('apk_download_url', '');
          const s = settingMap['apk_download_url'];
          if (s) onSave(s.id, '');
        },
      },
    ]);
  };

  return (
    <SectionCard
      title="Mobile App"
      subtitle="Paste the APK download URL below. When set, users see a Download button on the landing page and portal sidebar. When empty, 'Coming Soon' is shown instead."
    >
      {hasUrl ? (
        <View style={styles.apkUrlBox}>
          <Text style={styles.apkUrlLabel}>Current URL</Text>
          <Text style={styles.apkUrlText} numberOfLines={2}>{apkUrl}</Text>
        </View>
      ) : (
        <View style={styles.apkEmptyBox}>
          <Text style={styles.apkEmptyText}>No APK set — users see "Coming Soon"</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{hasUrl ? 'Update URL' : 'APK Download URL'}</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={apkUrl}
          onChangeText={v => set('apk_download_url', v)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="https://..."
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.fieldDesc}>
          Upload the APK from the web SA settings, then paste the URL here. Or upload to any host and paste the direct link.
        </Text>
      </View>

      <View style={styles.apkActions}>
        <TouchableOpacity style={styles.apkSaveBtn} onPress={save}>
          <Text style={styles.apkSaveBtnText}>Save URL</Text>
        </TouchableOpacity>
        {hasUrl && (
          <TouchableOpacity style={styles.apkClearBtn} onPress={clear}>
            <Text style={styles.apkClearBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </SectionCard>
  );
};

// ─── General Settings tab ─────────────────────────────────────────────────────
const GeneralTab = ({ settingMap, saving, onSave }) => {
  const [local, setLocal] = useState({});

  useEffect(() => {
    const init = {};
    for (const key of Object.keys(LABELS)) {
      if (!EMAIL_KEYS.has(key)) init[key] = settingMap[key]?.value ?? '';
    }
    setLocal(init);
  }, [settingMap]);

  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }));

  const saveKey = key => {
    const s = settingMap[key];
    if (s) onSave(s.id, local[key]);
  };

  const NumberField = ({ settingKey }) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{LABELS[settingKey]}</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={String(local[settingKey] ?? '')}
          onChangeText={v => set(settingKey, v)}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); saveKey(settingKey); }}
          placeholder="0"
          placeholderTextColor="#aaa"
        />
        {DESCS[settingKey] ? <Text style={styles.fieldDesc}>{DESCS[settingKey]}</Text> : null}
      </View>
    );
  };

  const ToggleRow = ({ settingKey }) => (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{LABELS[settingKey]}</Text>
        {DESCS[settingKey] ? <Text style={styles.toggleDesc}>{DESCS[settingKey]}</Text> : null}
      </View>
      <Switch
        value={local[settingKey] === 'true'}
        onValueChange={v => {
          const val = v ? 'true' : 'false';
          set(settingKey, val);
          const s = settingMap[settingKey];
          if (s) onSave(s.id, val);
        }}
        trackColor={{ false: '#D0D5DD', true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  const TextAreaField = ({ settingKey }) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{LABELS[settingKey]}</Text>
        <TextInput
          style={[styles.input, styles.inputMulti, focused && styles.inputFocused]}
          value={String(local[settingKey] ?? '')}
          onChangeText={v => set(settingKey, v)}
          multiline
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); saveKey(settingKey); }}
          placeholder={DESCS[settingKey] ?? ''}
          placeholderTextColor="#aaa"
        />
      </View>
    );
  };

  const tokenMinutes = parseInt(local['token_lifetime_minutes'] ?? '10080', 10) || 10080;

  return (
    <ScrollView contentContainerStyle={styles.tabBody} keyboardShouldPersistTaps="handled">
      <SectionCard
        title="Trial Configuration"
        subtitle="Settings applied when a new business starts their trial."
      >
        <NumberField settingKey="trial_days_business_owner" />
      </SectionCard>

      <SectionCard
        title="Trial Limits"
        subtitle="Feature restrictions applied during the trial period."
      >
        <NumberField settingKey="trial_max_products" />
        <NumberField settingKey="trial_max_staff" />
        <NumberField settingKey="trial_max_branches" />
      </SectionCard>

      <SectionCard
        title="Extra Slot Pricing"
        subtitle="Monthly price charged when business owners purchase extra staff or branch slots."
      >
        <NumberField settingKey="extra_slot_price" />
        <NumberField settingKey="extra_branch_slot_price" />
      </SectionCard>

      <SectionCard title="System Settings">
        <ToggleRow settingKey="maintenance_mode" />
        <View style={styles.divider} />
        <ToggleRow settingKey="announcement_enabled" />
        <View style={styles.divider} />
        {local['announcement_enabled'] === 'true' && (
          <>
            <TextAreaField settingKey="announcement_text" />
            <View style={styles.divider} />
          </>
        )}
        <ToggleRow settingKey="notifications_enabled" />
        <View style={styles.divider} />
        <ToggleRow settingKey="payment_method_swich_enabled" />
        <View style={styles.divider} />
        <ToggleRow settingKey="payment_method_bank_transfer_enabled" />
      </SectionCard>

      <SectionCard
        title="Security & Sessions"
        subtitle="Control how long users stay logged in. Changing this forces re-login for all active sessions."
      >
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>Current: {toTokenLabel(tokenMinutes)}</Text>
        </View>

        <Text style={styles.fieldLabel}>Quick Presets</Text>
        <View style={styles.presetRow}>
          {TOKEN_PRESETS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.presetChip, tokenMinutes === p.value && styles.presetChipActive]}
              onPress={() => {
                set('token_lifetime_minutes', String(p.value));
                const s = settingMap['token_lifetime_minutes'];
                if (s) onSave(s.id, String(p.value));
              }}
            >
              <Text style={[styles.presetChipText, tokenMinutes === p.value && styles.presetChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Custom Value (minutes)</Text>
        <TextInput
          style={styles.input}
          value={String(local['token_lifetime_minutes'] ?? '10080')}
          onChangeText={v => set('token_lifetime_minutes', v)}
          keyboardType="number-pad"
          placeholder="e.g. 480"
          placeholderTextColor="#aaa"
          onBlur={() => saveKey('token_lifetime_minutes')}
        />
        <Text style={styles.fieldDesc}>Minimum 1 minute. Change takes effect immediately for all active users.</Text>
      </SectionCard>

      <MobileAppCard settingMap={settingMap} local={local} set={set} onSave={onSave} />
    </ScrollView>
  );
};

// ─── Email Templates tab ──────────────────────────────────────────────────────
const EmailTab = ({ settingMap, onSave }) => {
  const [local, setLocal] = useState({});

  useEffect(() => {
    const init = {};
    for (const key of EMAIL_KEYS) init[key] = settingMap[key]?.value ?? '';
    setLocal(init);
  }, [settingMap]);

  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }));
  const saveKey = key => {
    const s = settingMap[key];
    if (s) onSave(s.id, local[key]);
  };

  const EMAIL_GROUPS = [
    { label: 'Welcome (Signup)', keys: ['signup_email_subject', 'signup_email_body'] },
    { label: 'Expiry Warning',   keys: ['expiry_warning_subject', 'expiry_warning_body'] },
    { label: 'Account Blocked',  keys: ['blocked_email_subject', 'blocked_email_body'] },
  ];

  return (
    <ScrollView contentContainerStyle={styles.tabBody} keyboardShouldPersistTaps="handled">
      <SectionCard title="Email Notification Templates">
        {EMAIL_GROUPS.map((group, gi) => (
          <View key={group.label}>
            {gi > 0 && <View style={[styles.divider, { marginVertical: 16 }]} />}
            <Text style={styles.emailGroupLabel}>{group.label}</Text>
            {group.keys.map(key => {
              const isBody = key.includes('body');
              const [focused, setFocused] = useState(false);
              return (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{fmtEmailLabel(key)}</Text>
                  <TextInput
                    style={[styles.input, isBody && styles.inputMulti, focused && styles.inputFocused]}
                    value={String(local[key] ?? '')}
                    onChangeText={v => set(key, v)}
                    multiline={isBody}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); saveKey(key); }}
                    placeholderTextColor="#aaa"
                    placeholder={isBody ? 'Email body…' : 'Email subject…'}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );
};

// ─── Bank Accounts tab ────────────────────────────────────────────────────────
const EMPTY_ACCOUNT = { bankName: '', accountName: '', accountNumber: '', iban: '', currency: 'PKR', branchCode: '', branchName: '', swiftCode: '', isActive: true };

const BankAccountsTab = () => {
  const { data: raw = [], isLoading, refetch } = useSABankAccounts();
  const { mutateAsync: create, isPending: creating } = useCreateSABankAccount();
  const { mutateAsync: update, isPending: updating } = useUpdateSABankAccount();
  const { mutateAsync: remove } = useDeleteSABankAccount();

  const accounts = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_ACCOUNT); setShowModal(true); };
  const openEdit = acc => {
    setEditTarget(acc);
    setForm({
      bankName: acc.bankName ?? '',
      accountName: acc.accountName ?? '',
      accountNumber: acc.accountNumber ?? '',
      iban: acc.iban ?? '',
      currency: acc.currency ?? 'PKR',
      branchCode: acc.branchCode ?? '',
      branchName: acc.branchName ?? '',
      swiftCode: acc.swiftCode ?? '',
      isActive: acc.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      Alert.alert('Error', 'Bank name, account name, and account number are required');
      return;
    }
    try {
      editTarget ? await update({ id: editTarget.id, ...form }) : await create(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const handleDelete = acc => Alert.alert('Delete', `Delete "${acc.bankName}" account?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await remove(acc.id); } },
  ]);

  return (
    <ScrollView
      contentContainerStyle={styles.tabBody}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.bankHeader}>
        <Text style={styles.bankHeaderSub}>Configure bank accounts shown to tenants for manual payment.</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Account</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : accounts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No bank accounts configured yet.</Text>
        </View>
      ) : (
        accounts.map(acc => (
          <View key={acc.id} style={styles.bankCard}>
            <View style={styles.bankCardHeader}>
              <View>
                <Text style={styles.bankName}>{acc.bankName}</Text>
                {!acc.isActive && (
                  <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>
                )}
              </View>
              <View style={styles.bankActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(acc)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(acc)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.bankGrid}>
              {[
                ['Account Name',   acc.accountName],
                ['Account Number', acc.accountNumber],
                ['Currency',       acc.currency],
                ['IBAN',           acc.iban],
                ['Branch Code',    acc.branchCode],
                ['Branch Name',    acc.branchName],
                ['Swift Code',     acc.swiftCode],
              ].filter(([, v]) => v).map(([label, value]) => (
                <View key={label} style={styles.bankGridItem}>
                  <Text style={styles.bankGridLabel}>{label}</Text>
                  <Text style={styles.bankGridValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editTarget ? 'Edit Bank Account' : 'New Bank Account'}</Text>
            {[
              { key: 'bankName',      label: 'Bank Name *',      keyboard: 'default' },
              { key: 'accountName',   label: 'Account Name *',   keyboard: 'default' },
              { key: 'accountNumber', label: 'Account Number *', keyboard: 'default' },
              { key: 'iban',          label: 'IBAN',             keyboard: 'default' },
              { key: 'currency',      label: 'Currency',         keyboard: 'default' },
              { key: 'branchCode',    label: 'Branch Code',      keyboard: 'default' },
              { key: 'branchName',    label: 'Branch Name',      keyboard: 'default' },
              { key: 'swiftCode',     label: 'Swift Code',       keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={set(f.key)}
                  placeholder={f.label}
                  placeholderTextColor="#aaa"
                  keyboardType={f.keyboard}
                />
              </View>
            ))}
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Active (shown to tenants)</Text>
              <Switch
                value={form.isActive}
                onValueChange={set('isActive')}
                trackColor={{ false: '#D0D5DD', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveModalBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const SASettingsScreen = () => {
  const { data: settings = [], isLoading, refetch } = useSAPlatformSettings();
  const { mutateAsync: updateSetting, isPending: saving } = useUpdateSAPlatformSetting();
  const [tab, setTab] = useState('general');

  const settingList = Array.isArray(settings) ? settings : (settings?.data ?? []);

  const settingMap = useMemo(() => {
    const map = {};
    for (const s of settingList) map[s.settingName] = s;
    return map;
  }, [settingList]);

  const handleSave = async (id, value) => {
    try { await updateSetting({ id, value }); }
    catch { Alert.alert('Error', 'Failed to save setting'); }
  };

  const TABS = [
    { key: 'general', label: 'General Settings' },
    { key: 'email',   label: 'Email Templates' },
    { key: 'bank',    label: 'Bank Accounts' },
  ];

  if (isLoading && !settingList.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {tab === 'general' && (
        <GeneralTab settingMap={settingMap} saving={saving} onSave={handleSave} />
      )}
      {tab === 'email' && (
        <EmailTab settingMap={settingMap} onSave={handleSave} />
      )}
      {tab === 'bank' && <BankAccountsTab />}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Tab bar
  tabBarWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tabScroll: { flexGrow: 0 },
  tabRow: { flexDirection: 'row' },
  tab: { paddingVertical: 14, paddingHorizontal: 18 },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },

  // Section card
  tabBody: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 12 },
  cardBody: { marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  // Fields
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 6 },
  fieldDesc: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  inputFocused: { borderColor: colors.primary },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  // Toggle rows
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  toggleLabel: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  toggleDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  // Token presets
  currentBadge: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginBottom: 14 },
  currentBadgeText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6d28d9' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  presetChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  presetChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  presetChipTextActive: { color: '#fff' },

  // Email
  emailGroupLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 10 },

  // Bank Accounts
  bankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bankHeaderSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', flex: 1, marginRight: 10 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  bankCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bankName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  inactiveBadge: { backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  inactiveBadgeText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  bankActions: { flexDirection: 'row', gap: 8 },
  editBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  deleteBtn: { borderWidth: 1, borderColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bankGridItem: { width: '45%' },
  bankGridLabel: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  bankGridValue: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginTop: 1 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6b7280' },
  saveModalBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveModalBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  // APK card
  apkUrlBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 10, marginBottom: 12 },
  apkUrlLabel: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  apkUrlText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#15803d' },
  apkEmptyBox: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12 },
  apkEmptyText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  apkActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  apkSaveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  apkSaveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff', fontSize: 13 },
  apkClearBtn: { borderWidth: 1, borderColor: '#fee2e2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  apkClearBtnText: { fontFamily: 'Outfit-SemiBold', color: '#dc2626', fontSize: 13 },
});

export default SASettingsScreen;
