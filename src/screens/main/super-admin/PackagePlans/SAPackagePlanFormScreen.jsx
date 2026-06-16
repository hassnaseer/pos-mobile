import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  useCreateSAPackagePlan, useUpdateSAPackagePlan,
  useSABusinessTypes, useSAPermissions,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const PERIODS = ['monthly', 'quarterly', 'yearly'];

const SAPackagePlanFormScreen = ({ route, navigation }) => {
  const { plan } = route.params ?? {};
  const isEdit = !!plan;

  const [form, setForm] = useState({
    name:        plan?.name ?? '',
    description: plan?.description ?? '',
    price:       String(plan?.price ?? ''),
    period:      plan?.period ?? 'monthly',
    maxBranches: String(plan?.maxBranches ?? 1),
    maxStaff:    String(plan?.maxStaff ?? 0),
    maxProducts: String(plan?.maxProducts ?? 0),
    maxCustomers:String(plan?.maxCustomers ?? 0),
    ctaLabel:    plan?.ctaLabel ?? 'Get Started',
    sortOrder:   String(plan?.sortOrder ?? 0),
    featuresText:plan?.featuresText ?? (plan?.features ?? []).join('\n'),
    businessTypeId: String(plan?.businessTypeId ?? plan?.businessType?.id ?? ''),
    isPopular:   plan?.isPopular ?? false,
    isActive:    plan?.isActive ?? true,
    permissionIds: (plan?.permissions ?? []).map(p => String(p.id ?? p)),
  });
  const [saving, setSaving] = useState(false);

  const { data: rawTypes = [] } = useSABusinessTypes();
  const { data: rawPerms = [] } = useSAPermissions();
  const types = Array.isArray(rawTypes) ? rawTypes : (rawTypes?.data ?? []);
  const perms = Array.isArray(rawPerms) ? rawPerms : (rawPerms?.data ?? []);

  const { mutateAsync: create } = useCreateSAPackagePlan();
  const { mutateAsync: update } = useUpdateSAPackagePlan();

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const togglePerm = id => {
    const sid = String(id);
    set({ permissionIds: form.permissionIds.includes(sid)
      ? form.permissionIds.filter(p => p !== sid)
      : [...form.permissionIds, sid] });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Plan name is required'); return; }
    const payload = {
      name:         form.name.trim(),
      description:  form.description.trim(),
      price:        parseFloat(form.price) || 0,
      period:       form.period,
      maxBranches:  parseInt(form.maxBranches) || 1,
      maxStaff:     parseInt(form.maxStaff) || 0,
      maxProducts:  parseInt(form.maxProducts) || 0,
      maxCustomers: parseInt(form.maxCustomers) || 0,
      ctaLabel:     form.ctaLabel,
      sortOrder:    parseInt(form.sortOrder) || 0,
      featuresText: form.featuresText,
      isPopular:    form.isPopular,
      isActive:     form.isActive,
      businessTypeId: form.businessTypeId ? parseInt(form.businessTypeId) : undefined,
      permissionIds: form.permissionIds.length ? form.permissionIds : undefined,
    };
    setSaving(true);
    try {
      if (isEdit) await update({ id: plan.id, ...payload });
      else await create(payload);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Save failed');
    } finally { setSaving(false); }
  };

  const permByCategory = perms.reduce((acc, p) => {
    const cat = p.category ?? 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const TextField = ({ fieldKey, label, placeholder, keyboard, multiline, lines }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: lines ? lines * 22 + 24 : 80, textAlignVertical: 'top' }]}
        value={form[fieldKey]}
        onChangeText={v => set({ [fieldKey]: v })}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        numberOfLines={lines}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <TextField fieldKey="name"        label="Plan Name *"           placeholder="e.g. Starter" />
        <TextField fieldKey="description" label="Description"           placeholder="Short description" multiline lines={3} />
        <TextField fieldKey="price"       label="Price"                 placeholder="0.00" keyboard="numeric" />
        <TextField fieldKey="ctaLabel"    label="CTA Button Label"      placeholder="Get Started" />
        <TextField fieldKey="sortOrder"   label="Sort Order"            placeholder="0" keyboard="numeric" />
        <TextField fieldKey="featuresText" label="Features (one per line)" placeholder={"Feature 1\nFeature 2"} multiline lines={4} />

        {/* Limits row */}
        <View style={styles.field}>
          <Text style={styles.label}>Limits <Text style={styles.hint}>(0 = unlimited)</Text></Text>
          <View style={styles.limitsRow}>
            {[
              ['maxBranches',  'Branches'],
              ['maxStaff',     'Staff'],
              ['maxProducts',  'Products'],
              ['maxCustomers', 'Customers'],
            ].map(([k, l]) => (
              <View key={k} style={styles.limitField}>
                <Text style={styles.limitLabel}>{l}</Text>
                <TextInput style={styles.limitInput} value={form[k]} onChangeText={v => set({ [k]: v })}
                  keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
            ))}
          </View>
        </View>

        {/* Period */}
        <View style={styles.field}>
          <Text style={styles.label}>Billing Period</Text>
          <View style={styles.chipWrap}>
            {PERIODS.map(p => {
              const active = form.period === p;
              return (
                <TouchableOpacity key={p} style={[styles.chip, active && styles.chipActive]} onPress={() => set({ period: p })}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Business Type */}
        {types.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Business Type</Text>
            <View style={styles.chipWrap}>
              {[{ id: '', name: 'None' }, ...types].map(t => {
                const active = form.businessTypeId === String(t.id);
                return (
                  <TouchableOpacity key={t.id || 'none'} style={[styles.chip, { borderColor: '#7c3aed' }, active && { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }]}
                    onPress={() => set({ businessTypeId: String(t.id) })}>
                    <Text style={[styles.chipText, { color: '#7c3aed' }, active && { color: '#fff' }]}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Permissions */}
        {perms.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Permissions</Text>
            <Text style={styles.hint}>Features enabled for subscribers of this plan</Text>
            {Object.entries(permByCategory).map(([cat, catPerms]) => (
              <View key={cat} style={{ marginBottom: 10 }}>
                <Text style={styles.catLabel}>{cat}</Text>
                <View style={styles.chipWrap}>
                  {catPerms.map(p => {
                    const active = form.permissionIds.includes(String(p.id));
                    return (
                      <TouchableOpacity key={p.id}
                        style={[styles.chip, { borderColor: '#1e40af' }, active && { backgroundColor: '#1e40af', borderColor: '#1e40af' }]}
                        onPress={() => togglePerm(p.id)}>
                        <Text style={[styles.chipText, { color: '#1e40af' }, active && { color: '#fff' }]}>{p.name ?? p.code}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Switches */}
        <View style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Mark as Popular</Text>
              <Text style={styles.hint}>Highlighted on the pricing page</Text>
            </View>
            <Switch value={form.isPopular} onValueChange={v => set({ isPopular: v })}
              trackColor={{ false: '#D0D5DD', true: '#f59e0b' }} thumbColor="#fff" />
          </View>
          <View style={[styles.switchRow, { borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 14, marginTop: 4 }]}>
            <View>
              <Text style={styles.label}>Active</Text>
              <Text style={styles.hint}>Inactive plans won't appear on the pricing page</Text>
            </View>
            <Switch value={form.isActive} onValueChange={v => set({ isActive: v })}
              trackColor={{ false: '#D0D5DD', true: colors.primary }} thumbColor="#fff" />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveText}>{isEdit ? 'Update Plan' : 'Create Plan'}</Text>}
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
  label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 4 },
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  req: { color: '#ef4444' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa' },
  limitsRow: { flexDirection: 'row', gap: 10 },
  limitField: { flex: 1 },
  limitLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280', marginBottom: 4 },
  limitInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa', textAlign: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.primary },
  chipTextActive: { color: '#fff' },
  catLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  switchCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#6b7280' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default SAPackagePlanFormScreen;
