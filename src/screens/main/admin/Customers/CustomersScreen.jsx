import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useCustomers, useCreateCustomer, useDeleteCustomer } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const CustomersScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_CUSTOMERS);
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const { data: raw = [], isLoading, refetch } = useCustomers();
  const { mutateAsync: create, isPending } = useCreateCustomer();
  const { mutate: remove } = useDeleteCustomer();

  const customers = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const filtered = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try { await create(form); setShowModal(false); setForm({ name: '', email: '', phone: '' }); }
    catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  const handleDelete = c => Alert.alert('Delete', `Delete "${c.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(c.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput style={styles.search} placeholder="Search customers…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        {canManage && <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name ?? 'C')[0].toUpperCase()}</Text></View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>{item.email ?? ''} {item.phone ? `· ${item.phone}` : ''}</Text>
              <Text style={styles.rowStats}>Orders: {item.totalOrders ?? 0} · Spent: {fmt(item.totalSpent)}</Text>
            </View>
            {canManage && (
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No customers found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Customer</Text>
            {[{ key: 'name', label: 'Name', placeholder: 'Full name' }, { key: 'email', label: 'Email', placeholder: 'email@example.com', keyboard: 'email-address' }, { key: 'phone', label: 'Phone', placeholder: '+1234567890', keyboard: 'phone-pad' }].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#999" value={form[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} keyboardType={f.keyboard ?? 'default'} autoCapitalize="none" />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isPending}>
                {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  topBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowStats: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 4 },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default CustomersScreen;
