import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useOrder } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? '—'}</Text>
  </View>
);

const OrderDetailScreen = ({ route }) => {
  const { order: passedOrder } = route.params ?? {};
  const { fmt } = useCurrency();
  const { data: fetched } = useOrder(passedOrder?.id);
  const order = fetched ?? passedOrder;

  if (!order) return null;

  const lines = order.lines ?? order.saleOrderLines ?? [];
  const taxes = order.taxesJson ? (typeof order.taxesJson === 'string' ? JSON.parse(order.taxesJson) : order.taxesJson) : [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <Row label="Status" value={order.status} />
        <Row label="Payment" value={order.paymentMethod} />
        <Row label="Date" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : ''} />
        {order.customer && <Row label="Customer" value={order.customer.name} />}
      </View>

      {lines.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {lines.map((l, i) => (
            <View key={i} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={1}>{l.product?.name ?? l.productName ?? 'Item'}</Text>
              <Text style={styles.lineQty}>×{l.quantity}</Text>
              <Text style={styles.linePrice}>{fmt(l.unitPrice)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Row label="Subtotal" value={fmt(order.subtotal)} />
        {taxes.map((t, i) => (
          <Row key={i} label={`${t.name} (${t.percentage}%)`} value={fmt(t.amount)} />
        ))}
        <Row label="Tax Total" value={fmt(order.taxAmount)} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{fmt(order.totalAmount)}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16 },
  orderNum: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  rowLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  rowValue: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 12 },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  lineName: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  lineQty: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  linePrice: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 6 },
  totalLabel: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  totalValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary },
});

export default OrderDetailScreen;
