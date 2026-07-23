import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Modal, Image, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import productsIcon from '../../../../assets/icons/layers.png';
import {
  useProducts, useCustomers, useCreateCustomer, useCheckout, useTaxes, useMiscCharges,
  useAdminSettings, useInvoiceTemplate,
} from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import InvoicePreviewModal from '../../../../components/InvoicePreviewModal/InvoicePreviewModal';
import BarcodeScannerModal from '../../../../components/BarcodeScanner/BarcodeScannerModal';
import { buildSalesInvoiceHtml } from '../../../../utils/invoicePrinter';
import colors from '../../../../theme/colors';

// Groups a checked-out cart's per-item taxRef into named excluded/included breakdown rows,
// mirroring web's handleConfirmCheckout grouping in frontend/src/app/pages/admin/pos/index.tsx.
const groupInvoiceTaxes = (invoiceCart, excluded) => {
  const bd = {};
  invoiceCart.forEach(item => {
    if (!item.taxRef || item.isTaxExcluded !== excluded) return;
    const key = item.taxRef.name;
    if (!bd[key]) bd[key] = { name: item.taxRef.name, percentage: item.taxRef.percentage, amount: 0, type: excluded ? 'excluded' : 'included' };
    bd[key].amount += excluded
      ? (item.price * item.quantity * item.taxRef.percentage) / 100
      : (item.price * item.quantity * item.taxRef.percentage) / (100 + item.taxRef.percentage);
  });
  return Object.values(bd).map(t => ({ ...t, amount: parseFloat(t.amount.toFixed(2)) }));
};

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
const CartItem = ({ item, onQty, onSetQty, onPrice, onRemove, fmt }) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(item.unitPrice));
  const [qtyInput, setQtyInput] = useState(String(item.qty));
  const [editingQty, setEditingQty] = useState(false);
  const belowMin = item.minSellingPrice > 0 && item.unitPrice < item.minSellingPrice;

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartInfo}>
        <Text style={styles.cartName} numberOfLines={1}>{item.name}</Text>
        {editingPrice ? (
          <TextInput
            style={[styles.priceEditInput, belowMin && styles.priceEditInputError]}
            value={priceInput}
            onChangeText={setPriceInput}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={() => {
              const v = parseFloat(priceInput);
              if (!isNaN(v) && v >= 0) onPrice(item, v);
              setEditingPrice(false);
            }}
          />
        ) : (
          <TouchableOpacity onPress={() => { setPriceInput(String(item.unitPrice)); setEditingPrice(true); }}>
            <Text style={[styles.cartUnit, belowMin && styles.cartUnitError]}>{fmt(item.unitPrice)} each (tap to edit)</Text>
          </TouchableOpacity>
        )}
        {belowMin && <Text style={styles.minPriceWarn}>Min: {fmt(item.minSellingPrice)}</Text>}
        {item.taxRef && (
          <Text style={styles.cartTax}>
            {item.taxRef.name} {item.isTaxExcluded ? '(+tax)' : '(incl.)'}
          </Text>
        )}
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onQty(item, parseFloat((item.qty - 1).toFixed(3)))}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        {editingQty ? (
          <TextInput
            style={styles.qtyEditInput}
            value={qtyInput}
            onChangeText={setQtyInput}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={() => {
              const v = parseFloat(qtyInput);
              if (!isNaN(v) && v > 0) onSetQty(item, v);
              setEditingQty(false);
            }}
          />
        ) : (
          <TouchableOpacity onPress={() => { setQtyInput(String(item.qty)); setEditingQty(true); }}>
            <Text style={styles.qtyText}>{item.qty}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onQty(item, parseFloat((item.qty + 1).toFixed(3)))}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cartLineTotal}>{fmt(item.unitPrice * item.qty)}</Text>
      <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main POS screen ──────────────────────────────────────────────────────────
const POSScreen = () => {
  const [tab, setTab]               = useState('products');
  const [search, setSearch]         = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode]   = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState('idle'); // idle | found | notfound
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cart, setCart]                     = useState([]);
  const [paymentMethod, setPaymentMethod]   = useState('Cash');
  const [showReceipt, setShowReceipt]       = useState(false);
  const [lastOrder, setLastOrder]           = useState(null);
  const [lastInvoiceHtml, setLastInvoiceHtml] = useState('');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [cartMiscCharges, setCartMiscCharges] = useState([]);
  const [showChargePicker, setShowChargePicker] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  const barcodeRef = useRef(null);

  const { fmt, symbol, invoiceTerms } = useCurrency();
  const { data: productsRaw = [], isLoading: loadingProducts, isFetching: fetchingProducts, refetch: refetchProducts } = useProducts();
  const { data: customersRaw = [] } = useCustomers();
  const { mutateAsync: createCustomer, isPending: addingCustomer } = useCreateCustomer();
  const { data: globalTaxes = [] } = useTaxes();
  const { data: miscCharges = [] } = useMiscCharges();
  const { mutateAsync: checkout, isPending: checkingOut } = useCheckout();
  const { data: businessSettings } = useAdminSettings();
  const { data: invoiceTemplateCfg } = useInvoiceTemplate();

  const allCustomers = Array.isArray(customersRaw) ? customersRaw : (customersRaw?.data ?? []);
  const filteredCustomers = customerSearch.trim()
    ? allCustomers.filter(c =>
        (c.name ?? '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone ?? '').includes(customerSearch)
      )
    : allCustomers.slice(0, 20);

  const products = Array.isArray(productsRaw) ? productsRaw : (productsRaw?.data ?? []);
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q)
    );
  });

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
        minSellingPrice: parseFloat(product.minSellingPrice) || 0,
        taxRef:      product.taxRef ?? null,       // per-product tax
        isTaxExcluded: product.isTaxExcluded ?? true,
      }];
    });
  }, []);

  // ─── Barcode scan ─────────────────────────────────────────────────────────
  const handleBarcodeScan = (raw) => {
    const code = raw.trim();
    if (!code) return;
    const match = products.find(p => (p.barcode && p.barcode === code) || (p.sku && p.sku === code));
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

  const setQtyDirect = (item, newQty) => {
    if (newQty <= 0) { removeFromCart(item); return; }
    setCart(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
  };

  const updatePrice = (item, newPrice) => {
    setCart(prev => prev.map(i => i.id === item.id ? { ...i, unitPrice: newPrice } : i));
  };

  const removeFromCart = item => setCart(prev => prev.filter(i => i.id !== item.id));

  const addCharge = charge => setCartMiscCharges(prev => prev.find(c => c.id === charge.id) ? prev : [...prev, charge]);
  const removeCharge = id => setCartMiscCharges(prev => prev.filter(c => c.id !== id));

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

  // Only explicitly-added charges count toward the total (mirrors web's CartPanel — charges
  // are opt-in per sale via the "+ Add fee" picker, not auto-applied from the active list).
  const miscTotal = cartMiscCharges.reduce((s, m) => {
    const amt = parseFloat(m.amount) || 0;
    return s + (m.type === 'percentage' ? subtotal * amt / 100 : amt);
  }, 0);

  const total = subtotal + excludedTaxTotal + miscTotal;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const priceErrors = cart.filter(i => i.minSellingPrice > 0 && i.unitPrice < i.minSellingPrice);
  const partialNum = partialAmount ? parseFloat(partialAmount) : 0;
  const receivedNum = amountReceived ? parseFloat(amountReceived) : 0;
  const change = !isPartial && paymentMethod === 'Cash' && amountReceived ? receivedNum - total : 0;
  const balanceDue = isPartial && partialNum > 0 ? Math.max(0, total - partialNum) : 0;

  const canSubmit = !checkingOut && cart.length > 0 && priceErrors.length === 0 && (
    isPartial
      ? partialNum > 0 && partialNum <= total
      : (paymentMethod !== 'Cash' || (!!amountReceived && receivedNum >= total))
  );

  // ─── Checkout ─────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!cart.length) { Alert.alert('Empty cart', 'Add items to checkout'); return; }
    if (priceErrors.length > 0) { Alert.alert('Price too low', 'One or more items are priced below their minimum selling price.'); return; }
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
        miscCharges: cartMiscCharges.map(({ name, amount, type }) => ({ name, amount, type })),
        amountReceived: !isPartial && paymentMethod === 'Cash' && amountReceived ? receivedNum : undefined,
        amountPaid: isPartial && partialAmount ? partialNum : undefined,
      });
      const order = result?.data ?? result;

      // Snapshot cart/customer/tax data before it's cleared below, so the
      // receipt can render an accurate invoice (mirrors web's handleConfirmCheckout).
      const invoiceCart = cart.map(i => ({
        name: i.name, quantity: i.qty, price: i.unitPrice,
        taxRef: i.taxRef, isTaxExcluded: i.isTaxExcluded,
      }));
      const html = buildSalesInvoiceHtml({
        order: { ...order, amountReceived: !isPartial && paymentMethod === 'Cash' && amountReceived ? receivedNum : order?.totalAmount },
        cart: invoiceCart,
        businessName: businessSettings?.name || '',
        businessPhone: businessSettings?.phone,
        businessEmail: businessSettings?.email,
        businessAddress: businessSettings?.address,
        symbol,
        invoiceTerms,
        subtotal,
        excludedTaxes: groupInvoiceTaxes(invoiceCart, true),
        includedTaxes: groupInvoiceTaxes(invoiceCart, false),
        cartMiscCharges,
        selectedCustomer: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, email: selectedCustomer.email } : null,
        template: invoiceTemplateCfg,
      });

      setLastOrder(order);
      setLastInvoiceHtml(html);
      setCart([]);
      setSelectedCustomer(null);
      setCartMiscCharges([]);
      setIsPartial(false);
      setPartialAmount('');
      setAmountReceived('');
      setTab('products');
      setShowReceipt(true);
    } catch (err) {
      Alert.alert('Checkout Failed', typeof err === 'string' ? err : 'Please try again.');
    }
  };

  // ─── Barcode status color ──────────────────────────────────────────────────
  const barcodeBg = barcodeStatus === 'found' ? '#D1FAE5' : barcodeStatus === 'notfound' ? '#FEE2E2' : '#f4f6f9';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
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
                <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerOpen(true)}>
                  <Text style={styles.scanBtnText}>📷 Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keyboardScanBtn} onPress={() => { setBarcodeMode(true); setBarcodeInput(''); setBarcodeStatus('idle'); }}>
                  <Text style={styles.keyboardScanBtnText}>⌨️</Text>
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
              refreshControl={<RefreshControl refreshing={fetchingProducts} onRefresh={refetchProducts} tintColor={colors.primary} />}
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
                <CartItem key={item.id} item={item} onQty={updateQty} onSetQty={setQtyDirect} onPrice={updatePrice} onRemove={removeFromCart} fmt={fmt} />
              ))
            )}
          </ScrollView>

          {cart.length > 0 && (
            <View style={styles.checkout}>
              {/* Extra / misc charges */}
              {Array.isArray(miscCharges) && miscCharges.filter(c => c.isActive).length > 0 && (
                <View style={styles.chargesBox}>
                  <View style={styles.chargesHeader}>
                    <Text style={styles.chargesLabel}>Extra Charges</Text>
                    <TouchableOpacity style={styles.addChargeBtn} onPress={() => setShowChargePicker(true)}>
                      <Text style={styles.addChargeBtnText}>+ Add fee</Text>
                    </TouchableOpacity>
                  </View>
                  {cartMiscCharges.map(mc => (
                    <View key={mc.id} style={styles.chargeRow}>
                      <Text style={styles.chargeName}>{mc.name}</Text>
                      <Text style={styles.chargeAmt}>
                        {fmt(mc.type === 'percentage' ? subtotal * mc.amount / 100 : Number(mc.amount))}
                      </Text>
                      <TouchableOpacity onPress={() => removeCharge(mc.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={styles.chargeRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

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
                {['Cash', 'Card', 'Digital Wallet'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pmBtn, paymentMethod === m && styles.pmBtnActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.pmText, paymentMethod === m && styles.pmTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Partial payment toggle */}
              <TouchableOpacity
                style={styles.partialToggleRow}
                onPress={() => { setIsPartial(v => !v); setPartialAmount(''); setAmountReceived(''); }}
              >
                <View style={[styles.checkbox, isPartial && styles.checkboxActive]}>
                  {isPartial && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.partialToggleText}>Partial Payment</Text>
                {isPartial && <Text style={styles.partialHint}>balance will be owed</Text>}
              </TouchableOpacity>

              {isPartial ? (
                <View style={styles.paymentInputBox}>
                  <Text style={styles.label}>Amount Paying Now *</Text>
                  <TextInput
                    style={styles.paymentInput}
                    value={partialAmount}
                    onChangeText={setPartialAmount}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                  {partialNum > 0 && partialNum < total && (
                    <Text style={styles.balanceDueText}>Balance Due: {fmt(balanceDue)}</Text>
                  )}
                  {partialNum >= total && partialNum > 0 && (
                    <Text style={styles.fullPaidText}>Full amount — will mark as Completed</Text>
                  )}
                </View>
              ) : paymentMethod === 'Cash' ? (
                <View style={styles.paymentInputBox}>
                  <Text style={styles.label}>Amount Received *</Text>
                  <TextInput
                    style={styles.paymentInput}
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                  {amountReceived && receivedNum >= total && (
                    <Text style={styles.fullPaidText}>Change: {fmt(change)}</Text>
                  )}
                </View>
              ) : null}

              {priceErrors.length > 0 && (
                <Text style={styles.priceErrorText}>
                  {priceErrors.length} item{priceErrors.length > 1 ? 's are' : ' is'} priced below the minimum selling price.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.checkoutBtn, !canSubmit && styles.checkoutBtnDisabled]}
                onPress={handleCheckout}
                disabled={!canSubmit}
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

      {/* Extra Charge Picker Modal */}
      <Modal visible={showChargePicker} transparent animationType="fade" onRequestClose={() => setShowChargePicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowChargePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.customerSheetTitle}>Add Extra Charge</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(Array.isArray(miscCharges) ? miscCharges : [])
                .filter(c => c.isActive && !cartMiscCharges.find(mc => mc.id === c.id))
                .map(c => (
                  <TouchableOpacity key={c.id} style={styles.customerOption} onPress={() => { addCharge(c); setShowChargePicker(false); }}>
                    <Text style={styles.customerOptionText}>
                      {c.name} ({c.type === 'percentage' ? `${c.amount}%` : fmt(Number(c.amount))})
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
            <TouchableOpacity
              style={styles.receiptPrintBtn}
              onPress={() => { setShowReceipt(false); setShowInvoicePreview(true); }}
            >
              <Text style={styles.receiptPrintText}>Print / Share Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setShowReceipt(false)}>
              <Text style={styles.receiptCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InvoicePreviewModal
        visible={showInvoicePreview}
        onClose={() => setShowInvoicePreview(false)}
        html={lastInvoiceHtml}
        fileName={lastOrder?.orderNumber ? `invoice-${lastOrder.orderNumber}` : 'invoice'}
        title="Invoice"
      />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={code => { handleBarcodeScan(code); setScannerOpen(false); }}
      />
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
  keyboardScanBtn:     { backgroundColor: '#f4f6f9', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, justifyContent: 'center' },
  keyboardScanBtnText: { fontSize: 15 },
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
  cartUnit:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2, textDecorationLine: 'underline' },
  cartUnitError: { color: '#dc2626' },
  minPriceWarn:  { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#dc2626', marginTop: 1 },
  priceEditInput:{ borderWidth: 1.5, borderColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontFamily: 'Outfit-Regular', color: '#111', width: 90, marginTop: 2 },
  priceEditInputError: { borderColor: '#dc2626' },
  cartTax:       { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 1 },
  qtyRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:        { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBF0F5', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:    { fontSize: 18, color: colors.defaultBlack, lineHeight: 22 },
  qtyText:       { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, minWidth: 22, textAlign: 'center' },
  qtyEditInput:  { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, minWidth: 40, textAlign: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingVertical: 2 },
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
  // Extra charges
  chargesBox:      { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  chargesHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chargesLabel:    { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  addChargeBtn:    { borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addChargeBtnText:{ fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  chargeRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  chargeName:      { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chargeAmt:       { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  chargeRemove:    { fontSize: 13, color: '#ef4444', paddingHorizontal: 2 },
  pickerBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  // Partial / amount received
  partialToggleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  checkbox:        { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark:    { color: '#fff', fontSize: 12, fontFamily: 'Outfit-Bold' },
  partialToggleText:{ fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack },
  partialHint:     { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#d97706' },
  paymentInputBox: { marginBottom: 12 },
  label:           { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280', marginBottom: 6 },
  paymentInput:    { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  balanceDueText:  { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#d97706', marginTop: 6 },
  fullPaidText:    { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#16a34a', marginTop: 6 },
  priceErrorText:  { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#dc2626', marginBottom: 10, textAlign: 'center' },
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
  receiptPrintBtn: { marginTop: 4, alignSelf: 'stretch', borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 10, alignItems: 'center' },
  receiptPrintText:{ color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default POSScreen;
