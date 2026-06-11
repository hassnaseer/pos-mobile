import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useVendorOrders } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_COLOR = { pending: '#F59E0B', confirmed: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444' };

const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const VendorOrdersScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorBuyer();
  const { fmt } = useCurrency();
  const [expanded, setExpanded] = useState(null);

  const { data: raw = [], isLoading, refetch } = useVendorOrders();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  if (!canAccess) {
    return <View style={styles.centered}><Text style={styles.noAccess}>No access to vendor orders.</Text></View>;
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
                  {step.charAt(0).toUpperCase() + step.slice(1)}
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
        <Text style={styles.heading}>My Orders</Text>
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
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>Order #{item.orderNumber ?? item.id}</Text>
                  <Text style={styles.rowSub}>{item.vendorBusiness?.name ?? item.vendorName ?? '—'}</Text>
                  {item.createdAt && <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.totalText}>{fmt(item.total ?? item.totalAmount ?? 0)}</Text>
                  <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'pending'}</Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressWrap}>
                {renderProgressBar(item.status)}
              </View>

              {/* Expanded: order lines */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  {(item.lines ?? []).map((line, idx) => (
                    <View key={line.id ?? idx} style={styles.lineRow}>
                      <Text style={styles.lineName}>{line.productName}</Text>
                      <Text style={styles.lineQty}>{line.qty} × {fmt(line.unitPrice)}</Text>
                      <Text style={styles.lineTotal}>{fmt(line.subtotal)}</Text>
                    </View>
                  ))}
                  {(item.lines ?? []).length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>{fmt(item.total ?? item.totalAmount ?? 0)}</Text>
                    </View>
                  )}
                  {item.notes && <Text style={styles.notes}>Note: {item.notes}</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No wholesale orders yet.</Text>}
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
  badge:              { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:          { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
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
  totalRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderColor: '#F3F4F6', marginTop: 4 },
  totalLabel:         { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111' },
  totalValue:         { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111' },
  notes:              { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', fontStyle: 'italic', marginTop: 6 },
  empty:              { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default VendorOrdersScreen;
