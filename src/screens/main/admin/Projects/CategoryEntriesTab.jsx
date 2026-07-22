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
import { getCategoryDef } from '../../../../config/projectCategories';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const STATUSES = ['Recorded', 'Paid', 'Pending'];

const todayStr = () => new Date().toISOString().slice(0, 10);

/** One shared, config-driven Sales/Entries tab for all 9 "Universal" categories (SEO, Digital
 *  Marketing, PPC, Email Marketing, Lead Generation, Virtual Assistant, Bookkeeping, IT Support,
 *  Content Writing) — renders whichever extra fields the active category defines instead of
 *  being duplicated per category. Mirrors web's CategoryEntriesTab.tsx. */
export default function CategoryEntriesTab({ projectId, categoryKey, entries }) {
  const qc = useQueryClient();
  const { currency: bizCurrency } = useCurrency();
  const def = getCategoryDef(categoryKey);
  const fields = def.fields ?? [];

  const emptyForm = () => ({
    title: '', amount: '', currency: '', entryDate: todayStr(), status: 'Recorded', notes: '',
    extra: Object.fromEntries(fields.map(f => [f.key, ''])),
  });

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
      const extraFields = {};
      for (const f of fields) {
        const v = form.extra[f.key];
        if (!v) continue;
        extraFields[f.key] = f.type === 'text' ? v : (parseFloat(v) || 0);
      }
      const payload = {
        title: form.title, amount: parseFloat(form.amount) || 0, currency: form.currency || undefined,
        entryDate: form.entryDate, status: form.status, notes: form.notes || undefined,
        extraFields: Object.keys(extraFields).length ? extraFields : undefined,
      };
      return editTarget
        ? apiClient.patch(`/admin/projects/${projectId}/category-entries/${editTarget.id}`, payload)
        : apiClient.post(`/admin/projects/${projectId}/category-entries`, payload);
    },
    onSuccess: () => { setModal(false); reload(); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save entry'),
  });

  const deleteMut = useMutation({
    mutationFn: id => apiClient.delete(`/admin/projects/${projectId}/category-entries/${id}`),
    onSuccess: reload,
    onError: () => Alert.alert('Error', 'Failed to delete entry'),
  });

  const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setModal(true); };
  const openEdit = e => {
    setEditTarget(e);
    setForm({
      title: e.title ?? '', amount: e.amount ? String(parseFloat(e.amount)) : '',
      currency: e.currency ?? '', entryDate: e.entryDate?.slice(0, 10) ?? todayStr(),
      status: e.status ?? 'Recorded', notes: e.notes ?? '',
      extra: Object.fromEntries(fields.map(f => [f.key, String(e.extraFields?.[f.key] ?? '')])),
    });
    setModal(true);
  };
  const handleSave = () => {
    if (!form.title.trim() || !form.amount) { Alert.alert('Error', 'Title and amount are required'); return; }
    saveMut.mutate();
  };
  const handleDelete = e => Alert.alert('Delete Entry', 'Delete this entry?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(e.id) },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <HeaderAddButton onPress={openAdd} label="Add {def.label} Entry" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? <Text style={styles.empty}>No {def.label.toLowerCase()} entries yet.</Text> : entries.map(e => (
          <View key={e.id} style={styles.entryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>{e.title}</Text>
              <Text style={styles.entrySub}>{e.entryDate?.slice(0, 10)} · {e.status} · By {e.employee?.fullName ?? 'N/A'}</Text>
              {fields.length > 0 && (
                <Text style={styles.entrySub} numberOfLines={1}>
                  {fields.map(f => `${f.label}: ${e.extraFields?.[f.key] ?? '—'}`).join(' · ')}
                </Text>
              )}
            </View>
            <Text style={styles.entryAmount}>{entryFmt(e.amount, e.currency)}</Text>
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
            <Text style={styles.modalTitle}>{editTarget ? 'Edit Entry' : `Add ${def.label} Entry`}</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Monthly retainer" placeholderTextColor="#999" />

            <View style={styles.row2}>
              <View style={styles.col}><DatePicker label="Date *" value={form.entryDate} onDateChange={v => setForm(f => ({ ...f, entryDate: v }))} placeholder="Select date" style={{ marginBottom: 0 }} /></View>
              <View style={styles.col}><Text style={styles.label}>Amount *</Text><TextInput style={styles.input} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" /></View>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Currency</Text>
                <InlinePicker options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency} onSelect={v => setForm(f => ({ ...f, currency: v }))} placeholder={`${bizCurrency} (default)`} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Status</Text>
                <InlinePicker options={STATUSES.map(st => ({ id: st, name: st }))} value={form.status} onSelect={v => setForm(f => ({ ...f, status: v }))} placeholder="Select status" allowNone={false} />
              </View>
            </View>

            {fields.map(f => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form.extra[f.key] ?? ''}
                  onChangeText={v => setForm(fm => ({ ...fm, extra: { ...fm.extra, [f.key]: v } }))}
                  placeholder={f.type === 'text' ? '' : '0'}
                  placeholderTextColor="#999"
                  keyboardType={f.type === 'text' ? 'default' : 'decimal-pad'}
                />
              </View>
            ))}

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
