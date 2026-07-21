import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useUpdateSABusiness, useCreateSABusiness, useSABusinessTypes, useSAPackagePlans } from '../../../../services/api/posApi';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const STATUSES = ['Active', 'Trial', 'Expired', 'Blocked'];
const PLANS    = ['Monthly', 'Annual'];

const PickerField = ({ label, value, options, onSelect, getLabel = o => o.name, getValue = o => o.id, allowNone }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.chipWrap}>
      {allowNone && (
        <TouchableOpacity style={[styles.chip, !value && styles.chipActive]} onPress={() => onSelect('')}>
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>None</Text>
        </TouchableOpacity>
      )}
      {options.map(opt => {
        const active = value === getValue(opt);
        return (
          <TouchableOpacity key={getValue(opt)} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(getValue(opt))}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{getLabel(opt)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const SABusinessFormScreen = ({ route, navigation }) => {
  const { business } = route.params ?? {};
  const isEdit = !!business;

  const [form, setForm] = useState({
    name:       business?.name ?? '',
    ownerName:  business?.owner ?? business?.ownerName ?? '',
    email:      business?.email ?? '',
    phone:      business?.phone ?? '',
    password:   '',
    country:    business?.country ?? '',
    status:     business?.status ?? 'Trial',
    plan:       business?.plan ?? 'Monthly',
    expiryDate: business?.expiryDate ? business.expiryDate.split('T')[0] : '',
    businessTypeId: business?.businessTypeId ?? business?.businessType?.id ?? '',
    packagePlanId:  business?.packagePlanId ?? '',
  });
  const [saving, setSaving] = useState(false);

  const { data: rawTypes = [] } = useSABusinessTypes();
  const { data: rawPlans = [] } = useSAPackagePlans();
  const types = Array.isArray(rawTypes) ? rawTypes : (rawTypes?.data ?? []);
  const plans = Array.isArray(rawPlans) ? rawPlans : (rawPlans?.data ?? []);

  const { mutateAsync: updateBiz } = useUpdateSABusiness();
  const { mutateAsync: createBiz } = useCreateSABusiness();

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Business name is required'); return; }
    if (!isEdit && (!form.ownerName.trim() || !form.email.trim())) {
      Alert.alert('Error', 'Owner name and email are required'); return;
    }
    if (!isEdit && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address'); return;
    }
    // Phone is required on create; on edit, validate only if provided.
    const phoneDigits = (form.phone || '').replace(/\D/g, '');
    if (!isEdit && !form.phone.trim()) { Alert.alert('Error', 'Phone number is required'); return; }
    if (form.phone.trim() && phoneDigits.length < 7) {
      Alert.alert('Error', 'Please enter a valid phone number'); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const payload = {};
        if (form.name)           payload.name           = form.name.trim();
        if (form.ownerName)      payload.ownerName      = form.ownerName.trim();
        if (form.email)          payload.email          = form.email.trim();
        if (form.phone)          payload.phone          = form.phone.trim();
        if (form.country)        payload.country        = form.country.trim();
        if (form.status)         payload.status         = form.status;
        if (form.plan)           payload.plan            = form.plan;
        if (form.expiryDate)     payload.expiryDate      = form.expiryDate;
        if (form.businessTypeId) payload.businessTypeId  = form.businessTypeId;
        if (form.packagePlanId)  payload.packagePlanId   = form.packagePlanId;
        await updateBiz({ id: business.id, ...payload });
      } else {
        await createBiz({
          name: form.name.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          country: form.country.trim() || undefined,
          plan: form.plan,
          status: form.status,
          businessTypeId: form.businessTypeId || undefined,
          packagePlanId: form.packagePlanId || undefined,
          password: form.password || undefined,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : `Failed to ${isEdit ? 'update' : 'create'} business`);
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Text fields */}
        {[
          { key: 'name',       label: 'Business Name',    placeholder: 'Enter business name' },
          { key: 'ownerName',  label: 'Owner Name',       placeholder: 'Enter owner name' },
          { key: 'email',      label: 'Email',            placeholder: 'email@example.com', kb: 'email-address' },
          { key: 'phone',      label: 'Phone',            placeholder: '+1 234 567 8900',   kb: 'phone-pad' },
          { key: 'country',    label: 'Country',          placeholder: 'e.g. Pakistan' },
          ...(isEdit ? [] : [{ key: 'password', label: 'Owner Password', placeholder: 'Set initial login password', secure: true }]),
        ].map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={form[f.key]}
              onChangeText={v => set({ [f.key]: v })}
              placeholder={f.placeholder}
              placeholderTextColor="#9ca3af"
              keyboardType={f.kb ?? 'default'}
              secureTextEntry={f.secure}
              autoCapitalize="none"
            />
          </View>
        ))}

        {isEdit && (
          <DatePicker
            label="Expiry Date"
            value={form.expiryDate}
            onDateChange={v => set({ expiryDate: v })}
            placeholder="Select expiry date"
          />
        )}

        {types.length > 0 && (
          <PickerField label="Business Type" value={form.businessTypeId} options={types} onSelect={v => set({ businessTypeId: v })} allowNone />
        )}
        {plans.length > 0 && (
          <PickerField label="Package Plan" value={form.packagePlanId} options={plans} onSelect={v => set({ packagePlanId: v })} allowNone />
        )}

        {/* Status */}
        {isEdit && (
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chipWrap}>
              {STATUSES.map(s => {
                const active = form.status === s;
                const statusColors = {
                  Active: { border: '#16a34a', bg: '#dcfce7', text: '#16a34a' },
                  Trial:  { border: '#d97706', bg: '#fef3c7', text: '#d97706' },
                  Expired:{ border: '#dc2626', bg: '#fee2e2', text: '#dc2626' },
                  Blocked:{ border: '#6b7280', bg: '#f3f4f6', text: '#6b7280' },
                }[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { borderColor: statusColors.border }, active && { backgroundColor: statusColors.bg }]}
                    onPress={() => set({ status: s })}
                  >
                    <Text style={[styles.chipText, { color: statusColors.text }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Plan Period */}
        <View style={styles.field}>
          <Text style={styles.label}>Plan Period</Text>
          <View style={styles.chipWrap}>
            {PLANS.map(p => {
              const active = form.plan === p;
              return (
                <TouchableOpacity key={p} style={[styles.chip, active && styles.chipActive]} onPress={() => set({ plan: p })}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Create Business'}</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  body: { padding: 16, paddingBottom: 40 },
  field: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.primary },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#6b7280' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default SABusinessFormScreen;
