import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  useCreateSABusinessType, useUpdateSABusinessType,
  useSABusinessCategories, useSAPermissions,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const DASHBOARD_OPTIONS = [
  { value: '', label: 'Standard POS' },
  { value: 'hrms', label: 'HRMS' },
  { value: 'medical', label: 'Medical' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'factory', label: 'Factory' },
  { value: 'pharmacy', label: 'Pharmacy' },
];

const SABusinessTypeFormScreen = ({ route, navigation }) => {
  const { item } = route.params ?? {};
  const isEdit = !!item;

  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    active: item?.active !== false,
    primaryDashboard: item?.primaryDashboard ?? '',
    categoryId: String(item?.categoryId ?? item?.category?.id ?? ''),
    permissionIds: (item?.permissions ?? []).map(p => String(p.id ?? p)),
  });
  const [saving, setSaving] = useState(false);

  const { data: rawCats = [] } = useSABusinessCategories();
  const { data: rawPerms = [] } = useSAPermissions();
  const cats  = Array.isArray(rawCats) ? rawCats : (rawCats?.data ?? []);
  const perms = Array.isArray(rawPerms) ? rawPerms : (rawPerms?.data ?? []);

  const { mutateAsync: create } = useCreateSABusinessType();
  const { mutateAsync: update } = useUpdateSABusinessType();

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const togglePerm = id => {
    const sid = String(id);
    set({ permissionIds: form.permissionIds.includes(sid)
      ? form.permissionIds.filter(p => p !== sid)
      : [...form.permissionIds, sid] });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        active: form.active,
        primaryDashboard: form.primaryDashboard,
        categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
        permissionIds: form.permissionIds.length ? form.permissionIds : undefined,
      };
      if (isEdit) await update({ id: item.id, ...payload });
      else await create(payload);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Save failed');
    } finally { setSaving(false); }
  };

  // Group permissions by category
  const permByCategory = perms.reduce((acc, p) => {
    const cat = p.category ?? 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name <Text style={styles.req}>*</Text></Text>
          <TextInput style={styles.input} value={form.name} onChangeText={v => set({ name: v })}
            placeholder="e.g. Restaurant, Retail" placeholderTextColor="#9ca3af" />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.multiline]} value={form.description}
            onChangeText={v => set({ description: v })} placeholder="Brief description (optional)"
            placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        {/* Primary Dashboard */}
        <View style={styles.field}>
          <Text style={styles.label}>Primary Dashboard</Text>
          <Text style={styles.hint}>Where admins land after login</Text>
          <View style={styles.chipWrap}>
            {DASHBOARD_OPTIONS.map(opt => {
              const active = form.primaryDashboard === opt.value;
              return (
                <TouchableOpacity key={opt.value || 'pos'} style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set({ primaryDashboard: opt.value })}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Business Category */}
        {cats.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Business Category</Text>
            <Text style={styles.hint}>Owners under this type inherit this category</Text>
            <View style={styles.chipWrap}>
              {[{ id: '', name: '— None —' }, ...cats].map(c => {
                const active = form.categoryId === String(c.id);
                return (
                  <TouchableOpacity key={c.id || 'none'}
                    style={[styles.chip, { borderColor: '#8b5cf6' }, active && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                    onPress={() => set({ categoryId: String(c.id) })}>
                    <Text style={[styles.chipText, { color: '#8b5cf6' }, active && { color: '#fff' }]}>{c.name}</Text>
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
            <Text style={styles.hint}>Feature access granted to businesses of this type</Text>
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

        {/* Active */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Active</Text>
            <Text style={styles.hint}>Inactive types cannot be assigned to new businesses</Text>
          </View>
          <Switch value={form.active} onValueChange={v => set({ active: v })}
            trackColor={{ false: '#D0D5DD', true: colors.primary }} thumbColor="#fff" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveText}>{isEdit ? 'Update' : 'Create'}</Text>}
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
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 10 },
  req: { color: '#ef4444' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa' },
  multiline: { height: 88, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.primary },
  chipTextActive: { color: '#fff' },
  catLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  switchRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#6b7280' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default SABusinessTypeFormScreen;
