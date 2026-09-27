import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const fmt = n => (n == null ? '0.00' : parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtDuration = minutes => {
  if (!minutes) return '—';
  const m = parseFloat(minutes), h = Math.floor(m / 60), r = Math.round(m % 60);
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};
const fmtTime = iso => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const PAYMENT_METHODS = ['Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Bank Transfer'];

const useSessionDetail = id =>
  useQuery({ queryKey: ['arcade-session', id], queryFn: async () => { const r = await apiClient.get(`/admin/arcade/sessions/${id}`); return r?.data ?? r ?? null; }, enabled: !!id });

export default function ArcadeSessionDetailScreen({ route }) {
  const { sessionId } = route.params ?? {};
  const qc = useQueryClient();
  const { data: session, isLoading, isFetching, refetch } = useSessionDetail(sessionId);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (session?.status !== 'Active') return;
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, [session?.status]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['arcade-session', sessionId] });
    qc.invalidateQueries({ queryKey: ['arcade-sessions'] });
    qc.invalidateQueries({ queryKey: ['arcade-stations'] });
    qc.invalidateQueries({ queryKey: ['arcade-dashboard'] });
  };

  // Add product state
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('1');

  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/admin/products?search=${encodeURIComponent(productSearch)}&limit=8`);
        const data = res?.data?.items ?? res?.data ?? res ?? [];
        setProductResults(Array.isArray(data) ? data : []);
      } catch { setProductResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  const addItemMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/arcade/sessions/${sessionId}/items`, {
      productId: selectedProduct.id, productName: selectedProduct.name,
      unitPrice: parseFloat(selectedProduct.price), quantity: parseFloat(qty || '1'),
    }),
    onSuccess: () => { setSelectedProduct(null); setProductSearch(''); setQty('1'); refresh(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to add product'),
  });

  const removeItemMut = useMutation({
    mutationFn: itemId => apiClient.delete(`/admin/arcade/sessions/${sessionId}/items/${itemId}`),
    onSuccess: refresh,
    onError: () => Alert.alert('Error', 'Failed to remove item'),
  });

  const closeMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/arcade/sessions/${sessionId}/close`, {}),
    onSuccess: refresh,
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to end session'),
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const checkoutMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/arcade/sessions/${sessionId}/checkout`, { paymentMethod }),
    onSuccess: () => { setCheckoutOpen(false); refresh(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to process payment'),
  });

  if (isLoading || !session) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const isActive = session.status === 'Active';
  const isPending = session.status === 'Completed';
  const items = (session.items ?? []).filter(i => i.itemType === 'product');
  const itemsTotal = parseFloat(session.itemsTotal ?? 0);
  const sessionCharge = parseFloat(session.sessionCharge ?? session.sessionFee ?? 0);
  const elapsedMin = isActive ? (Date.now() - new Date(session.startTime).getTime()) / 60000 : parseFloat(session.durationMinutes ?? 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.heading}>{session.table?.name ?? 'Session'} — {session.customerName ?? 'Walk-in'}</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Session Type</Text>
          <Text style={styles.infoValue}>{session.gameTypeName ?? 'Free play'}</Text>
          {session.gameTypeName ? <Text style={styles.infoFee}>Rs. {fmt(session.sessionFee)}</Text> : null}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Started</Text>
          <Text style={styles.infoValue}>{fmtTime(session.startTime)}</Text>
        </View>
        <View style={[styles.infoCard, isActive && styles.infoCardActive]}>
          <Text style={styles.infoLabel}>{isActive ? 'Elapsed' : 'Duration'}</Text>
          <Text style={[styles.infoValue, isActive && { color: '#1d4ed8' }]}>{fmtDuration(String(elapsedMin))}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{session.status === 'Completed' ? 'Pending Payment' : session.status}</Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.addBox}>
          <Text style={styles.addBoxTitle}>🛒 Add Products</Text>
          {selectedProduct ? (
            <View style={styles.selectedProduct}>
              <Text style={styles.selectedProductText} numberOfLines={1}>{selectedProduct.name}</Text>
              <Text style={styles.selectedProductPrice}>Rs. {fmt(selectedProduct.price)}</Text>
              <TouchableOpacity onPress={() => { setSelectedProduct(null); setProductSearch(''); }}><Text style={styles.selectedProductClear}>✕</Text></TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput style={styles.input} value={productSearch} onChangeText={setProductSearch} placeholder="Search products…" placeholderTextColor="#999" />
              {productResults.length > 0 && (
                <View style={styles.dropdown}>
                  {productResults.map(p => (
                    <TouchableOpacity key={p.id} style={styles.dropdownRow} onPress={() => { setSelectedProduct(p); setProductSearch(''); setProductResults([]); }}>
                      <Text style={styles.dropdownText}>{p.name} — Rs. {fmt(p.price)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
          <View style={styles.qtyRow}>
            <TextInput style={styles.qtyInput} value={qty} onChangeText={setQty} keyboardType="number-pad" />
            <TouchableOpacity style={styles.addBtn} onPress={() => addItemMut.mutate()} disabled={!selectedProduct || addItemMut.isPending}>
              {addItemMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>+ Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.productsCard}>
          <Text style={styles.productsHeader}>Products</Text>
          {items.map(item => (
            <View key={item.id} style={styles.productRow}>
              <Text style={styles.productRowName} numberOfLines={1}>{item.productName} ×{parseFloat(item.quantity)}</Text>
              <Text style={styles.productRowPrice}>Rs. {fmt(item.totalPrice)}</Text>
              {isActive && <TouchableOpacity onPress={() => removeItemMut.mutate(item.id)}><Text style={styles.removeX}>✕</Text></TouchableOpacity>}
            </View>
          ))}
        </View>
      )}

      <View style={styles.billSummary}>
        <Text style={styles.billTitle}>Bill Summary</Text>
        <View style={styles.billRow}><Text style={styles.billLabel}>Session Charge{session.gameTypeName ? ` (${session.gameTypeName})` : ''}</Text><Text style={styles.billValue}>Rs. {fmt(isActive ? sessionCharge : session.sessionCharge)}</Text></View>
        {items.length > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Items</Text><Text style={styles.billValue}>Rs. {fmt(itemsTotal)}</Text></View>}
        <View style={[styles.billRow, styles.billTotalRow]}>
          <Text style={styles.billTotalLabel}>Total</Text>
          <Text style={styles.billTotalValue}>Rs. {fmt(isActive ? sessionCharge + itemsTotal : session.totalAmount)}</Text>
        </View>
        {isActive && <Text style={styles.billNote}>Final charge is calculated when the session ends.</Text>}
      </View>

      {isPending && (
        <View style={styles.checkoutBox}>
          <View style={styles.checkoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutName}>{session.customerName ?? 'Walk-in customer'}</Text>
              <Text style={styles.checkoutSub}>Total due · Rs. {fmt(session.totalAmount)}</Text>
            </View>
            {session.player1Paid ? <Text style={styles.paidLabel}>✓ Paid</Text> : (
              <TouchableOpacity style={styles.collectBtn} onPress={() => { setPaymentMethod('Cash'); setCheckoutOpen(true); }}>
                <Text style={styles.collectBtnText}>Collect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isActive && (
        <TouchableOpacity style={styles.closeSessionBtn} onPress={() => closeMut.mutate()} disabled={closeMut.isPending}>
          {closeMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.closeSessionBtnText}>⏹ End Session</Text>}
        </TouchableOpacity>
      )}

      <Modal visible={checkoutOpen} animationType="fade" transparent onRequestClose={() => setCheckoutOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.smallModalCard}>
            <Text style={styles.modalTitle}>{session.customerName ?? 'Walk-in customer'} — Bill</Text>
            <Text style={styles.billTotalValue}>Rs. {fmt(session.totalAmount)}</Text>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => checkoutMut.mutate()} disabled={checkoutMut.isPending}>
                {checkoutMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Collect Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111827' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  infoCardActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  infoLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  infoValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  infoFee: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#16a34a', marginTop: 1 },
  addBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 8 },
  addBoxTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111' },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, maxHeight: 150 },
  dropdownRow: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  dropdownText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#111' },
  selectedProduct: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  selectedProductText: { flex: 1, fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#5b21b6' },
  selectedProductPrice: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#7c3aed' },
  selectedProductClear: { fontSize: 13, color: '#a78bfa' },
  qtyRow: { flexDirection: 'row', gap: 8 },
  qtyInput: { width: 60, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, textAlign: 'center', fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', paddingVertical: 9 },
  addBtn: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  productsCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  productsHeader: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  productRowName: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Regular', color: '#374151' },
  productRowPrice: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  removeX: { fontSize: 13, color: '#f87171' },
  billSummary: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 6 },
  billTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  billValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  billTotalRow: { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  billTotalLabel: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827' },
  billTotalValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#15803d' },
  billNote: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  checkoutBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  checkoutName: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#111827' },
  checkoutSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  paidLabel: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  collectBtn: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  collectBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  closeSessionBtn: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  closeSessionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, margin: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 8 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginTop: 10, marginBottom: 8 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  methodBtnActive: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  methodText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  methodTextActive: { color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
