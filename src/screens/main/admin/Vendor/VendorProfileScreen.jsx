import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useVendorProfile, useUpdateVendorProfile } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const FIELDS = [
  { key: 'businessName',    label: 'Business Name' },
  { key: 'contactEmail',    label: 'Contact Email',    keyboard: 'email-address' },
  { key: 'contactPhone',    label: 'Contact Phone',    keyboard: 'phone-pad' },
  { key: 'address',         label: 'Address' },
  { key: 'description',     label: 'Description' },
  { key: 'website',         label: 'Website URL' },
];

const VendorProfileScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.can(PERMISSIONS.ACCESS_VENDOR);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const { data: profile = {}, isLoading } = useVendorProfile();
  const { mutateAsync: save, isPending: saving } = useUpdateVendorProfile();

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const handleSave = async () => {
    try {
      await save(form);
      setEditing(false);
      Alert.alert('Saved', 'Vendor profile updated.');
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
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

      {FIELDS.map(f => (
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

      {editing && (
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f4f6f9' },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:       { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  content:        { padding: 16, paddingBottom: 32 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading:        { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111' },
  editToggle:     { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editToggleText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  field:          { marginBottom: 16 },
  label:          { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7280', marginBottom: 4 },
  value:          { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111' },
  input:          { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111', backgroundColor: '#fff' },
  saveBtn:        { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:    { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 16 },
});

export default VendorProfileScreen;
