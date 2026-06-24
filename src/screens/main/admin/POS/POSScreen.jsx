import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Modal, Image, ScrollView, SafeAreaView,
} from 'react-native';
import productsIcon from '../../../../assets/icons/layers.png';
import { useProducts, useCustomers, useCreateCustomer, useCheckout, useTaxes, useMiscCharges } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

// ─── Per-item tax calculation (mirrors frontend logic) ────────────────────────
/**
 * A product may carry a taxRef: { name, percentage, isExcluded }
 * excluded tax: price × qty × rate / 100  (added on top)
 * included tax: price × qty × rate / (100 + rate)  (already inside price)
 */
const calcItemTax = (item) => {
  if (!item.taxRef || !item.taxRef.percentage) return { excluded: 0, included: 0 };
  const base   = item.unitPrice * item.qty;
  const rate   = parseFloat(item.taxRef.percentage);
  if (item.isTaxExcluded) return { excluded: base * rate / 100, included: 0 };
  return { excluded: 0, included: base * rate / (100 + rate) };
};

// ─── Cart item row ────────────────────────────────────────────────────────────
const CartItem = ({ item, onQty, onRemove, fmt }) => (
  <View style={styles.cartItem}>
    <View style={styles.cartInfo}>
      <Text style={styles.cartName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.cartUnit}>{fmt(item.unitPrice)} each</Text>
      {item.taxRef && (
        <Text style={styles.cartTax}>
          {item.taxRef.name} {item.isTaxExcluded ? '(+tax)' : '(incl.)'}
        </Text>
      )}
    </View>
    <View style={styles.qtyRow}>
      <TouchableOpacity style={styles.qtyBtn} onPress={() => onQty(item, item.qty - 1)}>
        <Text style={styles.qtyBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.qtyText}>{item.qty}</Text>
      <TouchableOpacity style={styles.qtyBtn} onPress={() => onQty(item, item.qty + 1)}>
        <Text style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.cartLineTotal}>{fmt(item.unitPrice * item.qty)}</Text>
    <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeBtn}>
      <Text style={styles.removeBtnText}>✕</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main POS screen ──────────────────────────────────────────────────────────
const POSScreen = () => {
  const [tab, setTab]               = useState('products');
  const [search, setSearch]         = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode]   = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState('idle'); // idle | found | notfound
  const [cart, setCart]                     = useState([]);
  const [paymentMethod, setPaymentMethod]   = useState('Cash');
  const [showReceipt, setShowReceipt]       = useState(false);
  const [lastOrder, setLastOrder]           = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const barcodeRef = useRef(null);

  const { fmt } = useCurrency();
  const { data: productsRaw = [], isLoading: loadingProducts } = useProducts();
  const { data: customersRaw = [] } = useCustomers();
  const { mutateAsync: createCustomer, isPending: addingCustomer } = useCreateCustomer();
  const { data: globalTaxes = [] } = useTaxes();
  const { data: miscCharges = [] } = useMiscCharges();
  const { mutateAsync: checkout, isPending: checkingOut } = useCheckout();

  const allCustomers = Array.isArray(customersRaw) ? customersRaw : (customersRaw?.data ?? []);
  const filteredCustomers = customerSearch.trim()
    ? allCustomers.filter(c =>
        (c.name ?? '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone ?? '').includes(customerSearch)
      )
    : allCustomers.slice(0, 20);

  const products = Array.isArray(productsRaw) ? productsRaw : (productsRaw?.data ?? []);
  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Add to cart ──────────────────────────────────────────────────────────
  const addToCart = useCallback(product => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          Alert.alert('Stock limit', `Only ${product.stock} available`);
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id:          product.id,
        name:        product.name,
        unitPrice:   parseFloat(product.price),
        qty:         1,
        stock:       product.stock,
        taxRef:      product.taxRef ?? null,       // per-product tax
        isTaxExcluded: product.isTaxExcluded ?? true,
      }];
    });
  }, []);

  // ─── Barcode scan ─────────────────────────────────────────────────────────
  const handleBarcodeScan = (raw) => {
    const code = raw.trim();
    if (!code) return;
    const match = products.find(p => p.barcode && p.barcode === code);
    setBarcodeInput('');
    if (match) {
      addToCart(match);
      setBarcodeStatus('found');
      setTimeout(() => setBarcodeStatus('idle'), 1200);
    } else {
      setBarcodeStatus('notfound');
      setTimeout(() => setBarcodeStatus('idle'), 2000);
    }
    // Re-focus so next scan is captured immediately
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const updateQty = (item, newQty) => {
    if (newQty <= 0) { removeFromCart(item); return; }
    if (newQty > item.stock) { Alert.alert('Stock limit', `Only ${item.stock} available`); return; }
    setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = item => setCart(prev => prev.filter(i => i.id !== item.id));

  // ─── Totals — per-item tax first, fall back to global taxes ───────────────
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  // Check if any cart item carries a per-item taxRef
  const hasPerItemTax = cart.some(i => !!i.taxRef);

  let excludedTaxTotal = 0;
  if (hasPerItemTax) {
    // Per-item calculation (accurate, mirrors frontend)
    excludedTaxTotal = cart.reduce((s, item) => s + calcItemTax(item).excluded, 0);
  } else {
    // Fallback: apply all active excluded global taxes on the whole subtotal
    excludedTaxTotal = (Array.isArray(globalTaxes) ? globalTaxes : [])
      .filter(t => t.isActive && (t.type === 'EXCLUDED' || t.isExcluded))
      .reduce((s, t) => s + subtotal * parseFloat(t.percentage) / 100, 0);
  }

  const miscTotal = (Array.isArray(miscCharges) ? miscCharges : []).reduce((s, m) => {
    const amt = parseFloat(m.amount) || 0;
    return s + (m.type === 'percentage' ? subtotal * amt / 100 : amt);
  }, 0);

  const total = subtotal + excludedTaxTotal + miscTotal;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ─── Checkout ─────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!cart.length) { Alert.alert('Empty cart', 'Add items to checkout'); return; }
    try {
      const result = await checkout({
        items: cart.map(i => ({
          productId:  i.id,
          quantity:   i.qty,
          unitPrice:  i.unitPrice,
          taxRefId:   i.taxRef?.id ?? null,
        })),
        paymentMethod,
        customerId: selectedCustomer?.id ?? undefined,
      });
      setLastOrder(result?.data ?? result);
      setCart([]);
      setSelectedCustomer(null);
      setTab('products');
      setShowReceipt(true);
    } catch (err) {
      Alert.alert('Checkout Failed', typeof err === 'string' ? err : 'Please try again.');
    }
  };

  // ─── Barcode status color ──────────────────────────────────────────────────
  const barcodeBg = barcodeStatus === 'found' ? '#D1FAE5' : barcodeStatus === 'notfound' ? '#FEE2E2' : '#f4f6f9';

  return (
    <SafeAreaView style={styles.root}>
      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]} onPress={() => setTab('products')}>
          <Text style={[styles.tabBtnText, tab === 'products' && styles.tabBtnTextActive]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'cart' && styles.tabBtnActive]} onPress={() => setTab('cart')}>
          <Text style={[styles.tabBtnText, tab === 'cart' && styles.tabBtnTextActive]}>
            Cart{cartCount > 0 ? ` (${cartCount})` : ''}
          </Text>
          {cartCount > 0 && tab !== 'cart' && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* Products tab */}
      {tab === 'products' && (
        <View style={styles.flex}>
          {/* Search / Barcode row */}
          <View style={styles.searchRow}>
            {barcodeMode ? (
              <View style={[styles.barcodeRow, { backgroundColor: barcodeBg }]}>
                <Text style={styles.barcodeIcon}>⬛</Text>
                <TextInput
                  ref={barcodeRef}
                  style={styles.barcodeInput}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  onSubmitEditing={e => handleBarcodeScan(e.nativeEvent.text)}
                  placeholder={
                    barcodeStatus === 'found'    ? '✓ Product added!' :
                    barcodeStatus === 'notfound' ? '✗ Barcode not found' :
                    'Scan barcode or type code…'
                  }
                  placeholderTextColor={barcodeStatus === 'found' ? '#059669' : barcodeStatus === 'notfound' ? '#DC2626' : '#999'}
                  returnKeyType="search"
                  autoFocus
                  blurOnSubmit={false}
                />
                <TouchableOpacity onPress={() => { setBarcodeMode(false); setBarcodeStatus('idle'); }}>
                  <Text style={styles.barcodeClose}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.searchInner}>
                <TextInput
                  style={styles.search}
                  placeholder="Search products…"
                  placeholderTextColor="#999"
                  value={search}
                  onChangeText={setSearch}
                />
                <TouchableOpacity style={styles.scanBtn} onPress={() => { setBarcodeMode(true); setBarcodeInput(''); setBarcodeStatus('idle'); }}>
                  <Text style={styles.scanBtnText}>⬛ Scan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {loadingProducts ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={p => String(p.id)}
              numColumns={2}
              columnWrapperStyle={styles.prodRow}
              contentContainerStyle={styles.prodGrid}
              renderItem={({ item }) => {
                const inCart = cart.find(c => c.id === item.id);
                const outOfStock = !item.stock || item.stock <= 0;
                return (
                  <TouchableOpacity
                    style={[styles.prodCard, inCart && styles.prodCardActive, outOfStock && styles.prodCardOos]}
                    onPress={() => !outOfStock && addToCart(item)}
                    activeOpacity={outOfStock ? 1 : 0.8}
                  >
                    <View style={styles.prodImageBox}>
                      {item.imageUrl
                        ? <Image source={{ uri: item.imageUrl }} style={[styles.prodImage, outOfStock && styles.prodImageOos]} resizeMode="cover" />
                        : <Image source={productsIcon} style={[styles.prodPlaceholder, outOfStock && styles.prodImageOos]} resizeMode="contain" />}
                      {outOfStock && (
                        <View style={styles.oosBadge}>
                          <Text style={styles.oosBadgeText}>Out of Stock</Text>
                        </View>
                      )}
                    </View>
                    {inCart && (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartText}>{inCart.qty}</Text>
                      </View>
                    )}
                    <Text style={[styles.prodName, outOfStock && styles.prodNameOos]} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.prodPrice}>{fmt(item.price)}</Text>
                    <Text style={styles.prodStock}>Stock: {item.stock ?? 0}</Text>
                    {item.taxRef && (
                      <Text style={styles.prodTaxBadge}>{item.taxRef.name}</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
            />
          )}

          {cartCount > 0 && (
            <TouchableOpacity style={styles.floatCartBtn} onPress={() => setTab('cart')}>
              <Text style={styles.floatCartText}>View Cart ({cartCount}) · {fmt(total)}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Cart tab */}
      {tab === 'cart' && (
        <View style={styles.flex}>
          <ScrollView style={styles.cartScroll} contentContainerStyle={styles.cartScrollContent}>
            {cart.length === 0 ? (
              <Text style={styles.emptyCart}>Your cart is empty</Text>
            ) : (
              cart.map(item => (
                <CartItem key={item.id} item={item} onQty={updateQty} onRemove={removeFromCart} fmt={fmt} />
              ))
            )}
          </ScrollView>

          {cart.length > 0 && (
            <View style={styles.checkout}>
              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalVal}>{fmt(subtotal)}</Text>
                </View>
                {excludedTaxTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax</Text>
                    <Text style={styles.totalVal}>{fmt(excludedTaxTotal)}</Text>
                  </View>
                )}
                {miscTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Misc Charges</Text>
                    <Text style={styles.totalVal}>{fmt(miscTotal)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.totalFinal]}>
                  <Text style={styles.totalFinalLabel}>Total</Text>
                  <Text style={styles.totalFinalVal}>{fmt(total)}</Text>
                </View>
              </View>

              {/* Customer assignment */}
              <TouchableOpacity style={styles.customerRow} onPress={() => setShowCustomerPicker(true)}>
                <Text style={styles.customerLabel}>Customer</Text>
                <Text style={selectedCustomer ? styles.customerName : styles.customerPlaceholder}>
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in / Select customer…'}
                </Text>
                {selectedCustomer && (
                  <TouchableOpacity onPress={() => setSelectedCustomer(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.customerClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <View style={styles.pmRow}>
                {['Cash', 'Card', 'Online'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pmBtn, paymentMethod === m && styles.pmBtnActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.pmText, paymentMethod === m && styles.pmTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, (!cart.length || checkingOut) && styles.checkoutBtnDisabled]}
                onPress={handleCheckout}
                disabled={checkingOut || !cart.length}
                activeOpacity={0.85}
              >
                {checkingOut
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.checkoutText}>Checkout {fmt(total)}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent onRequestClose={() => setShowCustomerPicker(false)}>
        <View style={styles.modalBg}>
          <View style={styles.customerSheet}>
            <Text style={styles.customerSheetTitle}>Select Customer</Text>
            <TextInput
              style={styles.customerSearchInput}
              placeholder="Search by name or phone…"
              placeholderTextColor="#999"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity style={styles.customerOption} onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); setShowCustomerPicker(false); }}>
                <Text style={styles.customerOptionText}>— Walk-in (no customer) —</Text>
              </TouchableOpacity>
              {filteredCustomers.map(c => (
                <TouchableOpacity key={c.id} style={styles.customerOption} onPress={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerPicker(false); }}>
                  <Text style={[styles.customerOptionText, selectedCustomer?.id === c.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{c.name}</Text>
                  {c.phone ? <Text style={styles.customerOptionSub}>{c.phone}</Text> : null}
                </TouchableOpacity>
              ))}
              {customerSearch.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.addCustomerBtn}
                  disabled={addingCustomer}
                  onPress={async () => {
                    try {
                      const res = await createCustomer({ name: customerSearch.trim() });
                      const newCustomer = res?.data ?? res;
                      setSelectedCustomer(newCustomer);
                      setCustomerSearch('');
                      setShowCustomerPicker(false);
                    } catch {
                      Alert.alert('Error', 'Failed to add customer');
                    }
                  }}
                >
                  {addingCustomer
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={styles.addCustomerBtnText}>+ Add "{customerSearch.trim()}" as new customer</Text>}
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.customerSheetClose} onPress={() => { setCustomerSearch(''); setShowCustomerPicker(false); }}>
              <Text style={styles.customerSheetCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceipt} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.receipt}>
            <Text style={styles.receiptIcon}>✅</Text>
            <Text style={styles.receiptTitle}>Sale Complete!</Text>
            {lastOrder && (
              <View style={styles.receiptDetails}>
                <Text style={styles.receiptRow}>Order: {lastOrder.orderNumber}</Text>
                <Text style={styles.receiptRow}>Total: {fmt(lastOrder.totalAmount)}</Text>
                <Text style={styles.receiptRow}>Payment: {lastOrder.paymentMethod}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setShowReceipt(false)}>
              <Text style={styles.receiptCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f4f6f9' },
  flex:    { flex: 1 },
  tabBar:  { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn:  { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabBtnActive:     { borderBottomWidth: 2, borderColor: colors.primary },
  tabBtnText:       { fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabBtnTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  cartBadge:     { position: 'absolute', top: 8, right: 24, backgroundColor: colors.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit-Bold' },
  // Search / Barcode
  searchRow:   { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  searchInner: { flexDirection: 'row', gap: 8 },
  search:      { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', borderWidth: 1, borderColor: '#E5E7EB' },
  scanBtn:     { backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  scanBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  barcodeRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#D0D5DD', paddingHorizontal: 10, paddingVertical: 6, gap: 8 },
  barcodeIcon: { fontSize: 18 },
  barcodeInput:{ flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', paddingVertical: 4 },
  barcodeClose:{ fontSize: 16, color: '#9CA3AF', padding: 4 },
  // Product grid
  prodGrid:  { padding: 10, paddingBottom: 90 },
  prodRow:   { gap: 10, marginBottom: 10 },
  prodCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2, position: 'relative' },
  prodCardActive: { borderWidth: 2, borderColor: colors.primary },
  prodImageBox:   { width: '100%', aspectRatio: 1, backgroundColor: '#f4f6f9', borderRadius: 8, marginBottom: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  prodImage:      { width: '100%', height: '100%' },
  prodPlaceholder:{ width: 32, height: 32, tintColor: '#bbb' },
  inCartBadge:    { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  inCartText:     { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },
  prodName:       { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 4 },
  prodPrice:      { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.primary },
  prodStock:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 3 },
  prodTaxBadge:   { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  prodCardOos:    { opacity: 0.55 },
  prodImageOos:   { opacity: 0.4 },
  prodNameOos:    { color: '#9CA3AF' },
  oosBadge:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4, alignItems: 'center' },
  oosBadgeText:   { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  empty:          { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 20 },
  floatCartBtn:   { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6 },
  floatCartText:  { color: '#fff', fontSize: 15, fontFamily: 'Outfit-Bold' },
  // Cart
  cartScroll:        { flex: 1 },
  cartScrollContent: { padding: 12, paddingBottom: 8 },
  cartItem:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, gap: 8 },
  cartInfo:      { flex: 1 },
  cartName:      { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  cartUnit:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  cartTax:       { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 1 },
  qtyRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:        { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBF0F5', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:    { fontSize: 18, color: colors.defaultBlack, lineHeight: 22 },
  qtyText:       { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, minWidth: 22, textAlign: 'center' },
  cartLineTotal: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary, minWidth: 60, textAlign: 'right' },
  removeBtn:     { padding: 4 },
  removeBtnText: { color: '#ef4444', fontSize: 14 },
  emptyCart:     { textAlign: 'center', color: '#ccc', fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Checkout panel
  checkout:       { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  totalsBox:      { marginBottom: 12 },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  totalVal:       { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  totalFinal:     { paddingTop: 8, borderTopWidth: 1, borderColor: '#f0f0f0', marginTop: 4 },
  totalFinalLabel:{ fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  totalFinalVal:  { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.primary },
  customerRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 10, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  customerLabel:        { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280', width: 68 },
  customerName:         { flex: 1, fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  customerPlaceholder:  { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  customerClear:        { fontSize: 14, color: '#9ca3af', paddingHorizontal: 4 },
  customerSheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  customerSheetTitle:   { fontSize: 17, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 12 },
  customerSearchInput:  { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', marginBottom: 8 },
  customerOption:       { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  customerOptionText:   { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  customerOptionSub:    { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  customerSheetClose:   { marginTop: 12, alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8 },
  customerSheetCloseText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  addCustomerBtn:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderTopWidth: 1, borderColor: '#e0f2fe', backgroundColor: '#f0f9ff', minHeight: 46 },
  addCustomerBtnText:   { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  pmRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pmBtn:     { flex: 1, borderRadius: 8, paddingVertical: 10, borderWidth: 1, borderColor: '#D0D5DD', alignItems: 'center' },
  pmBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  pmText:    { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.secondary },
  pmTextActive:{ color: '#fff' },
  checkoutBtn:        { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  checkoutBtnDisabled:{ opacity: 0.6 },
  checkoutText:       { color: '#fff', fontSize: 15, fontFamily: 'Outfit-Bold' },
  // Receipt
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  receipt:       { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: 280, alignItems: 'center' },
  receiptIcon:   { fontSize: 40, marginBottom: 8 },
  receiptTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#22c55e', marginBottom: 16 },
  receiptDetails:{ alignSelf: 'stretch', marginBottom: 8 },
  receiptRow:    { fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, marginBottom: 6, textAlign: 'center' },
  receiptCloseBtn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32 },
  receiptCloseText:{ color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
});

export default POSScreen;
