import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useOrder, useAdminSettings, useInvoiceTemplate } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import InvoicePreviewModal from '../../../../components/InvoicePreviewModal/InvoicePreviewModal';
import { buildSalesInvoiceHtml } from '../../../../utils/invoicePrinter';
import colors from '../../../../theme/colors';

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? '—'}</Text>
  </View>
);

const OrderDetailScreen = ({ route }) => {
  const { order: passedOrder, id: passedId } = route.params ?? {};
  const { fmt, symbol, invoiceTerms } = useCurrency();
  const { data: fetched, isFetching, refetch } = useOrder(passedOrder?.id ?? passedId);
  const { data: businessSettings } = useAdminSettings();
  const { data: invoiceTemplateCfg } = useInvoiceTemplate();
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const order = fetched ?? passedOrder;

  const invoiceHtml = useMemo(() => {
    if (!order) return '';
    const lines = order.lines ?? [];
    const subtotal = order.subtotal ?? 0;
    const taxAmount = order.taxAmount ?? 0;
    const excludedTaxes = taxAmount > 0
      ? [{ name: 'Tax', percentage: subtotal > 0 ? Math.round((taxAmount / subtotal) * 1000) / 10 : 0, amount: taxAmount, type: 'excluded' }]
      : [];
    return buildSalesInvoiceHtml({
      order: {
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        subtotal,
        amountPaid: order.amountPaid,
        balanceDue: order.balanceDue,
        amountReceived: order.totalAmount,
      },
      cart: lines.map(l => ({ name: l.product?.name ?? 'Item', quantity: l.quantity, price: l.unitPrice, warrantyDays: l.warrantyDays })),
      businessName: businessSettings?.name || '',
      businessPhone: businessSettings?.phone,
      businessEmail: businessSettings?.email,
      businessAddress: businessSettings?.address,
      symbol,
      invoiceTerms,
      subtotal,
      excludedTaxes,
      includedTaxes: [],
      cartMiscCharges: [],
      selectedCustomer: order.customer ? { name: order.customer.name } : null,
      template: invoiceTemplateCfg,
    });
  }, [order, businessSettings, symbol, invoiceTerms, invoiceTemplateCfg]);

  if (!order) return null;

  const lines = order.lines ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNum}>{order.orderNumber}</Text>
          <TouchableOpacity style={styles.printBtn} onPress={() => setShowInvoicePreview(true)}>
            <Text style={styles.printBtnText}>Print / Share</Text>
          </TouchableOpacity>
        </View>
        <Row label="Status" value={order.status} />
        <Row label="Payment" value={order.paymentMethod} />
        <Row label="Date" value={order.placedAt ? new Date(order.placedAt).toLocaleString() : ''} />
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
        <Row label="Tax Total" value={fmt(order.taxAmount)} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{fmt(order.totalAmount)}</Text>
        </View>
      </View>

      <InvoicePreviewModal
        visible={showInvoicePreview}
        onClose={() => setShowInvoicePreview(false)}
        html={invoiceHtml}
        fileName={`invoice-${order.orderNumber}`}
        title="Invoice"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  orderNum: { fontSize: 18, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  printBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  printBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
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
