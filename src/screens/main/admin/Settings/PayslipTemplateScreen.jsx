import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const DEFAULT_PAYSLIP_TEMPLATE = {
  style: 'classic', primaryColor: '#2563eb', fontSize: 'medium',
  showLogo: true, showBusinessName: true, showBusinessAddress: false, showBusinessPhone: false, showBusinessEmail: false,
  footerText: 'This is a computer-generated payslip and does not require a signature.',
};
const STYLES = [{ id: 'classic', name: 'Classic' }, { id: 'modern', name: 'Modern' }, { id: 'minimal', name: 'Minimal' }];
const FONT_SIZES = [{ id: 'small', name: 'Small' }, { id: 'medium', name: 'Medium' }, { id: 'large', name: 'Large' }];

const toggleField = (cfg, set, key, label) => ({ key, label, value: cfg[key], onChange: v => set(key, v) });

const usePayslipTemplate = () =>
  useQuery({ queryKey: ['payslip-template'], queryFn: async () => { const r = await apiClient.get('/admin/payslip-template'); return { ...DEFAULT_PAYSLIP_TEMPLATE, ...(r?.data?.config ?? r?.config ?? {}) }; } });

export default function PayslipTemplateScreen() {
  const { user } = useAuth();
  const perms = usePermissions();
  const qc = useQueryClient();
  const { data: saved, isLoading } = usePayslipTemplate();
  const [cfg, setCfg] = useState(DEFAULT_PAYSLIP_TEMPLATE);

  useEffect(() => { if (saved) setCfg(saved); }, [saved]);
  const set = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));

  const saveMut = useMutation({
    mutationFn: () => apiClient.put('/admin/payslip-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payslip-template'] }),
    onError: () => Alert.alert('Error', 'Failed to save payslip template'),
  });

  const isAdmin = user?.role === 'admin';
  const canAccess = isAdmin || perms.can(PERMISSIONS.MANAGE_PAYROLL);

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedSub}>Payslip template management requires payroll access.</Text>
      </View>
    );
  }

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const toggles = [
    toggleField(cfg, set, 'showLogo', 'Logo'),
    toggleField(cfg, set, 'showBusinessName', 'Business Name'),
    toggleField(cfg, set, 'showBusinessPhone', 'Phone'),
    toggleField(cfg, set, 'showBusinessEmail', 'Email'),
    toggleField(cfg, set, 'showBusinessAddress', 'Address'),
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Payslip Template</Text>
        <Text style={styles.subHeading}>Customize the style and appearance of salary slips</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Style</Text>
          <InlinePicker options={STYLES} value={cfg.style} onSelect={v => set('style', v)} allowNone={false} />
          <Text style={styles.label}>Primary Color (hex)</Text>
          <TextInput style={styles.input} value={cfg.primaryColor} onChangeText={v => set('primaryColor', v)} placeholder="#2563eb" placeholderTextColor="#999" maxLength={7} autoCapitalize="none" />
          <Text style={styles.label}>Font Size</Text>
          <InlinePicker options={FONT_SIZES} value={cfg.fontSize} onSelect={v => set('fontSize', v)} allowNone={false} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Info</Text>
          <Text style={styles.cardHint}>Pulled from your business settings</Text>
          {toggles.map(t => (
            <View key={t.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t.label}</Text>
              <Switch value={t.value} onValueChange={t.onChange} />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Footer Message</Text>
          <Text style={styles.cardHint}>Printed at the bottom of every payslip.</Text>
          <TextInput
            style={styles.footerInput}
            value={cfg.footerText}
            onChangeText={v => set('footerText', v)}
            placeholder={DEFAULT_PAYSLIP_TEMPLATE.footerText}
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Template</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  restrictedTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  restrictedSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 4 },
  cardHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  label: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderColor: '#f3f4f6' },
  toggleLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827' },
  footerInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});
