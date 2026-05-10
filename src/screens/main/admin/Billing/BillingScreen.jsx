import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const useBilling = () =>
  useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/billing');
      return res?.data ?? res ?? null;
    },
    staleTime: 60_000,
  });

const useUpgradePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: packagePlanId => apiClient.patch('/admin/billing/upgrade', { packagePlanId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
};

const UsageBar = ({ label, used, max }) => {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isHigh = pct >= 90;
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageLabelRow}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, isHigh && { color: '#ef4444' }]}>
          {max > 0 ? `${used} / ${max}` : `${used} / Unlimited`}
        </Text>
      </View>
      {max > 0 && (
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: isHigh ? '#ef4444' : colors.primary }]} />
        </View>
      )}
    </View>
  );
};

const statusStyle = status => {
  if (status === 'Active') return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
  if (status === 'Trial')  return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
  return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
};

const BillingScreen = () => {
  const { data: info, isLoading, refetch } = useBilling();
  const { mutate: upgrade, isPending: upgrading } = useUpgradePlan();
  const [planModal, setPlanModal] = useState(false);

  const handleUpgrade = planId => {
    upgrade(planId, {
      onSuccess: () => { setPlanModal(false); Alert.alert('Success', 'Plan updated successfully'); },
      onError: () => Alert.alert('Error', 'Failed to update plan. Please try again.'),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!info) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load billing info.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ss = statusStyle(info.status);

  const statusLabel = info.isTrial
    ? `Trial — ${info.trialDaysRemaining} day${info.trialDaysRemaining !== 1 ? 's' : ''} remaining`
    : info.status === 'Active' && info.subscription
    ? `Active — ${info.subscription.plan?.name}`
    : info.status === 'Active'
    ? 'Active'
    : 'Trial Expired';

  const canUpgrade = info.isTrial || info.status === 'Expired';
  const canChange  = !info.isTrial && info.status === 'Active';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: ss.bg, borderColor: ss.border }]}>
        <View style={styles.statusTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: ss.text }]}>{statusLabel}</Text>
            {info.subscription?.endDate && (
              <Text style={[styles.statusSub, { color: ss.text }]}>
                Renews {new Date(info.subscription.endDate).toLocaleDateString()}
              </Text>
            )}
            {info.isTrial && info.expiryDate && (
              <Text style={[styles.statusSub, { color: ss.text }]}>
                Expires {new Date(info.expiryDate).toLocaleDateString()}
              </Text>
            )}
            {info.subscription?.plan && (
              <Text style={[styles.statusSub, { color: ss.text }]}>
                ${info.subscription.plan.price}/{info.subscription.plan.period}
              </Text>
            )}
          </View>
          {(canUpgrade || canChange) && (
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => setPlanModal(true)}>
              <Text style={styles.upgradeBtnText}>{canUpgrade ? 'Upgrade' : 'Change Plan'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Usage */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Usage</Text>
        <UsageBar label="Products"      used={info.usage?.productsCount ?? 0} max={info.limits?.maxProducts ?? 0} />
        <UsageBar label="Staff Members" used={info.usage?.staffCount ?? 0}    max={info.limits?.maxStaff ?? 0} />
        {info.isTrial && (
          <Text style={styles.trialNote}>Limits shown are for your trial. Upgrade for higher limits.</Text>
        )}
      </View>

      {/* Plan Features */}
      {info.subscription?.plan?.features?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Features — {info.subscription.plan.name}</Text>
          {info.subscription.plan.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureDot}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upgrade Modal */}
      <Modal visible={planModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a Plan</Text>
              <TouchableOpacity onPress={() => setPlanModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(info.availablePlans ?? []).length === 0 && (
                <Text style={styles.emptyText}>No plans available at this time.</Text>
              )}
              {(info.availablePlans ?? []).map(plan => {
                const isCurrent = info.subscription?.plan?.id === plan.id;
                return (
                  <View key={plan.id} style={[styles.planCard, plan.isPopular && styles.planCardPopular]}>
                    {plan.isPopular && <Text style={styles.popularBadge}>★ Popular</Text>}
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}
                    <Text style={styles.planPrice}>
                      ${plan.price}<Text style={styles.planPeriod}>/{plan.period}</Text>
                    </Text>
                    {(plan.features ?? []).map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Text style={styles.featureDot}>✓</Text>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                    <View style={styles.featureRow}>
                      <Text style={styles.featureDot}>✓</Text>
                      <Text style={styles.featureText}>
                        {plan.maxProducts > 0 ? `Up to ${plan.maxProducts} products` : 'Unlimited products'}
                      </Text>
                    </View>
                    <View style={styles.featureRow}>
                      <Text style={styles.featureDot}>✓</Text>
                      <Text style={styles.featureText}>
                        {plan.maxStaff > 0 ? `Up to ${plan.maxStaff} staff` : 'Unlimited staff'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.selectBtn, isCurrent && styles.selectBtnDisabled, plan.isPopular && styles.selectBtnPopular]}
                      onPress={() => !isCurrent && handleUpgrade(plan.id)}
                      disabled={isCurrent || upgrading === plan.id}
                    >
                      {upgrading === plan.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.selectBtnText}>{isCurrent ? 'Current Plan' : (plan.ctaLabel || 'Select Plan')}</Text>}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 14, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#ef4444', fontFamily: 'Outfit-Regular', marginBottom: 12 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  statusCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusLabel: { fontSize: 16, fontFamily: 'Outfit-SemiBold', marginBottom: 2 },
  statusSub: { fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 2 },
  upgradeBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  upgradeBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 14 },

  usageRow: { marginBottom: 14 },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  usageCount: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  barBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  trialNote: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  featureDot: { color: '#22c55e', fontFamily: 'Outfit-Bold', fontSize: 13, marginTop: 1 },
  featureText: { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#f4f6f9', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  modalClose: { fontSize: 18, color: colors.secondary, paddingHorizontal: 6 },

  planCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  planCardPopular: { borderColor: colors.primary, borderWidth: 2 },
  popularBadge: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12, marginBottom: 6 },
  planName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 2 },
  planDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 8 },
  planPrice: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 12 },
  planPeriod: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  selectBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  selectBtnPopular: { backgroundColor: colors.primary },
  selectBtnDisabled: { backgroundColor: '#e5e7eb' },
  selectBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  emptyText: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', paddingVertical: 24 },
});

export default BillingScreen;
