import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useVendorProfile, useUpdateVendorProfile } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useAuth } from '../../../../context/AuthContext';
import { BASE_URL } from '../../../../services/api/globalApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../../theme/colors';

const TEXT_FIELDS = [
  { key: 'businessName',  label: 'Business Name' },
  { key: 'contactEmail',  label: 'Contact Email',  keyboard: 'email-address' },
  { key: 'contactPhone',  label: 'Contact Phone',  keyboard: 'phone-pad' },
  { key: 'address',       label: 'Address' },
  { key: 'description',   label: 'Description' },
  { key: 'website',       label: 'Website URL' },
];

const DOC_FIELDS = [
  { key: 'registrationNumber', label: 'Business Registration No.' },
  { key: 'taxId',              label: 'Tax ID / NTN' },
  { key: 'ownerNationalId',    label: 'Owner National ID' },
];

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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [uploadingField, setUploadingField] = useState(null);

  const { data: profile = {}, isLoading } = useVendorProfile();
  const { mutateAsync: save, isPending: saving } = useUpdateVendorProfile();

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const handleSave = async () => {
    try {
      await save({ ...form, vendorCategory: businessCategory ?? form.vendorCategory });
      setEditing(false);
      Alert.alert('Saved', 'Vendor profile updated.');
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
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
        Alert.alert('Upload failed', e?.message ?? 'Try again');
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
        <Text style={styles.heading}>Vendor Profile</Text>
        <TouchableOpacity style={styles.editToggle} onPress={() => setEditing(e => !e)}>
          <Text style={styles.editToggleText}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Business Specialization — readonly */}
      <View style={styles.field}>
        <Text style={styles.label}>Business Specialization</Text>
        <View style={styles.readonlyBox}>
          <Text style={businessCategory ? styles.readonlyValue : styles.readonlyPlaceholder}>
            {businessCategory ?? 'Not assigned by Super Admin'}
          </Text>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      </View>

      {/* Editable text fields */}
      {TEXT_FIELDS.map(f => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={form[f.key] ?? ''}
              onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
              keyboardType={f.keyboard ?? 'default'}
              placeholder={f.label}
              placeholderTextColor="#999"
            />
          ) : (
            <Text style={styles.value}>{profile[f.key] || '—'}</Text>
          )}
        </View>
      ))}

      {/* Legal & Documentation */}
      <Text style={styles.sectionTitle}>Legal & Documentation</Text>
      {DOC_FIELDS.map(f => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <View style={styles.docRow}>
            {editing ? (
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form[f.key] ?? ''}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={`Enter or upload ${f.label}`}
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={[styles.value, { flex: 1 }]}>{profile[f.key] || '—'}</Text>
            )}
            {editing && (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handleDocUpload(f.key)}
                disabled={uploadingField === f.key}
              >
                {uploadingField === f.key
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.uploadBtnText}>📎</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {editing && (
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#f4f6f9' },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:           { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  content:            { padding: 16, paddingBottom: 32 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading:            { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111' },
  editToggle:         { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editToggleText:     { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  sectionTitle:       { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 8, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  field:              { marginBottom: 16 },
  label:              { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7280', marginBottom: 4 },
  value:              { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111' },
  input:              { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111', backgroundColor: '#fff' },
  readonlyBox:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9FAFB' },
  readonlyValue:      { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#111' },
  readonlyPlaceholder:{ fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9CA3AF', fontStyle: 'italic' },
  lockIcon:           { fontSize: 14 },
  docRow:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtn:          { width: 40, height: 42, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  uploadBtnText:      { fontSize: 18 },
  saveBtn:            { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:        { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 16 },
});

export default VendorProfileScreen;
