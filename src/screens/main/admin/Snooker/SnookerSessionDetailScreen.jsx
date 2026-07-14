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
  useQuery({ queryKey: ['snooker-session', id], queryFn: async () => { const r = await apiClient.get(`/admin/snooker/sessions/${id}`); return r?.data ?? r ?? null; }, enabled: !!id });

export default function SnookerSessionDetailScreen({ route, navigation }) {
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
    qc.invalidateQueries({ queryKey: ['snooker-session', sessionId] });
    qc.invalidateQueries({ queryKey: ['snooker-sessions'] });
    qc.invalidateQueries({ queryKey: ['snooker-tables'] });
  };

  // Add product state
  const [forPlayer, setForPlayer] = useState('player1');
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
    mutationFn: () => apiClient.post(`/admin/snooker/sessions/${sessionId}/items`, {
      productId: selectedProduct.id, productName: selectedProduct.name,
      unitPrice: parseFloat(selectedProduct.price), quantity: parseFloat(qty || '1'), playerSide: forPlayer,
    }),
    onSuccess: () => { setSelectedProduct(null); setProductSearch(''); setQty('1'); refresh(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to add product'),
  });

  const removeItemMut = useMutation({
    mutationFn: itemId => apiClient.delete(`/admin/snooker/sessions/${sessionId}/items/${itemId}`),
    onSuccess: refresh,
    onError: () => Alert.alert('Error', 'Failed to remove item'),
  });

  const [closeOpen, setCloseOpen] = useState(false);
  const [winner, setWinner] = useState(null);
  const closeMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/snooker/sessions/${sessionId}/close`, { winner }),
    onSuccess: () => { setCloseOpen(false); setWinner(null); refresh(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to close session'),
  });

  const [checkoutSide, setCheckoutSide] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const checkoutMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/snooker/sessions/${sessionId}/checkout/${checkoutSide}`, { paymentMethod }),
    onSuccess: () => { setCheckoutSide(null); refresh(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to process payment'),
  });

  if (isLoading || !session) return <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />;

  const isActive = session.status === 'Active';
  const isPending = session.status === 'Completed';
  const items = session.items ?? [];
  const p1Items = items.filter(i => i.itemType === 'product' && i.playerSide === 'player1');
  const p2Items = items.filter(i => i.itemType === 'product' && i.playerSide === 'player2');
  const p1Total = p1Items.reduce((s, i) => s + parseFloat(i.totalPrice ?? 0), 0);
  const p2Total = p2Items.reduce((s, i) => s + parseFloat(i.totalPrice ?? 0), 0);
  const sessionFee = parseFloat(session.sessionFee ?? 0);
  const elapsedMin = isActive ? (Date.now() - new Date(session.startTime).getTime()) / 60000 : parseFloat(session.durationMinutes ?? 0);

  const closePreview = side => {
    const isLoser = winner !== null && winner !== side;
    const products = side === 'player1' ? p1Total : p2Total;
    return (isLoser ? sessionFee : 0) + products;
  };

  const checkoutBill = side => {
    const isLoser = session.winner !== side;
    return (isLoser ? sessionFee : 0) + (side === 'player1' ? p1Total : p2Total);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.heading}>{session.table?.name ?? 'Session'} — {session.player1Name ?? 'P1'} vs {session.player2Name ?? 'P2'}</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Game Type</Text>
          <Text style={styles.infoValue}>{session.gameTypeName ?? '—'}</Text>
          <Text style={styles.infoFee}>Rs. {fmt(session.sessionFee)}</Text>
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

      <View style={styles.playersRow}>
        {['player1', 'player2'].map(side => {
          const name = side === 'player1' ? session.player1Name : session.player2Name;
          const pItems = side === 'player1' ? p1Items : p2Items;
          const pTotal = side === 'player1' ? p1Total : p2Total;
          const paid = side === 'player1' ? session.player1Paid : session.player2Paid;
          const isWinner = session.winner === side;
          const isLoser = session.winner && session.winner !== side;
          return (
            <View key={side} style={[styles.playerCard, isWinner && styles.playerCardWinner, isLoser && styles.playerCardLoser]}>
              <View style={styles.playerCardHeader}>
                {isWinner ? <Text>🏆</Text> : null}
                <Text style={[styles.playerName, isWinner && { color: '#b45309' }, isLoser && { color: '#b91c1c' }]}>{name ?? side}</Text>
                {paid ? <Text style={styles.paidTag}>Paid</Text> : null}
              </View>
              <Text style={styles.playerSub}>{pItems.length} product{pItems.length !== 1 ? 's' : ''} · Rs. {fmt(pTotal)}</Text>
            </View>
          );
        })}
      </View>

      {isActive && (
        <View style={styles.addBox}>
          <Text style={styles.addBoxTitle}>🛒 Add Products</Text>
          <View style={styles.playerToggleRow}>
            {['player1', 'player2'].map(side => (
              <TouchableOpacity key={side} style={[styles.playerToggle, forPlayer === side && styles.playerToggleActive]} onPress={() => setForPlayer(side)}>
                <Text style={[styles.playerToggleText, forPlayer === side && styles.playerToggleTextActive]}>
                  {side === 'player1' ? (session.player1Name ?? 'Player 1') : (session.player2Name ?? 'Player 2')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

      {(p1Items.length > 0 || p2Items.length > 0) && (
        <View style={styles.productsRow}>
          {['player1', 'player2'].map(side => {
            const name = side === 'player1' ? session.player1Name : session.player2Name;
            const pItems = side === 'player1' ? p1Items : p2Items;
            return (
              <View key={side} style={styles.productsCol}>
                <Text style={styles.productsColHeader}>{name}</Text>
                {pItems.length === 0 ? <Text style={styles.noProducts}>No products</Text> : pItems.map(item => (
                  <View key={item.id} style={styles.productRow}>
                    <Text style={styles.productRowName} numberOfLines={1}>{item.productName} ×{parseFloat(item.quantity)}</Text>
                    <Text style={styles.productRowPrice}>Rs. {fmt(item.totalPrice)}</Text>
                    {isActive && <TouchableOpacity onPress={() => removeItemMut.mutate(item.id)}><Text style={styles.removeX}>✕</Text></TouchableOpacity>}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.billSummary}>
        <Text style={styles.billTitle}>Bill Summary</Text>
        <View style={styles.billRow}><Text style={styles.billLabel}>Game Fee ({session.gameTypeName})</Text><Text style={styles.billValue}>Rs. {fmt(sessionFee)}</Text></View>
        {p1Items.length > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>{session.player1Name} products</Text><Text style={styles.billValue}>Rs. {fmt(p1Total)}</Text></View>}
        {p2Items.length > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>{session.player2Name} products</Text><Text style={styles.billValue}>Rs. {fmt(p2Total)}</Text></View>}
        <View style={[styles.billRow, styles.billTotalRow]}><Text style={styles.billTotalLabel}>Total</Text><Text style={styles.billTotalValue}>Rs. {fmt(sessionFee + p1Total + p2Total)}</Text></View>
      </View>

      {isPending && (
        <View style={styles.checkoutBox}>
          {['player1', 'player2'].map(side => {
            const name = side === 'player1' ? session.player1Name : session.player2Name;
            const paid = side === 'player1' ? session.player1Paid : session.player2Paid;
            const isLoser = session.winner !== side;
            return (
              <View key={side} style={styles.checkoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkoutName}>{name}</Text>
                  <Text style={styles.checkoutSub}>{isLoser ? 'Loser · game fee + products' : 'Winner · products only'} · Rs. {fmt(checkoutBill(side))}</Text>
                </View>
                {paid ? <Text style={styles.paidLabel}>✓ Paid</Text> : (
                  <TouchableOpacity style={styles.collectBtn} onPress={() => { setCheckoutSide(side); setPaymentMethod('Cash'); }}>
                    <Text style={styles.collectBtnText}>Collect</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {isActive && (
        <TouchableOpacity style={styles.closeSessionBtn} onPress={() => { setWinner(null); setCloseOpen(true); }}>
          <Text style={styles.closeSessionBtnText}>🏆 Close Session & Pick Winner</Text>
        </TouchableOpacity>
      )}

      <Modal visible={closeOpen} animationType="fade" transparent onRequestClose={() => setCloseOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.smallModalCard}>
            <Text style={styles.modalTitle}>Close Session — Pick Winner</Text>
            <Text style={styles.modalDesc}>Select the winner. Loser pays the game fee of Rs. {fmt(sessionFee)} plus their own products.</Text>
            <View style={styles.winnerRow}>
              {['player1', 'player2'].map(side => {
                const name = side === 'player1' ? session.player1Name : session.player2Name;
                const selected = winner === side;
                return (
                  <TouchableOpacity key={side} style={[styles.winnerBtn, selected && styles.winnerBtnActive]} onPress={() => setWinner(side)}>
                    <Text style={{ fontSize: 20 }}>{selected ? '🏆' : '🎱'}</Text>
                    <Text style={[styles.winnerName, selected && { color: '#92400e' }]}>{name ?? side}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {winner && ['player1', 'player2'].map(side => {
              const name = side === 'player1' ? session.player1Name : session.player2Name;
              const isLoser = winner !== side;
              return (
                <View key={side} style={[styles.previewRow, { backgroundColor: isLoser ? '#fef2f2' : '#f0fdf4' }]}>
                  <Text style={styles.previewName}>{name} <Text style={{ color: isLoser ? '#dc2626' : '#16a34a', fontSize: 11 }}>{isLoser ? 'Loser' : 'Winner'}</Text></Text>
                  <Text style={styles.previewValue}>Rs. {fmt(closePreview(side))}</Text>
                </View>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCloseOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.closeConfirmBtn} onPress={() => closeMut.mutate()} disabled={!winner || closeMut.isPending}>
                {closeMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Close & Finalize</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!checkoutSide} animationType="fade" transparent onRequestClose={() => setCheckoutSide(null)}>
        <View style={styles.modalBg}>
          <View style={styles.smallModalCard}>
            <Text style={styles.modalTitle}>{checkoutSide === 'player1' ? session.player1Name : session.player2Name} — Bill</Text>
            <Text style={styles.billTotalValue}>Rs. {fmt(checkoutSide ? checkoutBill(checkoutSide) : 0)}</Text>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutSide(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
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
  playersRow: { flexDirection: 'row', gap: 8 },
  playerCard: { flex: 1, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb', padding: 10 },
  playerCardWinner: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  playerCardLoser: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  playerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  playerName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937', flex: 1 },
  paidTag: { fontSize: 9, fontFamily: 'Outfit-SemiBold', color: '#16a34a', backgroundColor: '#dcfce7', paddingHorizontal: 6, borderRadius: 999 },
  playerSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  addBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 8 },
  addBoxTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  playerToggleRow: { flexDirection: 'row', gap: 8 },
  playerToggle: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  playerToggleActive: { borderColor: '#a78bfa', backgroundColor: '#f5f3ff' },
  playerToggleText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  playerToggleTextActive: { color: '#6d28d9', fontFamily: 'Outfit-SemiBold' },
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
  productsRow: { flexDirection: 'row', gap: 8 },
  productsCol: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  productsColHeader: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280', backgroundColor: '#f9fafb', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  noProducts: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', padding: 10, textAlign: 'center' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  productRowName: { flex: 1, fontSize: 11, fontFamily: 'Outfit-Regular', color: '#374151' },
  productRowPrice: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  removeX: { fontSize: 12, color: '#f87171' },
  billSummary: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 6 },
  billTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  billValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  billTotalRow: { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  billTotalLabel: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827' },
  billTotalValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#15803d' },
  checkoutBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
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
  modalDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 14 },
  winnerRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  winnerBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  winnerBtnActive: { borderColor: '#fbbf24', backgroundColor: '#fffbeb' },
  winnerName: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6 },
  previewName: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  previewValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
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
  closeConfirmBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
