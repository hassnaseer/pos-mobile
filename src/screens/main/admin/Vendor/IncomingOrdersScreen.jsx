import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, Image } from 'react-native';
import { useIncomingOrders, useUpdateIncomingOrder, useAssignRiderToOrder, useStaffList } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', confirmed: '#3B82F6', shipped: '#8B5CF6', out_for_delivery: '#F97316', delivered: '#10B981', cancelled: '#EF4444' };
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipped', shipped: 'out_for_delivery', out_for_delivery: 'delivered' };
const NEXT_LABEL = { pending: 'Confirm', confirmed: 'Mark Shipped', shipped: 'Out for Delivery', out_for_delivery: 'Mark Delivered' };

const STEPS = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered'];

const IncomingOrdersScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorSeller();
  const canAssignRider = perms.can(PERMISSIONS.HANDLE_DELIVERIES);
  const { fmt } = useCurrency();

  const [expanded, setExpanded] = useState(null);

  const { data: raw = [], isLoading, refetch } = useIncomingOrders();
  const { mutateAsync: updateOrder, isPending: updating } = useUpdateIncomingOrder();
  const { mutateAsync: assignRider, isPending: assigning } = useAssignRiderToOrder();
  const { data: rawStaff = [] } = useStaffList();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const riders = staffList
    .filter(s => (s.permissionCodes ?? []).includes(PERMISSIONS.RIDER_ACCESS))
    .map(s => ({ id: s.id, name: s.fullName ?? s.name }));

  const handleAssignRider = async (item, riderId) => {
    if (!riderId) return;
    try { await assignRider({ id: item.id, riderId }); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to assign rider'); }
  };

  const handleAdvance = async item => {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    try { await updateOrder({ id: item.id, status: next }); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed'); }
  };

  const handleCancel = async item => {
    Alert.alert('Cancel Order', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await updateOrder({ id: item.id, status: 'cancelled' }); }
        catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed'); }
      }},
    ]);
  };

  if (!canAccess) {
    return <View style={styles.centered}><Text style={styles.noAccess}>No access to incoming orders.</Text></View>;
  }

  const renderProgressBar = (status) => {
    if (status === 'cancelled') {
      return (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>Cancelled</Text>
        </View>
      );
    }
    const currentIdx = STEPS.indexOf(status);
    return (
      <View style={styles.progressContainer}>
        {STEPS.map((step, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          return (
            <React.Fragment key={step}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  done    && styles.progressDotDone,
                  current && styles.progressDotCurrent,
                ]}>
                  {done && <Text style={styles.progressCheck}>✓</Text>}
                </View>
                <Text style={[styles.progressLabel, current && styles.progressLabelCurrent]}>
                  {STATUS_LABEL[step] ?? step}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.progressLine, done && styles.progressLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Incoming Orders</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isExpanded = expanded === item.id;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setExpanded(isExpanded ? null : item.id)}
              activeOpacity={0.8}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>Order #{item.orderNumber ?? item.id}</Text>
                  <Text style={styles.rowSub}>{item.buyerBusiness?.name ?? item.buyerName ?? '—'}</Text>
                  {item.createdAt && <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.totalText}>{fmt(item.total ?? item.totalAmount ?? 0)}</Text>
                  <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{STATUS_LABEL[item.status] ?? item.status ?? 'Pending'}</Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressWrap}>
                {renderProgressBar(item.status)}
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  {/* Order lines */}
                  {(item.lines ?? []).map((line, idx) => (
                    <View key={line.id ?? idx} style={styles.lineRow}>
                      <Text style={styles.lineName}>{line.productName}</Text>
                      <Text style={styles.lineQty}>{line.qty} × {fmt(line.unitPrice)}</Text>
                      <Text style={styles.lineTotal}>{fmt(line.subtotal)}</Text>
                    </View>
                  ))}
                  <View style={styles.divider} />

                  {/* Buyer contact details */}
                  {(item.contactName || item.contactPhone || item.deliveryAddress) && (
                    <View style={styles.contactSection}>
                      {item.contactName    && <Text style={styles.contactRow}>👤 {item.contactName}</Text>}
                      {item.contactPhone   && <Text style={styles.contactRow}>📞 {item.contactPhone}</Text>}
                      {item.deliveryAddress && <Text style={styles.contactRow}>📍 {item.deliveryAddress}</Text>}
                    </View>
                  )}
                  {item.notes && <Text style={styles.notes}>Note: {item.notes}</Text>}

                  {/* Rider assignment */}
                  {canAssignRider && riders.length > 0 && (item.status === 'confirmed' || item.status === 'shipped') && (
                    <View style={styles.riderSection}>
                      <Text style={styles.riderLabel}>🏍 Assign Rider{assigning ? ' (saving…)' : ''}</Text>
                      <InlinePicker
                        options={riders}
                        value={item.assignedUserId ?? ''}
                        onSelect={riderId => handleAssignRider(item, riderId)}
                        placeholder="Select a rider..."
                      />
                    </View>
                  )}
                  {item.assignedUser?.fullName && (
                    <Text style={styles.riderAssigned}>🏍 Rider: {item.assignedUser.fullName}</Text>
                  )}

                  {/* Delivery proof */}
                  {item.status === 'delivered' && item.proofImageUrl && (
                    <View style={styles.proofSection}>
                      <Text style={styles.riderLabel}>Delivery Proof</Text>
                      <Image source={{ uri: item.proofImageUrl }} style={styles.proofImage} />
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.actions}>
                    {NEXT_STATUS[item.status] && (
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => handleAdvance(item)} disabled={updating}>
                        <Text style={styles.confirmText}>{NEXT_LABEL[item.status]}</Text>
                      </TouchableOpacity>
                    )}
                    {(item.status === 'pending' || item.status === 'confirmed') && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)} disabled={updating}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No incoming orders yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#f4f6f9' },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:           { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:             { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:            { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  card:               { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14 },
  cardHeader:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardRight:          { alignItems: 'flex-end', gap: 4 },
  totalText:          { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111' },
  rowName:            { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:             { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:            { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  badge:              { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:          { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  progressWrap:       { marginTop: 12 },
  progressContainer:  { flexDirection: 'row', alignItems: 'center' },
  progressStep:       { alignItems: 'center', gap: 3 },
  progressDot:        { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E5E7EB', borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  progressDotDone:    { backgroundColor: '#10B981', borderColor: '#10B981' },
  progressDotCurrent: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  progressCheck:      { color: '#fff', fontSize: 9, fontFamily: 'Outfit-Bold' },
  progressLabel:      { fontSize: 9, fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center', maxWidth: 52 },
  progressLabelCurrent:{ color: '#3B82F6', fontFamily: 'Outfit-SemiBold' },
  progressLine:       { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  progressLineDone:   { backgroundColor: '#10B981' },
  cancelledBadge:     { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  cancelledText:      { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#EF4444' },
  expandedSection:    { marginTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 10 },
  lineRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  lineName:           { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  lineQty:            { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginRight: 8 },
  lineTotal:          { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111', minWidth: 70, textAlign: 'right' },
  divider:            { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  contactSection:     { gap: 4, marginBottom: 8 },
  contactRow:         { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  notes:              { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', fontStyle: 'italic', marginBottom: 8 },
  riderSection:       { marginBottom: 10 },
  riderLabel:         { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6B7280', marginBottom: 6 },
  riderAssigned:      { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 8 },
  proofSection:       { marginBottom: 10 },
  proofImage:         { width: 130, height: 130, borderRadius: 10, backgroundColor: '#F3F4F6' },
  actions:            { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  confirmBtn:         { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  confirmText:        { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#2563EB' },
  shipBtn:            { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  shipText:           { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#7C3AED' },
  deliverBtn:         { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  deliverText:        { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#065F46' },
  cancelBtn:          { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  cancelText:         { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:              { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default IncomingOrdersScreen;
