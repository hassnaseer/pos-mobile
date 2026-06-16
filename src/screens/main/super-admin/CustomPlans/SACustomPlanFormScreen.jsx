import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  useCreateSACustomPlan, useSABusinesses, useSAPermissions,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const CYCLES = ['monthly', 'quarterly', 'yearly', 'custom'];

const SACustomPlanFormScreen = ({ route, navigation }) => {
  const { preBusinessId } = route.params ?? {};

  const [form, setForm] = useState({
    businessId:      preBusinessId ? String(preBusinessId) : '',
    name:            '',
    price:           '',
    billingCycle:    'monthly',
    users:           '0',
    branches:        '1',
    invoicesPerMonth:'0',
    notes:           '',
    permissionIds:   [],
  });
  const [bizSearch, setBizSearch]     = useState('');
  const [bizSelected, setBizSelected] = useState(null);
  const [bizOpen, setBizOpen]         = useState(false);
  const [saving, setSaving]         = useState(false);

  const { data: bizData } = useSABusinesses({ limit: 100 });
  const { data: rawPerms = [] } = useSAPermissions();
  const businesses = bizData?.data ?? [];
  const perms = Array.isArray(rawPerms) ? rawPerms : (rawPerms?.data ?? []);

  const { mutateAsync: createPlan } = useCreateSACustomPlan();

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const filteredBiz = useMemo(() =>
    bizSearch ? businesses.filter(b => (b.name ?? '').toLowerCase().includes(bizSearch.toLowerCase()))
              : businesses,
    [businesses, bizSearch]);

  const togglePerm = id => {
    const sid = String(id);
    set({ permissionIds: form.permissionIds.includes(sid)
      ? form.permissionIds.filter(p => p !== sid)
      : [...form.permissionIds, sid] });
  };

  const handleCreate = async () => {
    if (!form.businessId) { Alert.alert('Error', 'Please select a business'); return; }
    if (!form.name.trim()) { Alert.alert('Error', 'Plan name is required'); return; }
    if (!form.price)        { Alert.alert('Error', 'Price is required'); return; }
    setSaving(true);
    try {
      await createPlan({
        businessId:   String(form.businessId),
        name:         form.name.trim(),
        price:        parseFloat(form.price),
        billingCycle: form.billingCycle,
        limits: {
          users:           parseInt(form.users) || 0,
          branches:        parseInt(form.branches) || 1,
          invoicesPerMonth:parseInt(form.invoicesPerMonth) || 0,
        },
        permissions: form.permissionIds,
        modules:     [],
        notes:       form.notes || undefined,
      });
      navigation.goBack();
    } catch { Alert.alert('Error', 'Failed to create plan'); }
    finally { setSaving(false); }
  };

  const permByCategory = perms.reduce((acc, p) => {
    const cat = p.category ?? 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Business Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Business <Text style={styles.req}>*</Text></Text>
          {bizSelected ? (
            <View style={styles.selectedBiz}>
              <Text style={styles.selectedBizText}>{bizSelected.name}</Text>
              <TouchableOpacity onPress={() => { setBizSelected(null); set({ businessId: '' }); setBizSearch(''); setBizOpen(false); }}>
                <Text style={styles.clearBiz}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.bizDropdownBtn} onPress={() => setBizOpen(v => !v)}>
              <Text style={styles.bizDropdownText}>Select Business ▾</Text>
            </TouchableOpacity>
          )}
          {bizOpen && !bizSelected && (
            <>
              <TextInput style={[styles.input, { marginTop: 8 }]} value={bizSearch} onChangeText={setBizSearch}
                placeholder="Search business name…" placeholderTextColor="#9ca3af" autoFocus />
              {(bizSearch ? filteredBiz : []).slice(0, 6).map(b => (
                <TouchableOpacity key={b.id} style={styles.bizRow}
                  onPress={() => { setBizSelected(b); set({ businessId: String(b.id) }); setBizSearch(''); setBizOpen(false); }}>
                  <View style={styles.bizAvatar}>
                    <Text style={styles.bizAvatarText}>{(b.name ?? 'B')[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.bizRowName}>{b.name}</Text>
                    <Text style={styles.bizRowSub}>{b.email ?? ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {bizSearch && filteredBiz.length === 0 && (
                <Text style={styles.bizRowSub}>No businesses found</Text>
              )}
              {!bizSearch && (
                <Text style={styles.bizHint}>Type to search businesses…</Text>
              )}
            </>
          )}
        </View>

        {/* Plan Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Plan Name <Text style={styles.req}>*</Text></Text>
          <TextInput style={styles.input} value={form.name} onChangeText={v => set({ name: v })}
            placeholder="e.g. Custom Pro" placeholderTextColor="#9ca3af" />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Price <Text style={styles.req}>*</Text></Text>
          <TextInput style={styles.input} value={form.price} onChangeText={v => set({ price: v })}
            placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="numeric" />
        </View>

        {/* Billing Cycle */}
        <View style={styles.field}>
          <Text style={styles.label}>Billing Cycle</Text>
          <View style={styles.chipWrap}>
            {CYCLES.map(c => {
              const active = form.billingCycle === c;
              return (
                <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => set({ billingCycle: c })}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Limits */}
        <View style={styles.field}>
          <Text style={styles.label}>Limits <Text style={styles.hint}>(0 = unlimited)</Text></Text>
          <View style={styles.limitsRow}>
            {[['users','Users'],['branches','Branches'],['invoicesPerMonth','Invoices/mo']].map(([k, l]) => (
              <View key={k} style={styles.limitField}>
                <Text style={styles.limitLabel}>{l}</Text>
                <TextInput style={styles.limitInput} value={form[k]} onChangeText={v => set({ [k]: v })}
                  keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
            ))}
          </View>
        </View>

        {/* Permissions */}
        {perms.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Permissions</Text>
            <Text style={styles.hintText}>Feature access granted with this plan</Text>
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

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 88, textAlignVertical: 'top' }]}
            value={form.notes} onChangeText={v => set({ notes: v })}
            placeholder="Optional internal notes" placeholderTextColor="#9ca3af" multiline numberOfLines={4} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveText}>Create Plan</Text>}
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
  label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  hintText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 10 },
  req: { color: '#ef4444' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fafafa' },
  bizDropdownBtn: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa' },
  bizDropdownText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#9ca3af' },
  bizHint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', paddingVertical: 8, textAlign: 'center' },
  selectedBiz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: colors.primary },
  selectedBizText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.primary, flex: 1 },
  clearBiz: { fontSize: 16, color: colors.primary, paddingLeft: 10 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  bizAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bizAvatarText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit-Bold' },
  bizRowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  bizRowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
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
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#6b7280' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#fff' },
});

export default SACustomPlanFormScreen;
