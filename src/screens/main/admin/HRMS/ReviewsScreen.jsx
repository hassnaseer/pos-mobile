import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { useReviews, useCreateReview, useUpdateReview } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { employeeName: '', reviewPeriod: '', overallRating: '', comments: '' };
const RATING_COLOR = { '5': '#10B981', '4': '#3B82F6', '3': '#F59E0B', '2': '#F97316', '1': '#EF4444' };

const ReviewsScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_REVIEWS);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useReviews();
  const { mutateAsync: create, isPending: creating } = useCreateReview();
  const { mutateAsync: update, isPending: updating } = useUpdateReview();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const isSaving = creating || updating;

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = r => {
    setEditing(r);
    setForm({ employeeName: r.employeeName ?? '', reviewPeriod: r.reviewPeriod ?? '', overallRating: String(r.overallRating ?? ''), comments: r.comments ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim()) { Alert.alert('Error', 'Employee name is required'); return; }
    try {
      const payload = { ...form, overallRating: form.overallRating ? parseFloat(form.overallRating) : undefined };
      editing ? await update({ id: editing.id, ...payload }) : await create(payload);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', e?.message ?? 'Save failed'); }
  };

  const ratingStr = r => String(Math.round(r?.overallRating ?? 0));

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Annual Reviews</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.employeeName ?? item.employee?.name ?? '—'}</Text>
              {item.reviewPeriod ? <Text style={styles.rowSub}>{item.reviewPeriod}</Text> : null}
              {item.comments ? <Text style={styles.rowSub} numberOfLines={1}>{item.comments}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              {item.overallRating != null && (
                <View style={[styles.ratingBadge, { backgroundColor: (RATING_COLOR[ratingStr(item)] ?? '#9CA3AF') + '20' }]}>
                  <Text style={[styles.ratingText, { color: RATING_COLOR[ratingStr(item)] ?? '#9CA3AF' }]}>
                    ★ {Number(item.overallRating).toFixed(1)}
                  </Text>
                </View>
              )}
              {canManage && (
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No reviews yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Review' : 'New Review'}</Text>
            {[
              { key: 'employeeName',  label: 'Employee Name *' },
              { key: 'reviewPeriod',  label: 'Review Period (e.g. Q4 2025)' },
              { key: 'overallRating', label: 'Overall Rating (1–5)', keyboard: 'decimal-pad' },
              { key: 'comments',      label: 'Comments' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={set(f.key)} placeholder={f.label.replace(' *', '')} placeholderTextColor="#999" keyboardType={f.keyboard ?? 'default'} />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:      { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:   { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row:          { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:       { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', gap: 6 },
  ratingBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ratingText:   { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  editBtn:      { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText:     { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:   { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 16 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 4 },
  input:        { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:   { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText:     { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default ReviewsScreen;
