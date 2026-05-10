import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Alert, Switch, ScrollView, RefreshControl,
} from 'react-native';
import { useSAPackagePlans, useCreateSAPackagePlan, useUpdateSAPackagePlan, useDeleteSAPackagePlan } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const emptyForm = {
  name: '', description: '', price: '', period: 'monthly',
  maxBranches: '1', maxStaff: '0', maxProducts: '0', maxCustomers: '0',
  isPopular: false, isActive: true, ctaLabel: 'Get Started', featuresText: '',
};

const SAPackagePlansScreen = () => {
  const { data: plans = [], isLoading, refetch } = useSAPackagePlans();
  const { mutateAsync: create } = useCreateSAPackagePlan();
  const { mutateAsync: update } = useUpdateSAPackagePlan();
  const { mutate: remove } = useDeleteSAPackagePlan();

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const planList = Array.isArray(plans) ? plans : (plans?.data ?? []);

  const openAdd = () => { setForm(emptyForm); setModalMode('add'); };
  const openEdit = plan => {
    setEditTarget(plan);
    setForm({
      name: plan.name ?? '', description: plan.description ?? '',
      price: String(plan.price ?? ''), period: plan.period ?? 'monthly',
      maxBranches: String(plan.maxBranches ?? 1), maxStaff: String(plan.maxStaff ?? 0),
      maxProducts: String(plan.maxProducts ?? 0), maxCustomers: String(plan.maxCustomers ?? 0),
      isPopular: plan.isPopular ?? false, isActive: plan.isActive ?? true,
      ctaLabel: plan.ctaLabel ?? 'Get Started', featuresText: plan.featuresText ?? '',
    });
    setModalMode('edit');
  };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Plan name is required'); return; }
    const payload = {
      name: form.name.trim(), description: form.description.trim(),
      price: parseFloat(form.price) || 0, period: form.period,
      maxBranches: parseInt(form.maxBranches) || 1,
      maxStaff: parseInt(form.maxStaff) || 0,
      maxProducts: parseInt(form.maxProducts) || 0,
      maxCustomers: parseInt(form.maxCustomers) || 0,
      isPopular: form.isPopular, isActive: form.isActive,
      ctaLabel: form.ctaLabel, featuresText: form.featuresText,
    };
    setSaving(true);
    try {
      if (modalMode === 'add') await create(payload);
      else await update({ id: editTarget.id, ...payload });
      closeModal();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = plan => Alert.alert('Delete Plan', `Delete "${plan.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(plan.id) },
  ]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.planName}>{item.name}</Text>
          <Text style={styles.planPrice}>${item.price ?? 0} / {item.period ?? 'monthly'}</Text>
        </View>
        <View style={styles.cardBadges}>
          {item.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
          <View style={[styles.activeBadge, { backgroundColor: item.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
            <Text style={[styles.activeText, { color: item.isActive ? '#065F46' : '#6B7280' }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      {item.description ? <Text style={styles.planDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.limits}>
        {[
          ['Branches', item.maxBranches],
          ['Staff', item.maxStaff],
          ['Products', item.maxProducts],
          ['Customers', item.maxCustomers],
        ].map(([label, val]) => (
          <View key={label} style={styles.limitItem}>
            <Text style={styles.limitVal}>{val ?? 0}</Text>
            <Text style={styles.limitLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.delBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Package Plans</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Plan</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={planList}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No package plans yet.</Text>}
        />
      )}

      <Modal visible={!!modalMode} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add Package Plan' : 'Edit Package Plan'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'name', label: 'Plan Name *', placeholder: 'e.g. Starter' },
                { key: 'description', label: 'Description', placeholder: 'Optional' },
                { key: 'price', label: 'Price', placeholder: '0.00', keyboardType: 'numeric' },
                { key: 'maxBranches', label: 'Max Branches', placeholder: '1', keyboardType: 'numeric' },
                { key: 'maxStaff', label: 'Max Staff (0 = unlimited)', placeholder: '0', keyboardType: 'numeric' },
                { key: 'maxProducts', label: 'Max Products (0 = unlimited)', placeholder: '0', keyboardType: 'numeric' },
                { key: 'maxCustomers', label: 'Max Customers (0 = unlimited)', placeholder: '0', keyboardType: 'numeric' },
                { key: 'ctaLabel', label: 'CTA Label', placeholder: 'Get Started' },
                { key: 'featuresText', label: 'Features (one per line)', placeholder: 'Feature 1\nFeature 2', multiline: true },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, f.multiline && { height: 80, textAlignVertical: 'top' }]}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#999"
                    keyboardType={f.keyboardType}
                    multiline={f.multiline}
                  />
                </View>
              ))}
              <View style={styles.switchRow}>
                <Text style={styles.label}>Period</Text>
                <View style={styles.periodToggle}>
                  {['monthly', 'yearly'].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodBtn, form.period === p && styles.periodBtnActive]}
                      onPress={() => setForm(f => ({ ...f, period: p }))}
                    >
                      <Text style={[styles.periodBtnText, form.period === p && { color: '#fff' }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Mark as Popular</Text>
                <Switch value={form.isPopular} onValueChange={v => setForm(f => ({ ...f, isPopular: v }))} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch value={form.isActive} onValueChange={v => setForm(f => ({ ...f, isActive: v }))} trackColor={{ true: colors.primary }} />
              </View>
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  planName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  planPrice: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 2 },
  cardBadges: { gap: 4, alignItems: 'flex-end' },
  popularBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  popularText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#92400E' },
  activeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  activeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  planDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 10 },
  limits: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  limitItem: { alignItems: 'center' },
  limitVal: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  limitLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: colors.secondary },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  delBtn: { flex: 1, borderWidth: 1, borderColor: '#F87171', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  delBtnText: { color: '#EF4444', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  periodToggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, overflow: 'hidden' },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  periodBtnActive: { backgroundColor: colors.primary },
  periodBtnText: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: colors.primary },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default SAPackagePlansScreen;
