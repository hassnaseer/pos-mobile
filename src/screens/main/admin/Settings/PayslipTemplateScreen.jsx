import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useAdminSettings, usePayslipTemplate, useUpdatePayslipTemplate } from '../../../../services/api/posApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import InvoicePreviewModal from '../../../../components/InvoicePreviewModal/InvoicePreviewModal';
import { generateSlipHtml } from '../../../../utils/payslipPrinter';
import colors from '../../../../theme/colors';

const DEFAULT_PAYSLIP_TEMPLATE = {
  style: 'classic', primaryColor: '#2563eb', fontSize: 'medium',
  showLogo: true, showBusinessName: true, showBusinessAddress: false, showBusinessPhone: false, showBusinessEmail: false,
  footerText: 'This is a computer-generated payslip and does not require a signature.',
};
const STYLES = [{ id: 'classic', name: 'Classic' }, { id: 'modern', name: 'Modern' }, { id: 'minimal', name: 'Minimal' }];
const FONT_SIZES = [{ id: 'small', name: 'Small' }, { id: 'medium', name: 'Medium' }, { id: 'large', name: 'Large' }];
const COLOR_SWATCHES = ['#2563eb', '#7c3aed', '#dc2626', '#16a34a', '#d97706', '#0891b2', '#db2777', '#111827'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SAMPLE_PERIOD = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

const SAMPLE_SLIP = {
  baseSalary: 3000, claimsTotal: 150, lateDeduction: 20, halfDayDeduction: 0, breakDeduction: 0,
  fineDeduction: 0, advanceDeduction: 0, transportDeduction: 50, kpiIncentive: 100,
  kpiTargetSnapshot: 5000, kpiActualSales: 6200, kpiCommissionRateSnapshot: 5,
  workingDays: 22, netPay: 3180,
  employee: { name: 'Jane Doe', email: 'jane@example.com', employeeId: 'EMP-001' },
};

const toggleField = (cfg, set, key, label) => ({ key, label, value: cfg[key], onChange: v => set(key, v) });

export default function PayslipTemplateScreen() {
  const { user } = useAuth();
  const perms = usePermissions();
  const { symbol } = useCurrency();
  const { data: businessSettings } = useAdminSettings();
  const { data: saved, isLoading } = usePayslipTemplate();
  const updateMut = useUpdatePayslipTemplate();
  const [cfg, setCfg] = useState(DEFAULT_PAYSLIP_TEMPLATE);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { if (saved) setCfg({ ...DEFAULT_PAYSLIP_TEMPLATE, ...saved }); }, [saved]);
  const set = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));
  const handleReset = () => setCfg(DEFAULT_PAYSLIP_TEMPLATE);

  const previewHtml = useMemo(() => generateSlipHtml(
    SAMPLE_SLIP,
    SAMPLE_PERIOD,
    businessSettings?.name || 'My Business',
    symbol,
    cfg,
    { logoUrl: businessSettings?.logoUrl, phone: businessSettings?.phone, email: businessSettings?.email, address: businessSettings?.address },
  ), [cfg, businessSettings, symbol]);

  const saveMut = useMutation({
    mutationFn: () => updateMut.mutateAsync(cfg),
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
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Payslip Template</Text>
          <Text style={styles.subHeading}>Customize the style and appearance of salary slips</Text>
        </View>
        <TouchableOpacity style={styles.previewBtn} onPress={() => setPreviewOpen(true)}>
          <Text style={styles.previewBtnText}>Preview</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Style</Text>
          <InlinePicker options={STYLES} value={cfg.style} onSelect={v => set('style', v)} allowNone={false} />
          <Text style={styles.label}>Primary Color</Text>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c }, cfg.primaryColor === c && styles.swatchActive]}
                onPress={() => set('primaryColor', c)}
              />
            ))}
          </View>
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

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Reset to Default</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, styles.saveBtnFlex]} onPress={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Template</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <InvoicePreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
        title="Payslip Preview"
        previewOnly
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  restrictedTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  restrictedSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  previewBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, marginLeft: 12 },
  previewBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  swatch: { width: 30, height: 30, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#111827' },
  btnRow: { flexDirection: 'row', gap: 10 },
  resetBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtnFlex: { flex: 1 },
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
