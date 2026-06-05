import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFactoryConnections, useUpdateFactoryConnection } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', connected: '#10B981', rejected: '#EF4444' };

const FactoryConnectionsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.ACCESS_FACTORY);

  const { data: raw = [], isLoading, refetch } = useFactoryConnections();
  const { mutateAsync: updateConn, isPending: updating } = useUpdateFactoryConnection();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleAccept = async item => {
    try { await updateConn({ id: item.id, status: 'connected' }); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
  };

  const handleReject = async item => {
    Alert.alert('Reject Connection', 'Reject this connection request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try { await updateConn({ id: item.id, status: 'rejected' }); }
        catch (e) { Alert.alert('Error', e?.message ?? 'Failed'); }
      }},
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Factory Connections</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.pharmacyName ?? item.pharmacy?.name ?? item.partnerName ?? '—'}</Text>
              {item.email ? <Text style={styles.rowSub}>{item.email}</Text> : null}
              {item.createdAt && <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'pending'}</Text>
              </View>
              {canManage && item.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)} disabled={updating}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)} disabled={updating}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No connections yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:     { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:    { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  row:        { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  rowRight:   { alignItems: 'flex-end', gap: 6 },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:  { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:    { flexDirection: 'row', gap: 6 },
  acceptBtn:  { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  acceptText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#059669' },
  rejectBtn:  { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rejectText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:      { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default FactoryConnectionsScreen;
