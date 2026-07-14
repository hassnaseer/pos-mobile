import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useVendorProfile, useUpdateVendorProfile, useAdminSettings } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useAuth } from '../../../../context/AuthContext';
import { BASE_URL } from '../../../../services/api/globalApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../../theme/colors';

const EMPTY_FORM = {
  businessDescription: '', vendorCategory: '', website: '', phone: '', address: '',
  registrationNumber: '', taxId: '', ownerNationalId: '',
};

const LEGAL_FIELDS = [
  { key: 'registrationNumber', label: 'Business Registration Number', hint: "Issued by your country's company registrar — type or upload a scan" },
  { key: 'taxId', label: 'Tax ID / NTN / VAT Number', hint: 'National Tax Number, VAT, GST, or EIN — type or upload a scan' },
  { key: 'ownerNationalId', label: 'Owner National ID / Passport No.', hint: "Owner's government-issued ID — type or upload a scan" },
];

const FIELDS_BY_PERMISSION = {
  access_pharmacy: [
    { label: 'Drug License Number', placeholder: 'e.g. DL-12345' },
    { label: 'Pharmacy License Number', placeholder: 'e.g. PL-98765' },
    { label: 'Regulatory / NAFDAC Number', placeholder: 'e.g. NAFDAC-001' },
  ],
  access_factory: [
    { label: 'ISO Certification Number', placeholder: 'e.g. ISO 9001:2015' },
    { label: 'GMP Certificate Number', placeholder: 'e.g. GMP-2024-001' },
    { label: 'FDA Certificate Number', placeholder: 'e.g. FDA-00123' },
  ],
  access_medical: [
    { label: 'Medical License Number', placeholder: 'e.g. ML-12345' },
    { label: 'Regulatory / NAFDAC Number', placeholder: 'e.g. NAFDAC-001' },
  ],
  access_restaurant: [
    { label: 'FSSAI License Number', placeholder: 'e.g. 12345678901234' },
    { label: 'Halal Certificate Number', placeholder: 'e.g. JAKIM-1234' },
    { label: 'HACCP Certificate Number', placeholder: 'e.g. HACCP-2024-001' },
  ],
};
const MODULE_LABEL = { access_pharmacy: 'Pharmacy', access_factory: 'Medicine Factory', access_medical: 'Medical', access_restaurant: 'Restaurant' };

const getMetaFields = (codes = []) => {
  for (const code of Object.keys(FIELDS_BY_PERMISSION)) {
    if (codes.includes(code)) return FIELDS_BY_PERMISSION[code];
  }
  return [];
};
const getModuleLabel = (codes = []) => {
  for (const code of Object.keys(MODULE_LABEL)) {
    if (codes.includes(code)) return MODULE_LABEL[code];
  }
  return 'vendor';
};

const uploadFile = async (file) => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: file.uri, type: file.type ?? 'application/octet-stream', name: file.fileName ?? 'upload' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Upload failed');
  return json.data?.key ?? json.data?.url ?? '';
};

const VendorProfileScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorSeller();
  const { user } = useAuth();
  const businessCategory = user?.businessCategory ?? null;
  const metaFields = getMetaFields(perms.permissionCodes);
  const moduleLabel = getModuleLabel(perms.permissionCodes);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, vendorCategory: businessCategory ?? '' });
  const [meta, setMeta] = useState({});
  const [uploadingField, setUploadingField] = useState(null);

  const canAccessSettings = perms.isAdmin || perms.canAny(
    PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.MANAGE_SUPPLIERS, PERMISSIONS.MANAGE_MANUFACTURERS,
    PERMISSIONS.MANAGE_TAXES, PERMISSIONS.MANAGE_CONDITIONS, PERMISSIONS.MANAGE_BUSINESSES,
  );

  const { data: profile = null, isLoading } = useVendorProfile();
  const { data: settings } = useAdminSettings({ enabled: canAccessSettings });
  const { mutateAsync: save, isPending: saving } = useUpdateVendorProfile();

  useEffect(() => {
    const regNo = profile?.registrationNumber ?? settings?.registrationNumber ?? '';
    const taxId = profile?.taxId ?? settings?.taxId ?? '';
    const natId = profile?.ownerNationalId ?? settings?.nationalId ?? '';

    if (profile) {
      setForm({
        businessDescription: profile.businessDescription ?? '',
        vendorCategory: profile.vendorCategory ?? '',
        website: profile.website ?? '',
        phone: profile.phone ?? settings?.phone ?? '',
        address: profile.address ?? settings?.address ?? '',
        registrationNumber: regNo, taxId, ownerNationalId: natId,
      });
      setMeta(profile.meta ?? {});
    } else if (settings) {
      setForm(f => ({ ...f, phone: settings.phone ?? '', address: settings.address ?? '', registrationNumber: regNo, taxId, ownerNationalId: natId }));
    }
  }, [profile, settings]);

  const legalComplete = !!(form.registrationNumber?.trim() && form.taxId?.trim() && form.ownerNationalId?.trim());
  const isActive = profile?.status === 'active';
  const isSuspended = profile?.status === 'suspended';

  const handleSave = async () => {
    if (!legalComplete) {
      Alert.alert('Incomplete', 'Please fill in all Legal & Documentation fields to go live.');
      return;
    }
    try {
      await save({ ...form, vendorCategory: businessCategory ?? form.vendorCategory, meta: Object.keys(meta).length ? meta : undefined });
      setEditing(false);
      Alert.alert('Saved', profile ? 'Vendor profile updated.' : 'Your vendor profile is now live on the marketplace!');
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save profile'); }
  };

  const handleDocUpload = async (field) => {
    launchImageLibrary({ mediaType: 'mixed', selectionLimit: 1 }, async (res) => {
      if (res.didCancel || !res.assets?.length) return;
      const asset = res.assets[0];
      setUploadingField(field);
      try {
        const key = await uploadFile(asset);
        setForm(p => ({ ...p, [field]: key }));
        Alert.alert('Uploaded', 'Document uploaded successfully.');
      } catch (e) {
        Alert.alert('Upload failed', typeof e === 'string' ? e : 'Try again');
      } finally {
        setUploadingField(null);
      }
    });
  };

  if (!canAccess) {
    return <View style={styles.centered}><Text style={styles.noAccess}>No access to vendor profile.</Text></View>;
  }
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Vendor Profile</Text>
          <Text style={styles.subheading}>Fill in your business info and legal details — no approval needed.</Text>
        </View>
        {!isSuspended && (
          <TouchableOpacity style={styles.editToggle} onPress={() => setEditing(e => !e)}>
            <Text style={styles.editToggleText}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isActive && (
        <View style={[styles.banner, styles.bannerGreen]}>
          <Text style={styles.bannerTitleGreen}>Live on Marketplace</Text>
          <Text style={styles.bannerTextGreen}>Buyers can browse your listings on the marketplace.</Text>
        </View>
      )}
      {isSuspended && (
        <View style={[styles.banner, styles.bannerRed]}>
          <Text style={styles.bannerTitleRed}>Account Suspended</Text>
          {profile?.suspensionReason ? <Text style={styles.bannerTextRed}>Reason: {profile.suspensionReason}</Text> : null}
          <Text style={styles.bannerTextRed}>Contact platform support to resolve this.</Text>
        </View>
      )}
      {!profile && !isSuspended && (
        <View style={[styles.banner, styles.bannerBlue]}>
          <Text style={styles.bannerTextBlue}>Complete the form below — including Legal & Documentation — to instantly go live on the marketplace.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Business Information</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Business Description</Text>
        {editing ? (
          <TextInput style={[styles.input, styles.multiline]} value={form.businessDescription} onChangeText={v => setForm(p => ({ ...p, businessDescription: v }))} placeholder="Tell buyers about your business, what you sell, minimum orders, etc." placeholderTextColor="#999" multiline />
        ) : (
          <Text style={styles.value}>{profile?.businessDescription || '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Business Specialization 🔒</Text>
        <View style={styles.readonlyBox}>
          <Text style={businessCategory ? styles.readonlyValue : styles.readonlyPlaceholder}>{businessCategory ?? 'Not assigned'}</Text>
        </View>
        <Text style={styles.hint}>Assigned by the platform administrator — contact support to update</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        {editing ? (
          <TextInput style={styles.input} value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" placeholder="+92 300 0000000" placeholderTextColor="#999" />
        ) : (
          <Text style={styles.value}>{profile?.phone || settings?.phone || '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Website (optional)</Text>
        {editing ? (
          <TextInput style={styles.input} value={form.website} onChangeText={v => setForm(p => ({ ...p, website: v }))} placeholder="https://yourbusiness.com" placeholderTextColor="#999" autoCapitalize="none" />
        ) : (
          <Text style={styles.value}>{profile?.website || '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Business Address</Text>
        {editing ? (
          <TextInput style={[styles.input, styles.multiline]} value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} placeholder="Street, City, Province, Country" placeholderTextColor="#999" multiline />
        ) : (
          <Text style={styles.value}>{profile?.address || settings?.address || '—'}</Text>
        )}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Legal & Documentation</Text>
        <View style={[styles.completeBadge, legalComplete ? styles.completeBadgeGreen : styles.completeBadgeAmber]}>
          <Text style={[styles.completeBadgeText, { color: legalComplete ? '#16a34a' : '#b45309' }]}>{legalComplete ? 'Complete' : 'Required to go live'}</Text>
        </View>
      </View>

      {LEGAL_FIELDS.map(f => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label} *</Text>
          <View style={styles.docRow}>
            {editing ? (
              <TextInput style={[styles.input, { flex: 1 }]} value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={`Enter or upload`} placeholderTextColor="#999" />
            ) : (
              <Text style={[styles.value, { flex: 1 }]}>{profile?.[f.key] || settings?.[f.key === 'ownerNationalId' ? 'nationalId' : f.key] || '—'}</Text>
            )}
            {editing && (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => handleDocUpload(f.key)} disabled={uploadingField === f.key}>
                {uploadingField === f.key ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.uploadBtnText}>📎</Text>}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.hint}>{f.hint}</Text>
        </View>
      ))}
      {settings && (settings.registrationNumber || settings.taxId || settings.nationalId) && !profile && (
        <Text style={styles.prefillNote}>Legal details were pre-filled from your Business Settings — review and confirm before going live.</Text>
      )}

      {metaFields.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Compliance Details</Text>
          <Text style={styles.hint}>Required documentation for {moduleLabel} vendors</Text>
          {metaFields.map(f => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              {editing ? (
                <TextInput style={styles.input} value={meta[f.label] ?? ''} onChangeText={v => setMeta(p => ({ ...p, [f.label]: v }))} placeholder={f.placeholder} placeholderTextColor="#999" />
              ) : (
                <Text style={styles.value}>{meta[f.label] || '—'}</Text>
              )}
            </View>
          ))}
        </>
      )}

      {editing && (
        <>
          <TouchableOpacity style={[styles.saveBtn, (saving || isSuspended) && { opacity: 0.6 }]} onPress={handleSave} disabled={saving || isSuspended}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{!profile ? 'Go Live on Marketplace' : 'Update Profile'}</Text>}
          </TouchableOpacity>
          {!legalComplete && <Text style={styles.warnText}>Fill legal details to activate your vendor profile</Text>}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#f4f6f9' },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:           { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  content:            { padding: 16, paddingBottom: 32 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  heading:            { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111' },
  subheading:         { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  editToggle:         { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editToggleText:     { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  banner:             { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14 },
  bannerGreen:        { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  bannerTitleGreen:   { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#15803d' },
  bannerTextGreen:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#16a34a', marginTop: 2 },
  bannerRed:          { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  bannerTitleRed:     { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#b91c1c' },
  bannerTextRed:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#dc2626', marginTop: 2 },
  bannerBlue:         { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  bannerTextBlue:     { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#1d4ed8' },
  sectionTitle:       { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 8, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completeBadge:      { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  completeBadgeGreen: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  completeBadgeAmber: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  completeBadgeText:  { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  field:              { marginBottom: 16 },
  label:              { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7280', marginBottom: 4 },
  value:              { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111' },
  input:              { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111', backgroundColor: '#fff' },
  multiline:          { height: 70, textAlignVertical: 'top' },
  readonlyBox:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9FAFB' },
  readonlyValue:      { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#111' },
  readonlyPlaceholder:{ fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9CA3AF', fontStyle: 'italic' },
  hint:               { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 4 },
  docRow:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtn:          { width: 40, height: 42, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  uploadBtnText:      { fontSize: 18 },
  prefillNote:        { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#3b82f6', marginTop: -8, marginBottom: 12 },
  saveBtn:            { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:        { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 16 },
  warnText:           { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#b45309', textAlign: 'center', marginTop: 8 },
});

export default VendorProfileScreen;
