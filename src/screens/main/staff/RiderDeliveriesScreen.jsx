import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, Alert, Image, TextInput, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick, types, isCancel } from '@react-native-documents/picker'
import { BASE_URL } from '../../../services/api/globalApi';
import { useMyDeliveries, useMarkPickedUp, useMarkDelivered } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import colors from '../../../theme/colors';

const STATUS_STYLE = {
  confirmed:        { bg: '#dbeafe', text: '#1e40af' },
  shipped:          { bg: '#ede9fe', text: '#6d28d9' },
  out_for_delivery: { bg: '#ffedd5', text: '#c2410c' },
  delivered:        { bg: '#d1fae5', text: '#065f46' },
  pending:          { bg: '#fef9c3', text: '#a16207' },
  cancelled:        { bg: '#fee2e2', text: '#b91c1c' },
};
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};

async function uploadImage(file) {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: file.uri, type: file.type ?? 'image/jpeg', name: file.name ?? 'proof.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? '';
}

const EMPTY_FORM = { paymentMethod: 'cod', paymentNote: '', proofImageUrl: '', paymentProofUrl: '' };

export default function RiderDeliveriesScreen() {
  const { fmt } = useCurrency();
  const { data: raw = [], isLoading, isFetching, refetch } = useMyDeliveries();
  const { mutateAsync: pickup, variables: pickupVar, isPending: pickingUp } = useMarkPickedUp();
  const { mutateAsync: deliver, isPending: delivering } = useMarkDelivered();

  const deliveries = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [tab, setTab] = useState('active');
  const [expanded, setExpanded] = useState(null);
  const [deliverOrder, setDeliverOrder] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const active = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'cancelled');
  const completed = deliveries.filter(d => d.status === 'delivered');
  const visible = tab === 'active' ? active : completed;

  const handlePickup = async order => {
    try { await pickup(order.id); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to update order'); }
  };

const pickImage = async field => {
  const setBusy =
    field === 'proofImageUrl'
      ? setUploading
      : setUploadingPayment;

  try {
    const [picked] = await pick({
      type: [types.images],
    });

    setBusy(true);

    const url = await uploadImage(picked);

    set(field)(url);

  } catch (e) {
    if (!isCancel(e)) {
      Alert.alert('Error', 'Image upload failed');
    }
  } finally {
    setBusy(false);
  }
};

  const openDeliver = order => { setDeliverOrder(order); setForm(EMPTY_FORM); };

  const handleDeliver = async () => {
    if (!form.proofImageUrl) { Alert.alert('Error', 'Please upload a delivery proof photo'); return; }
    try {
      await deliver({
        orderId: deliverOrder.id,
        paymentMethod: form.paymentMethod,
        paymentNote: form.paymentNote || undefined,
        proofImageUrl: form.proofImageUrl,
        paymentProofUrl: form.paymentProofUrl || undefined,
      });
      setDeliverOrder(null);
      setForm(EMPTY_FORM);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to mark delivered');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Deliveries</Text>
        <Text style={styles.subHeading}>Manage your assigned delivery orders</Text>
        <View style={styles.tabs}>
          {['active', 'delivered'].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'active' ? `Active (${active.length})` : `Delivered (${completed.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>{tab === 'active' ? 'No active deliveries assigned to you.' : 'No completed deliveries yet.'}</Text>}
          renderItem={({ item }) => {
            const isExpanded = expanded === item.id;
            const isBusy = pickingUp && pickupVar === item.id;
            const canPickup = item.status === 'confirmed' || item.status === 'shipped';
            const canDeliver = item.status === 'out_for_delivery';
            const badge = STATUS_STYLE[item.status] ?? { bg: '#f3f4f6', text: '#374151' };
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardTop} onPress={() => setExpanded(isExpanded ? null : item.id)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {item.buyerBusiness?.name}{item.deliveryAddress ? ` · ${item.deliveryAddress}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.total}>{fmt(item.total)}</Text>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  {canPickup && (
                    <TouchableOpacity style={styles.pickupBtn} onPress={() => handlePickup(item)} disabled={isBusy}>
                      {isBusy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Mark Picked Up</Text>}
                    </TouchableOpacity>
                  )}
                  {canDeliver && (
                    <TouchableOpacity style={styles.deliverBtn} onPress={() => openDeliver(item)}>
                      <Text style={styles.actionBtnText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isExpanded && (
                  <View style={styles.details}>
                    <Text style={styles.detailsLabel}>Items</Text>
                    {(item.lines ?? []).map(line => (
                      <View key={line.id} style={styles.lineRow}>
                        <Text style={styles.lineText}>{line.productName}</Text>
                        <Text style={styles.lineSub}>{line.qty} × {fmt(line.unitPrice)}</Text>
                      </View>
                    ))}
                    <View style={styles.lineTotal}>
                      <Text style={styles.lineTotalText}>Total</Text>
                      <Text style={styles.lineTotalText}>{fmt(item.total)}</Text>
                    </View>
                    {item.contactPhone ? <Text style={styles.detailSub}>Contact: {item.contactPhone}</Text> : null}
                    {item.deliveryAddress ? <Text style={styles.detailSub}>Address: {item.deliveryAddress}</Text> : null}
                    {item.status === 'delivered' && item.proofImageUrl && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.detailsLabel}>Delivery Proof</Text>
                        <Image source={{ uri: item.proofImageUrl }} style={styles.proofImage} />
                        {item.paymentMethod ? (
                          <Text style={styles.detailSub}>
                            {item.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                            {item.paymentNote ? ` — ${item.paymentNote}` : ''}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={!!deliverOrder} animationType="slide" transparent onRequestClose={() => setDeliverOrder(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark as Delivered</Text>
            <Text style={styles.modalSub}>Order {deliverOrder?.orderNumber} — {deliverOrder?.buyerBusiness?.name}</Text>

            <Text style={styles.label}>Payment Method</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['cod', 'bank_transfer'].map(m => (
                <TouchableOpacity key={m} style={[styles.methodBtn, form.paymentMethod === m && styles.methodBtnActive]} onPress={() => set('paymentMethod')(m)}>
                  <Text style={[styles.methodText, form.paymentMethod === m && styles.methodTextActive]}>
                    {m === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{form.paymentMethod === 'cod' ? 'Amount Collected' : 'Transaction Reference'}</Text>
            <TextInput
              style={styles.input}
              value={form.paymentNote}
              onChangeText={set('paymentNote')}
              placeholder={form.paymentMethod === 'cod' ? 'e.g. 5000' : 'e.g. TXN123456'}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Delivery Proof Photo *</Text>
            {form.proofImageUrl ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Image source={{ uri: form.proofImageUrl }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => set('proofImageUrl')('')}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('proofImageUrl')} disabled={uploading}>
                <Text style={styles.uploadText}>{uploading ? 'Uploading…' : 'Tap to upload photo'}</Text>
              </TouchableOpacity>
            )}

            {form.paymentMethod === 'bank_transfer' && (
              <>
                <Text style={styles.label}>Payment Screenshot (optional)</Text>
                {form.paymentProofUrl ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Image source={{ uri: form.paymentProofUrl }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => set('paymentProofUrl')('')}>
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('paymentProofUrl')} disabled={uploadingPayment}>
                    <Text style={styles.uploadText}>{uploadingPayment ? 'Uploading…' : 'Tap to upload'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeliverOrder(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleDeliver} disabled={!form.proofImageUrl || delivering}>
                {delivering ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmText}>Confirm Delivery</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  orderNumber: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  cardSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 3 },
  total: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#111827' },
  cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  pickupBtn: { flex: 1, backgroundColor: '#f97316', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  deliverBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  details: { borderTopWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#f9fafb', padding: 12, gap: 4 },
  detailsLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  lineSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  lineTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 6, marginTop: 4 },
  lineTotalText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  detailSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  proofImage: { width: 110, height: 110, borderRadius: 10, marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  methodBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  methodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  methodTextActive: { color: '#fff' },
  uploadBox: { borderWidth: 2, borderColor: '#D0D5DD', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 20, alignItems: 'center', marginBottom: 12 },
  uploadText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  previewImage: { width: 70, height: 70, borderRadius: 10 },
  removeBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  removeBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  confirmBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
