import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const DEFAULT_TEMPLATE = {
  style: 'classic', primaryColor: '#2563eb', fontSize: 'medium', paperSize: 'a4',
  showLogo: true, showBusinessName: true, showBusinessPhone: true, showBusinessEmail: true, showBusinessAddress: false,
  showCustomerPhone: true, showCustomerEmail: false,
  showOrderNumber: true, showOrderDate: true, showPaymentMethod: true,
  showTaxBreakdown: true, showTermsConditions: true,
  ticketShowSerialNumber: true, ticketShowAccessories: true, ticketShowExpectedCompletion: true,
  ticketShowAssignedTech: true, ticketShowPriority: false, ticketShowPhysicalLocation: false,
  showPrescriptions: false,
  typeOverrides: {
    sales: { footerMessage: 'Thank you for your business!' },
    repair: { footerMessage: 'Please keep this receipt for device collection.' },
    medical: { footerMessage: 'Thank you for choosing our medical services.' },
    medicalInstallment: { footerMessage: 'Thank you for your payment. Please make remaining payments on time.' },
    installment: { footerMessage: 'Please make payments on time. Thank you!' },
    prescription: { footerMessage: 'This prescription is valid as directed by the prescribing doctor.' },
    client: { footerMessage: 'Thank you for your business. We look forward to working with you.' },
    clientInstallment: { footerMessage: 'Thank you for your payment. Please make remaining installments on time.' },
  },
};

const ALL_INVOICE_TYPES = [
  { value: 'sales', label: 'Sales Invoice', bizCode: 'pos_sales' },
  { value: 'repair', label: 'Repair Ticket', bizCode: 'create_tickets' },
  { value: 'medical', label: 'Medical Invoice', bizCode: 'access_medical' },
  { value: 'medicalInstallment', label: 'Medical Installment', bizCode: 'access_medical' },
  { value: 'installment', label: 'POS Installment', bizCode: 'pos_sales' },
  { value: 'prescription', label: 'Prescription', bizCode: 'manage_prescriptions' },
  { value: 'client', label: 'Client Invoice', bizCode: 'client_invoice' },
  { value: 'clientInstallment', label: 'Client Installment', bizCode: 'client_invoice' },
];
const PAPER_SIZES = [{ id: 'a4', name: 'A4' }, { id: 'thermal-80', name: 'Thermal 80mm' }, { id: 'thermal-58', name: 'Thermal 58mm' }];
const STYLES = [{ id: 'classic', name: 'Classic' }, { id: 'modern', name: 'Modern' }, { id: 'minimal', name: 'Minimal' }];
const FONT_SIZES = [{ id: 'small', name: 'Small' }, { id: 'medium', name: 'Medium' }, { id: 'large', name: 'Large' }];

const useInvoiceTemplate = () =>
  useQuery({ queryKey: ['invoice-template'], queryFn: async () => { const r = await apiClient.get('/admin/invoice-template'); return { ...DEFAULT_TEMPLATE, ...(r?.data?.config ?? r?.config ?? {}) }; } });

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {desc ? <Text style={styles.toggleDesc}>{desc}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }} thumbColor={value ? colors.primary : '#9ca3af'} />
    </View>
  );
}

export default function InvoiceTemplateScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: saved, isLoading } = useInvoiceTemplate();
  const bizCodes = user?.businessPermissionCodes ?? [];
  const invoiceTypes = ALL_INVOICE_TYPES.filter(t => !t.bizCode || bizCodes.length === 0 || bizCodes.includes(t.bizCode));

  const [cfg, setCfg] = useState(DEFAULT_TEMPLATE);
  const [activeType, setActiveType] = useState(invoiceTypes[0]?.value ?? 'sales');

  useEffect(() => { if (saved) setCfg(saved); }, [saved]);

  const set = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));
  const setFooter = (type, val) => setCfg(prev => ({ ...prev, typeOverrides: { ...prev.typeOverrides, [type]: { ...prev.typeOverrides?.[type], footerMessage: val } } }));

  const saveMut = useMutation({
    mutationFn: () => apiClient.put('/admin/invoice-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-template'] }),
    onError: () => Alert.alert('Error', 'Failed to save invoice template'),
  });

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Invoice Template</Text>
        <Text style={styles.subHeading}>Configure what appears on generated invoices and receipts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Layout</Text>
          <Text style={styles.label}>Style</Text>
          <InlinePicker options={STYLES} value={cfg.style} onSelect={v => set('style', v)} allowNone={false} />
          <Text style={styles.label}>Font Size</Text>
          <InlinePicker options={FONT_SIZES} value={cfg.fontSize} onSelect={v => set('fontSize', v)} allowNone={false} />
          <Text style={styles.label}>Paper Size</Text>
          <InlinePicker options={PAPER_SIZES} value={cfg.paperSize} onSelect={v => set('paperSize', v)} allowNone={false} />
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
          <Text style={styles.cardTitle}>Customer Info</Text>
          <ToggleRow label="Show Customer Phone" value={cfg.showCustomerPhone} onChange={v => set('showCustomerPhone', v)} />
          <ToggleRow label="Show Customer Email" value={cfg.showCustomerEmail} onChange={v => set('showCustomerEmail', v)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Content</Text>
          <ToggleRow label="Show Order Number" value={cfg.showOrderNumber} onChange={v => set('showOrderNumber', v)} />
          <ToggleRow label="Show Order Date" value={cfg.showOrderDate} onChange={v => set('showOrderDate', v)} />
          <ToggleRow label="Show Payment Method" value={cfg.showPaymentMethod} onChange={v => set('showPaymentMethod', v)} />
          <ToggleRow label="Show Tax Breakdown" value={cfg.showTaxBreakdown} onChange={v => set('showTaxBreakdown', v)} />
          <ToggleRow label="Show Terms & Conditions" value={cfg.showTermsConditions} onChange={v => set('showTermsConditions', v)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Repair Ticket Fields</Text>
          <ToggleRow label="Show Serial Number" value={cfg.ticketShowSerialNumber} onChange={v => set('ticketShowSerialNumber', v)} />
          <ToggleRow label="Show Accessories" value={cfg.ticketShowAccessories} onChange={v => set('ticketShowAccessories', v)} />
          <ToggleRow label="Show Expected Completion" value={cfg.ticketShowExpectedCompletion} onChange={v => set('ticketShowExpectedCompletion', v)} />
          <ToggleRow label="Show Assigned Technician" value={cfg.ticketShowAssignedTech} onChange={v => set('ticketShowAssignedTech', v)} />
          <ToggleRow label="Show Priority" value={cfg.ticketShowPriority} onChange={v => set('ticketShowPriority', v)} />
          <ToggleRow label="Show Physical Location" value={cfg.ticketShowPhysicalLocation} onChange={v => set('ticketShowPhysicalLocation', v)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medical</Text>
          <ToggleRow label="Show Prescriptions" value={cfg.showPrescriptions} onChange={v => set('showPrescriptions', v)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Footer Message per Invoice Type</Text>
          <View style={styles.typeChipRow}>
            {invoiceTypes.map(t => (
              <TouchableOpacity key={t.value} style={[styles.typeChip, activeType === t.value && styles.typeChipActive]} onPress={() => setActiveType(t.value)}>
                <Text style={[styles.typeChipText, activeType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.footerInput}
            value={cfg.typeOverrides?.[activeType]?.footerMessage ?? ''}
            onChangeText={v => setFooter(activeType, v)}
            placeholder="Footer message shown at the bottom of this invoice type"
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
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  label: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280', marginBottom: 6, marginTop: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderColor: '#f3f4f6' },
  toggleLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827' },
  toggleDesc: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  typeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f3f4f6' },
  typeChipActive: { backgroundColor: colors.primary },
  typeChipText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  typeChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },
  footerInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});
