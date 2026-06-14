import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useMedicalInsurance, useCreateMedicalInsurance,
  useUpdateMedicalInsurance, useDeleteMedicalInsurance,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY = { providerName: '', policyNumber: '', patientName: '', coverageAmount: '', expiryDate: '', notes: '' };

const InsuranceScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMedicalInsurance();
  const records = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const { mutateAsync: create, isPending: creating } = useCreateMedicalInsurance();
  const { mutateAsync: update, isPending: updating } = useUpdateMedicalInsurance();
  const { mutateAsync: remove } = useDeleteMedicalInsurance();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({
      providerName: r.providerName ?? '',
      policyNumber: r.policyNumber ?? '',
      patientName: r.patientName ?? r.patient?.name ?? '',
      coverageAmount: r.coverageAmount ? String(r.coverageAmount) : '',
      expiryDate: r.expiryDate?.slice(0, 10) ?? '',
      notes: r.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.providerName.trim()) { Alert.alert('Error', 'Provider name is required'); return; }
    try {
      const payload = { ...form, coverageAmount: form.coverageAmount ? Number(form.coverageAmount) : undefined };
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  const handleDelete = r =>
    Alert.alert('Delete', `Delete insurance record for "${r.patientName ?? r.patient?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await remove(r.id); } catch { Alert.alert('Error', 'Delete failed'); } } },
    ]);

  const isExpired = r => r.expiryDate && new Date(r.expiryDate) < new Date();

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Insurance</Text>
      </TouchableOpacity>

      <FlatList
        data={records}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No insurance records.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.provider} numberOfLines={1}>{item.providerName ?? '—'}</Text>
              <View style={[styles.badge, { backgroundColor: isExpired(item) ? '#fee2e2' : '#dcfce7' }]}>
                <Text style={[styles.badgeText, { color: isExpired(item) ? '#dc2626' : '#16a34a' }]}>{isExpired(item) ? 'Expired' : 'Active'}</Text>
              </View>
            </View>
            {item.patientName ?? item.patient?.name ? <Text style={styles.patient}>{item.patientName ?? item.patient?.name}</Text> : null}
            <View style={styles.row}>
              {item.policyNumber ? <Text style={styles.policy}>#{item.policyNumber}</Text> : null}
              {item.coverageAmount ? <Text style={styles.amount}>Coverage: PKR {item.coverageAmount}</Text> : null}
            </View>
            {item.expiryDate ? <Text style={styles.expiry}>Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text> : null}
            {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.delText}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Insurance' : 'New Insurance'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}><Text style={styles.label}>Provider Name *</Text><TextInput style={styles.input} value={form.providerName} onChangeText={set('providerName')} placeholder="Insurance provider" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Policy Number</Text><TextInput style={styles.input} value={form.policyNumber} onChangeText={set('policyNumber')} placeholder="Policy #" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Patient Name</Text><TextInput style={styles.input} value={form.patientName} onChangeText={set('patientName')} placeholder="Patient name" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Coverage Amount (PKR)</Text><TextInput style={styles.input} value={form.coverageAmount} onChangeText={set('coverageAmount')} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" /></View>
              <View style={styles.field}><Text style={styles.label}>Expiry Date</Text><TextInput style={styles.input} value={form.expiryDate} onChangeText={set('expiryDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" /></View>
              <View style={styles.field}><Text style={styles.label}>Notes</Text><TextInput style={[styles.input, { height: 70 }]} value={form.notes} onChangeText={set('notes')} placeholder="Notes" placeholderTextColor="#999" multiline /></View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  addBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  provider: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  patient: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.primary, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  policy: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888' },
  amount: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  expiry: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4, fontStyle: 'italic' },
  delBtn: { marginTop: 10, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fee2e2', borderRadius: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default InsuranceScreen;
