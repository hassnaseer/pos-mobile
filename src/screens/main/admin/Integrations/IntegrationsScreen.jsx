import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const PLATFORM_LABELS = {
  shopify:      { label: 'Shopify',      color: '#95BF47' },
  woocommerce:  { label: 'WooCommerce',  color: '#7F54B3' },
  bigcommerce:  { label: 'BigCommerce',  color: '#121118' },
  squarespace:  { label: 'Squarespace', color: '#000' },
  wix:          { label: 'Wix',         color: '#FAAD00' },
  etsy:         { label: 'Etsy',        color: '#F45800' },
};

const useIntegrations = () =>
  useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/ecommerce');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

const useSyncIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: platform => apiClient.patch(`/admin/ecommerce/${platform}/sync`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
};

const useDisconnectIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: platform => apiClient.delete(`/admin/ecommerce/${platform}/disconnect`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
};

const IntegrationsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_ECOMMERCE);

  const { data: raw = [], isLoading, refetch } = useIntegrations();
  const { mutate: sync, isPending: syncing } = useSyncIntegration();
  const { mutate: disconnect } = useDisconnectIntegration();

  const integrations = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleSync = platform => {
    Alert.alert('Sync', `Sync ${PLATFORM_LABELS[platform]?.label ?? platform} now?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sync', onPress: () => sync(platform) },
    ]);
  };

  const handleDisconnect = platform => {
    Alert.alert(
      'Disconnect',
      `Disconnect ${PLATFORM_LABELS[platform]?.label ?? platform}? Products will no longer sync.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => disconnect(platform) },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Ecommerce Integrations</Text>
        <Text style={styles.infoText}>
          Connect your store to sync products and orders automatically.
          To connect new platforms, use the web dashboard.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={integrations}
          keyExtractor={i => String(i.id ?? i.platform)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const meta = PLATFORM_LABELS[item.platform] ?? {};
            const isConnected = item.status === 'active' || item.isConnected;
            return (
              <View style={styles.card}>
                <View style={[styles.platformDot, { backgroundColor: meta.color ?? colors.primary }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.platformName}>{meta.label ?? item.platform}</Text>
                  <View style={[styles.statusBadge, isConnected ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, { color: isConnected ? '#16a34a' : '#6b7280' }]}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Text>
                  </View>
                  {item.lastSyncedAt && (
                    <Text style={styles.lastSync}>
                      Last synced: {new Date(item.lastSyncedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {canManage && isConnected && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.syncBtn} onPress={() => handleSync(item.platform)} disabled={syncing}>
                      <Text style={styles.syncBtnText}>Sync</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.disconnectBtn} onPress={() => handleDisconnect(item.platform)}>
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No integrations connected</Text>
              <Text style={styles.emptyText}>
                Go to the web dashboard to connect Shopify, WooCommerce, or other platforms.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  loader: { marginTop: 40 },
  infoBox: { margin: 12, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  infoTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1d4ed8', marginBottom: 4 },
  infoText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#3b82f6', lineHeight: 18 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  platformDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  cardInfo: { flex: 1 },
  platformName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  lastSync: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  cardActions: { gap: 6 },
  syncBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  disconnectBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  disconnectBtnText: { color: '#ef4444', fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  emptyBox: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 8 },
  emptyText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', lineHeight: 20 },
});

export default IntegrationsScreen;
