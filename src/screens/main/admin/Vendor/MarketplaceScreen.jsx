import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView, Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useMarketplace } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import { useAuth } from '../../../../context/AuthContext';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

function getAppliedTier(listing, qty) {
  const sorted = [...(listing.priceTiers ?? [])].sort((a, b) => b.minQty - a.minQty);
  const matched = sorted.find(t => qty >= t.minQty);
  const discountPct = matched ? matched.discountPct : 0;
  const unitPrice = listing.basePrice * (1 - discountPct / 100);
  return { unitPrice: Math.round(unitPrice * 100) / 100, discountPct };
}

const MarketplaceScreen = () => {
  const perms = usePermissions();
  const canAccess = perms.canAccessVendorBuyer();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('all');
  const [cart, setCart] = useState([]); // [{ listing, qty }]
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState(user?.name ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');

  const { data: raw = [], isLoading, refetch } = useMarketplace();
  const items = useMemo(() => (Array.isArray(raw) ? raw : (raw?.data ?? [])), [raw]);

  const vendorSpecializations = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.vendorCategory) set.add(i.vendorCategory); });
    return [...set];
  }, [items]);

  const filtered = items.filter(i => {
    const nameMatch = (i.productName ?? '').toLowerCase().includes(search.toLowerCase())
      || (i.vendorBusiness?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const specMatch = specFilter === 'all' || i.vendorCategory === specFilter;
    return nameMatch && specMatch;
  });

  const cartQty = id => cart.find(c => c.listing.id === id)?.qty ?? 0;
  const setCartQty = (listing, qty) => {
    setCart(prev => {
      if (qty <= 0) return prev.filter(c => c.listing.id !== listing.id);
      const exists = prev.find(c => c.listing.id === listing.id);
      if (exists) return prev.map(c => c.listing.id === listing.id ? { ...c, qty } : c);
      return [...prev, { listing, qty }];
    });
  };
  const addToCart = listing => {
    const current = cartQty(listing.id);
    setCartQty(listing, current === 0 ? listing.moq : current + 1);
  };

  const cartByVendor = useMemo(() => {
    const map = new Map();
    cart.forEach(item => {
      const vid = item.listing.vendorBusinessId;
      if (!map.has(vid)) map.set(vid, []);
      map.get(vid).push(item);
    });
    return Array.from(map.entries()).map(([vendorId, cartItems]) => ({
      vendorId,
      vendorName: cartItems[0].listing.vendorBusiness?.name ?? '—',
      items: cartItems,
      total: cartItems.reduce((sum, i) => sum + getAppliedTier(i.listing, i.qty).unitPrice * i.qty, 0),
    }));
  }, [cart]);
  const cartTotal = cartByVendor.reduce((s, v) => s + v.total, 0);
  const totalItems = cartByVendor.reduce((s, g) => s + g.items.length, 0);
  const belowMoq = cartByVendor.some(g => g.items.some(i => i.qty < i.listing.moq));

  const placeOrders = async () => {
    setOrderError('');
    setPlacing(true);
    try {
      const results = [];
      for (const group of cartByVendor) {
        const res = await apiClient.post('/admin/vendor/orders', {
          vendorBusinessId: group.vendorId,
          lines: group.items.map(i => ({ listingId: i.listing.id, qty: i.qty })),
          notes: notes || undefined,
          contactName: contactName || undefined,
          contactPhone: contactPhone || undefined,
          deliveryAddress: deliveryAddress || undefined,
        });
        const data = res?.data ?? res;
        results.push(data?.orderNumber);
      }
      setCart([]);
      setNotes('');
      setCartOpen(false);
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
      Alert.alert('Orders Placed', `Order numbers: ${results.filter(Boolean).join(', ')}`);
    } catch (e) {
      setOrderError(typeof e === 'string' ? e : 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  if (!canAccess) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noAccess}>You don't have access to the Marketplace.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="Search products or vendors…"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.cartBtn} onPress={() => setCartOpen(true)}>
            <Text style={styles.cartBtnText}>🛒</Text>
            {totalItems > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{totalItems}</Text></View>}
          </TouchableOpacity>
        </View>

        {vendorSpecializations.length > 0 && (
          <FlatList
            data={['all', ...vendorSpecializations]}
            keyExtractor={i => i}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, specFilter === item && styles.filterChipActive]}
                onPress={() => setSpecFilter(item)}
              >
                <Text style={[styles.filterChipText, specFilter === item && styles.filterChipTextActive]}>
                  {item === 'all' ? 'All' : item}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const qty = cartQty(item.id);
          const { unitPrice, discountPct } = getAppliedTier(item, qty > 0 ? qty : item.moq);
          const belowMin = qty > 0 && qty < item.moq;
          return (
            <View style={styles.card}>
              <View style={styles.cardImg}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.cardEmoji}>🛒</Text>
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={2}>{item.productName ?? '—'}</Text>
              <Text style={styles.cardVendor} numberOfLines={1}>{item.vendorBusiness?.name ?? '—'}</Text>
              {item.vendorCategory && <Text style={styles.cardSpec}>{item.vendorCategory}</Text>}

              <View style={styles.priceRow}>
                {qty > 0 && discountPct > 0 ? (
                  <>
                    <Text style={styles.cardPriceDiscount}>{fmt(unitPrice)}</Text>
                    <Text style={styles.cardPriceOld}>{fmt(item.basePrice)}</Text>
                  </>
                ) : (
                  <Text style={styles.cardPrice}>{fmt(item.basePrice)}</Text>
                )}
                <Text style={styles.cardUnit}>/{item.unit}</Text>
              </View>
              <Text style={styles.moqText}>MOQ: {item.moq} {item.unit}</Text>

              {qty === 0 ? (
                <TouchableOpacity style={styles.orderBtn} onPress={() => addToCart(item)}>
                  <Text style={styles.orderBtnText}>+ Add to Cart</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setCartQty(item, qty - 1)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setCartQty(item, qty + 1)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                </View>
              )}
              {belowMin && <Text style={styles.moqWarning}>Min. order is {item.moq} {item.unit}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No products in marketplace yet.</Text>}
        contentContainerStyle={styles.list}
      />

      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={styles.cartOverlay}>
          <View style={styles.cartSheet}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Wholesale Cart</Text>
              <TouchableOpacity onPress={() => setCartOpen(false)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {totalItems === 0 ? (
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
              ) : cartByVendor.map(group => (
                <View key={group.vendorId} style={{ marginBottom: 16 }}>
                  <View style={styles.vendorHeaderRow}>
                    <Text style={styles.vendorHeaderName}>{group.vendorName}</Text>
                    <Text style={styles.vendorHeaderTotal}>{fmt(group.total)}</Text>
                  </View>
                  {group.items.map(({ listing, qty }) => {
                    const { unitPrice, discountPct } = getAppliedTier(listing, qty);
                    return (
                      <View key={listing.id} style={styles.cartItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cartItemName} numberOfLines={1}>{listing.productName}</Text>
                          <Text style={styles.cartItemPrice}>{fmt(unitPrice)}/{listing.unit}{discountPct > 0 ? ` (${discountPct}% off)` : ''}</Text>
                          {qty < listing.moq && <Text style={styles.moqWarning}>Min. {listing.moq} required</Text>}
                        </View>
                        <TouchableOpacity style={styles.qtyBtnSm} onPress={() => setCartQty(listing, qty - 1)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                        <Text style={styles.qtyValueSm}>{qty}</Text>
                        <TouchableOpacity style={styles.qtyBtnSm} onPress={() => setCartQty(listing, qty + 1)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setCartQty(listing, 0)}><Text style={styles.removeX}>✕</Text></TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}

              {totalItems > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.sectionLabel}>Delivery Details</Text>
                  <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Contact name" placeholderTextColor="#999" />
                  <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+92 300 0000000" placeholderTextColor="#999" keyboardType="phone-pad" />
                  <TextInput style={styles.input} value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Delivery address" placeholderTextColor="#999" />
                  <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Add any notes for the vendor(s)…" placeholderTextColor="#999" multiline />
                </View>
              )}

              {orderError ? <Text style={styles.errorText}>{orderError}</Text> : null}
            </ScrollView>

            {totalItems > 0 && (
              <View style={styles.cartFooter}>
                <View style={styles.cartTotalRow}>
                  <Text style={styles.cartTotalLabel}>Total ({cartByVendor.length} vendor{cartByVendor.length > 1 ? 's' : ''})</Text>
                  <Text style={styles.cartTotalValue}>{fmt(cartTotal)}</Text>
                </View>
                {cartByVendor.length > 1 && <Text style={styles.multiVendorNote}>{cartByVendor.length} separate orders will be placed (one per vendor)</Text>}
                <TouchableOpacity style={[styles.placeBtn, (placing || belowMoq) && { opacity: 0.5 }]} onPress={placeOrders} disabled={placing || belowMoq}>
                  {placing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.placeBtnText}>Place Order</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:                { flex: 1, backgroundColor: '#f4f6f9' },
  centered:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noAccess:            { fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center' },
  topBar:              { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 12 },
  searchRow:           { flexDirection: 'row', gap: 8, marginBottom: 8 },
  search:              { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', fontFamily: 'Outfit-Regular', color: '#111' },
  cartBtn:             { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartBtnText:         { fontSize: 18 },
  cartBadge:           { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText:       { color: '#fff', fontSize: 10, fontFamily: 'Outfit-Bold' },
  filterList:          { marginTop: 2 },
  filterChip:          { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#F3F4F6' },
  filterChipActive:    { backgroundColor: colors.primary },
  filterChipText:      { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6B7280' },
  filterChipTextActive:{ color: '#fff' },
  list:                { padding: 10, paddingBottom: 24 },
  row:                 { justifyContent: 'space-between', marginBottom: 10 },
  card:                { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardImg:             { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardImage:           { width: '100%', height: '100%', borderRadius: 8 },
  cardEmoji:           { fontSize: 32 },
  cardName:            { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  cardVendor:          { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  cardSpec:            { fontSize: 9, fontFamily: 'Outfit-SemiBold', color: '#4f46e5', backgroundColor: '#eef2ff', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  priceRow:            { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 },
  cardPrice:           { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111' },
  cardPriceDiscount:   { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#15803d' },
  cardPriceOld:        { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', textDecorationLine: 'line-through' },
  cardUnit:            { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  moqText:             { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2, marginBottom: 6 },
  moqWarning:          { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#ef4444', marginTop: 3 },
  orderBtn:            { backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  orderBtnText:        { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  qtyRow:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyBtn:              { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:          { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#374151' },
  qtyValue:            { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111' },
  empty:               { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Cart sheet
  cartOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartSheet:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  cartHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartTitle:           { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111' },
  closeX:              { fontSize: 18, color: '#9ca3af', padding: 4 },
  emptyCartText:       { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', paddingVertical: 30 },
  vendorHeaderRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  vendorHeaderName:    { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  vendorHeaderTotal:   { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111' },
  cartItemRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 6 },
  cartItemName:        { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  cartItemPrice:       { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  qtyBtnSm:            { width: 24, height: 24, borderRadius: 5, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  qtyValueSm:          { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#111', width: 20, textAlign: 'center' },
  removeX:             { fontSize: 14, color: '#f87171', marginLeft: 4 },
  sectionLabel:        { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input:               { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 8 },
  errorText:           { color: '#dc2626', fontFamily: 'Outfit-Regular', fontSize: 12, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 4 },
  cartFooter:          { borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 12, marginTop: 10 },
  cartTotalRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cartTotalLabel:      { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111' },
  cartTotalValue:       { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#111' },
  multiVendorNote:     { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  placeBtn:            { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  placeBtnText:        { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default MarketplaceScreen;
