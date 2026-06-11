import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Switch,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useProfile, useUpdateProfile, useChangePassword } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const Field = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, editable = true }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#999"
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      editable={editable}
    />
  </View>
);

const ProfileScreen = () => {
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile();
  const { mutateAsync: changePassword, isPending: changingPw } = useChangePassword();

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: '', phoneNumber: '', address: '', bio: '' });
  const [requireOtp, setRequireOtp] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        address: profile.address ?? '',
        bio: profile.bio ?? '',
      });
      setRequireOtp(profile.requireOtpOnLogin ?? false);
    }
  }, [profile]);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));
  const setPw = key => val => setPwForm(p => ({ ...p, [key]: val }));

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      await updateProfile({ ...form, requireOtpOnLogin: requireOtp });
      Alert.alert('Success', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      Alert.alert('Error', 'All password fields are required');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      Alert.alert('Success', 'Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      Alert.alert('Error', err?.message ?? 'Failed to change password');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {[['profile', 'Profile'], ['password', 'Change Password']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {tab === 'profile' && (
          <>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                {profile?.profileImg
                  ? <Image source={{ uri: profile.profileImg }} style={styles.avatarImg} />
                  : <Text style={styles.avatarText}>{(profile?.name ?? 'U')[0].toUpperCase()}</Text>}
              </View>
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{profile?.name ?? '—'}</Text>
                <Text style={styles.avatarRole}>{profile?.role ?? '—'}</Text>
              </View>
            </View>

            <Field label="Full Name" value={form.name} onChangeText={set('name')} placeholder="Your name" />
            <Field label="Email" value={profile?.email ?? ''} placeholder="Email" editable={false} />
            <Field label="Phone Number" value={form.phoneNumber} onChangeText={set('phoneNumber')} placeholder="+1 234 567 890" keyboardType="phone-pad" />
            <Field label="Address" value={form.address} onChangeText={set('address')} placeholder="Your address" />
            <Field label="Bio" value={form.bio} onChangeText={set('bio')} placeholder="Tell us about yourself" />

            {/* OTP toggle */}
            <View style={styles.otpToggleRow}>
              <View style={styles.otpToggleInfo}>
                <Text style={styles.otpToggleLabel}>Require OTP on Login</Text>
                <Text style={styles.otpToggleDesc}>Send a verification code every time you sign in</Text>
              </View>
              <Switch
                value={requireOtp}
                onValueChange={val => {
                  setRequireOtp(val);
                  updateProfile({ requireOtpOnLogin: val }).catch(() => {});
                }}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </>
        )}

        {tab === 'password' && (
          <>
            <Text style={styles.sectionNote}>Choose a strong password with at least 8 characters.</Text>
            <Field label="Current Password" value={pwForm.currentPassword} onChangeText={setPw('currentPassword')} placeholder="••••••••" secureTextEntry />
            <Field label="New Password" value={pwForm.newPassword} onChangeText={setPw('newPassword')} placeholder="••••••••" secureTextEntry />
            <Field label="Confirm New Password" value={pwForm.confirmPassword} onChangeText={setPw('confirmPassword')} placeholder="••••••••" secureTextEntry />

            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={changingPw}>
              {changingPw ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Change Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  body: { padding: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 54, height: 54, borderRadius: 27 },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: 'Outfit-Bold' },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 17, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  avatarRole: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, textTransform: 'capitalize', marginTop: 2 },
  sectionNote: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  inputDisabled: { backgroundColor: '#f4f6f9', color: colors.secondary },
  saveBtn:          { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:      { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
  otpToggleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  otpToggleInfo:    { flex: 1, marginRight: 12 },
  otpToggleLabel:   { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  otpToggleDesc:    { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
});

export default ProfileScreen;
