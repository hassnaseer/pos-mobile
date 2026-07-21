import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import colors from '../../../../theme/colors';

const COLOR_SWATCHES = ['#2563eb', '#7c3aed', '#dc2626', '#16a34a', '#d97706', '#0891b2', '#db2777', '#111827'];

const DEFAULT = {
  primaryColor: '#2563eb',
  showLogo: true,
  showBusinessName: true,
  showBusinessPhone: true,
  showBusinessEmail: true,
  showBusinessAddress: true,
  footerMessage: '',
};

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={!!value} onValueChange={onChange} trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }} thumbColor={value ? colors.primary : '#9ca3af'} />
    </View>
  );
}

// Schema-agnostic template editor: renders the fields shared by every print template
// and preserves any other saved fields (spread) so nothing is lost on save.
export default function TemplateDesigner({ title, subtitle, useTemplateHook, useUpdateHook, footerPlaceholder }) {
  const { data: saved, isLoading } = useTemplateHook();
  const update = useUpdateHook();
  const [cfg, setCfg] = useState(DEFAULT);

  useEffect(() => {
    if (saved && typeof saved === 'object') setCfg(prev => ({ ...prev, ...saved }));
  }, [saved]);

  const set = (k, v) => setCfg(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    try {
      await update.mutateAsync(cfg);
      Alert.alert('Saved', 'Template updated');
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save template');
    }
  };

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>{title}</Text>
        {subtitle ? <Text style={styles.subHeading}>{subtitle}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Primary Color</Text>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map(c => (
              <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, cfg.primaryColor === c && styles.swatchActive]} onPress={() => set('primaryColor', c)} />
            ))}
          </View>
          <TextInput style={styles.colorInput} value={cfg.primaryColor} onChangeText={v => set('primaryColor', v)} placeholder="#2563eb" placeholderTextColor="#999" maxLength={7} autoCapitalize="none" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Info</Text>
          <ToggleRow label="Show Logo" value={cfg.showLogo} onChange={v => set('showLogo', v)} />
          <ToggleRow label="Show Business Name" value={cfg.showBusinessName} onChange={v => set('showBusinessName', v)} />
          <ToggleRow label="Show Business Phone" value={cfg.showBusinessPhone} onChange={v => set('showBusinessPhone', v)} />
          <ToggleRow label="Show Business Email" value={cfg.showBusinessEmail} onChange={v => set('showBusinessEmail', v)} />
          <ToggleRow label="Show Business Address" value={cfg.showBusinessAddress} onChange={v => set('showBusinessAddress', v)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Footer Message</Text>
          <TextInput
            style={styles.footerInput}
            value={cfg.footerMessage ?? ''}
            onChangeText={v => set('footerMessage', v)}
            placeholder={footerPlaceholder ?? 'Message shown at the bottom of the printout'}
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={update.isPending}>
          {update.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Template</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  swatch: { width: 30, height: 30, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#111827' },
  colorInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderColor: '#f3f4f6' },
  toggleLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827', flex: 1 },
  footerInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});
