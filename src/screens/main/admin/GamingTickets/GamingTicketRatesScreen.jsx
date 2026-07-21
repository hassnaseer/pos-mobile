import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import {
  useGamingTicketRates, useCreateGamingTicketRate, useDeleteGamingTicketRate,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY = { label: '', durationMinutes: '', price: '' };

export default function GamingTicketRatesScreen() {
  const { data: raw = [], isLoading, isFetching, refetch } = useGamingTicketRates();
  const { mutateAsync: create, isPending: creating } = useCreateGamingTicketRate();
  const { mutateAsync: remove } = useDeleteGamingTicketRate();

  const rates = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setForm(EMPTY); setModal(true); };

  const handleSave = async () => {
    if (!form.label.trim()) { Alert.alert('Required', 'Label is required'); return; }
    if (!form.durationMinutes || !form.price) { Alert.alert('Required', 'Duration and price are required'); return; }
    try {
      await create({
        label: form.label.trim(),
        durationMinutes: parseInt(form.durationMinutes, 10),
        price: parseFloat(form.price),
      });
      setModal(false);
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to add rate');
    }
  };

  const handleDelete = rate => {
    Alert.alert('Delete Rate', `Remove "${rate.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(rate.id).catch(() => Alert.alert('Error', 'Failed to delete')) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Gaming Ticket Rates</Text>
          <Text style={styles.sub}>Duration presets & prices shown when creating a ticket</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={rates}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardMeta}>{item.durationMinutes} min · {item.price}</Text>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}><Text style={styles.delText}>✕</Text></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No rates configured yet.</Text>}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Rate</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Label *</Text>
              <TextInput style={styles.input} value={form.label} onChangeText={set('label')} placeholder="e.g. 30 Minutes" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput style={styles.input} value={form.durationMinutes} onChangeText={set('durationMinutes')} placeholder="30" placeholderTextColor="#999" keyboardType="number-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Price *</Text>
              <TextInput style={styles.input} value={form.price} onChangeText={set('price')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  cardMeta: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
