import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const useBankAccounts = () =>
  useQuery({
    queryKey: ['billing-bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/billing/bank-accounts');
      return res?.data ?? [];
    },
    staleTime: 300_000,
  });

const useBilling = () =>
  useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/billing');
      return res?.data ?? res ?? null;
    },
    staleTime: 60_000,
  });

const useSubmitPaymentRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/billing/payment-request', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
};

const AwaitingPaymentScreen = () => {
  const { data: accounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: billing } = useBilling();
  const { mutate: submitRequest, isPending: submitting } = useSubmitPaymentRequest();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isAwaitingPayment = billing?.status === 'AWAITING_PAYMENT';
  const availablePlans = billing?.availablePlans ?? [];

  const handleSubmit = () => {
    if (!selectedPlanId) {
      Alert.alert('Error', 'Please select a plan first');
      return;
    }
    submitRequest(
      { planId: selectedPlanId, notes: notes.trim() || undefined, source: 'DIRECT_REQUEST' },
      {
        onSuccess: () => {
          Alert.alert('Submitted', 'Your payment request has been submitted. Our team will verify and activate your account shortly.');
          setShowForm(false);
        },
        onError: (err) => Alert.alert('Error', err?.message ?? 'Failed to submit'),
      },
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, isAwaitingPayment ? styles.bannerAmber : styles.bannerBlue]}>
        <Text style={[styles.statusTitle, isAwaitingPayment ? styles.amberText : styles.blueText]}>
          {isAwaitingPayment ? '⏳  Payment Under Review' : '🏦  Bank Transfer Payment'}
        </Text>
        <Text style={[styles.statusSub, isAwaitingPayment ? styles.amberText : styles.blueText]}>
          {isAwaitingPayment
            ? 'Your payment request is being reviewed. You\'ll be notified once your account is activated.'
            : 'Transfer directly to one of our bank accounts and notify us with your receipt.'}
        </Text>
      </View>

      {/* Bank Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Bank Account(s)</Text>
        {loadingAccounts ? (
          <ActivityIndicator color={colors.primary} />
        ) : accounts.length === 0 ? (
          <Text style={styles.emptyText}>No bank accounts configured. Please contact support.</Text>
        ) : (
          accounts.map(acc => (
            <View key={acc.id} style={styles.bankCard}>
              <View style={styles.bankRow}>
                <Text style={styles.bankName}>{acc.bankName}</Text>
                <Text style={styles.bankCurrency}>{acc.currency}</Text>
              </View>
              <Text style={styles.bankDetail}>Account Name: <Text style={styles.bankValue}>{acc.accountName}</Text></Text>
              <Text style={styles.bankDetail}>Account No: <Text style={[styles.bankValue, styles.mono]}>{acc.accountNumber}</Text></Text>
              {acc.iban ? <Text style={styles.bankDetail}>IBAN: <Text style={[styles.bankValue, styles.mono]}>{acc.iban}</Text></Text> : null}
              {acc.branchCode ? <Text style={styles.bankDetail}>Branch Code: <Text style={styles.bankValue}>{acc.branchCode}</Text></Text> : null}
            </View>
          ))
        )}
      </View>

      {/* Submit payment request (only when not already awaiting) */}
      {!isAwaitingPayment && (
        <View style={styles.section}>
          {!showForm ? (
            <TouchableOpacity style={styles.submitBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.submitBtnText}>I've Made the Payment — Notify Us</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Select Plan <Text style={styles.required}>*</Text></Text>
              {availablePlans.map(plan => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOption, selectedPlanId === plan.id && styles.planSelected]}
                  onPress={() => setSelectedPlanId(plan.id)}
                >
                  <View style={[styles.planRadio, selectedPlanId === plan.id && styles.planRadioSelected]} />
                  <Text style={styles.planLabel}>{plan.name} — {plan.price}/{plan.period}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.formLabel, { marginTop: 14 }]}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Transfer ref, date of payment…"
                multiline
                numberOfLines={3}
                style={styles.textarea}
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!selectedPlanId || submitting) && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={!selectedPlanId || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmBtnText}>Submit Payment Request</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 16 },

  statusBanner: { borderRadius: 14, padding: 16, borderWidth: 1 },
  bannerAmber:  { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  bannerBlue:   { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  statusTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  statusSub:    { fontSize: 13, lineHeight: 19 },
  amberText:    { color: '#92400e' },
  blueText:     { color: '#1e40af' },

  section:      { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  emptyText:    { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },

  bankCard:     { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  bankRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bankName:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  bankCurrency: { fontSize: 12, color: '#6b7280' },
  bankDetail:   { fontSize: 13, color: '#374151', marginBottom: 2 },
  bankValue:    { fontWeight: '600', color: '#111827' },
  mono:         { fontFamily: 'monospace' },

  submitBtn:      { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  form:         { gap: 4 },
  formLabel:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:     { color: '#ef4444' },

  planOption:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  planSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  planRadio:    { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#d1d5db' },
  planRadioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  planLabel:    { fontSize: 13, color: '#111827', flex: 1 },

  textarea:     { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 13, color: '#111827', textAlignVertical: 'top', minHeight: 70 },

  formActions:    { gap: 8, marginTop: 12 },
  confirmBtn:     { backgroundColor: colors.primary, borderRadius: 12, padding: 13, alignItems: 'center' },
  disabledBtn:    { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn:      { borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText:  { color: '#374151', fontWeight: '600', fontSize: 14 },
});

export default AwaitingPaymentScreen;
