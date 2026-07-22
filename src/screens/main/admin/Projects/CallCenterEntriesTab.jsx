import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);

// Durations are stored as minutes, formatted as HH:MM:SS for display — mirrors web's
// CallCenterEntriesTab.tsx minutesToHms().
const minutesToHms = m => {
  const total = Math.round((m ?? 0) * 60);
  const h = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  entryDate: todayStr(), calls: '', sale: '',
  timeMinutes: '', pauseMinutes: '', talkMinutes: '', dispoMinutes: '', deadMinutes: '',
  amount: '', currency: '', notes: '',
});

/** Call Center category's dedicated entries tab — no employee field in the create form
 *  (backend auto-attributes the logged-in user), matches web's CallCenterEntriesTab.tsx. */
export default function CallCenterEntriesTab({ projectId, entries }) {
  const qc = useQueryClient();
  const { currency: bizCurrency } = useCurrency();

  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const reload = () => qc.invalidateQueries({ queryKey: ['project-pl', projectId] });

  const entryFmt = (amount, currency) => {
    const c = currency ?? bizCurrency;
    const sym = CURRENCY_SYMBOLS[c] ?? c + ' ';
    return `${sym}${(parseFloat(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        entryDate: form.entryDate,
        calls: parseInt(form.calls, 10) || 0,
        sale: parseInt(form.sale, 10) || 0,
        timeMinutes: parseInt(form.timeMinutes, 10) || 0,
        pauseMinutes: parseInt(form.pauseMinutes, 10) || 0,
        talkMinutes: parseInt(form.talkMinutes, 10) || 0,
        dispoMinutes: parseInt(form.dispoMinutes, 10) || 0,
        deadMinutes: parseInt(form.deadMinutes, 10) || 0,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        currency: form.currency || undefined,
        notes: form.notes || undefined,
      };
      return editTarget
        ? apiClient.patch(`/admin/projects/${projectId}/call-center-entries/${editTarget.id}`, payload)
        : apiClient.post(`/admin/projects/${projectId}/call-center-entries`, payload);
    },
    onSuccess: () => { setModal(false); reload(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save entry'),
  });

  const deleteMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/call-center-entries/${id}`),
    onSuccess: reload,
    onError: () => Alert.alert('Error', 'Failed to delete entry'),
  });

  const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setModal(true); };
  const openEdit = e => {
    setEditTarget(e);
    setForm({
      entryDate: e.entryDate?.slice(0, 10) ?? todayStr(),
      calls: String(e.calls ?? 0), sale: String(e.sale ?? 0),
      timeMinutes: String(e.timeMinutes ?? 0), pauseMinutes: String(e.pauseMinutes ?? 0),
      talkMinutes: String(e.talkMinutes ?? 0), dispoMinutes: String(e.dispoMinutes ?? 0), deadMinutes: String(e.deadMinutes ?? 0),
      amount: e.amount ? String(parseFloat(e.amount)) : '', currency: e.currency ?? '', notes: e.notes ?? '',
    });
    setModal(true);
  };
  const handleSave = () => {
    if (!form.entryDate) { Alert.alert('Error', 'Date is required'); return; }
    saveMut.mutate();
  };
  const handleDelete = e => Alert.alert('Delete Entry', 'Delete this call center entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(e.id) },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <HeaderAddButton onPress={openAdd} label="Add Call Center Entry" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? <Text style={styles.empty}>No call center entries yet.</Text> : entries.map(e => (
          <View key={e.id} style={styles.entryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>{e.entryDate?.slice(0, 10)}</Text>
              <Text style={styles.entrySub}>By {e.employee?.fullName ?? 'N/A'} · {e.calls ?? 0} calls · {e.sale ?? 0} sale</Text>
              <Text style={styles.entrySub}>Talk {minutesToHms(e.talkMinutes)} · Pause {minutesToHms(e.pauseMinutes)} · Dispo {minutesToHms(e.dispoMinutes)} · Dead {minutesToHms(e.deadMinutes)}</Text>
            </View>
            <Text style={styles.entryAmount}>{e.amount ? entryFmt(e.amount, e.currency) : '—'}</Text>
            <View style={styles.entryActions}>
              <TouchableOpacity onPress={() => openEdit(e)}><Text style={styles.entryEdit}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(e)}><Text style={styles.entryDel}>Del</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editTarget ? 'Edit Entry' : 'Add Call Center Entry'}</Text>

            <DatePicker label="Date *" value={form.entryDate} onDateChange={v => setForm(f => ({ ...f, entryDate: v }))} placeholder="Select date" />

            <View style={styles.row2}>
              <View style={styles.col}><Text style={styles.label}>Calls</Text><TextInput style={styles.input} value={form.calls} onChangeText={v => setForm(f => ({ ...f, calls: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
              <View style={styles.col}><Text style={styles.label}>Sale (count)</Text><TextInput style={styles.input} value={form.sale} onChangeText={v => setForm(f => ({ ...f, sale: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col}><Text style={styles.label}>Talk (minutes)</Text><TextInput style={styles.input} value={form.talkMinutes} onChangeText={v => setForm(f => ({ ...f, talkMinutes: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
              <View style={styles.col}><Text style={styles.label}>Pause (minutes)</Text><TextInput style={styles.input} value={form.pauseMinutes} onChangeText={v => setForm(f => ({ ...f, pauseMinutes: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col}><Text style={styles.label}>Dispo (minutes)</Text><TextInput style={styles.input} value={form.dispoMinutes} onChangeText={v => setForm(f => ({ ...f, dispoMinutes: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
              <View style={styles.col}><Text style={styles.label}>Dead (minutes)</Text><TextInput style={styles.input} value={form.deadMinutes} onChangeText={v => setForm(f => ({ ...f, deadMinutes: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" /></View>
            </View>
            <Text style={styles.label}>Total Time (minutes)</Text>
            <TextInput style={styles.input} value={form.timeMinutes} onChangeText={v => setForm(f => ({ ...f, timeMinutes: v }))} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />

            <View style={styles.row2}>
              <View style={styles.col}><Text style={styles.label}>Amount (optional)</Text><TextInput style={styles.input} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" /></View>
              <View style={styles.col}>
                <Text style={styles.label}>Currency</Text>
                <InlinePicker options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency} onSelect={v => setForm(f => ({ ...f, currency: v }))} placeholder={`${bizCurrency} (default)`} />
              </View>
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional" placeholderTextColor="#999" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveMut.isPending}>
                {saveMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editTarget ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  addBtn: { margin: 16, marginBottom: 0, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 30 },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  entryTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  entrySub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  entryAmount: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  entryActions: { gap: 4 },
  entryEdit: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  entryDel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  row2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
});
