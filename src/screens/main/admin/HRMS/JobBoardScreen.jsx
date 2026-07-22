import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { useJobListings, useCreateJobListing, useDeleteJobListing, useDepartments, useCreateDepartment } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import QuickCreateModal from '../../../../components/QuickCreateModal/QuickCreateModal';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const EMPTY_FORM = { title: '', department: '', description: '', deadline: '' };
const STATUS_COLOR = { open: '#10B981', closed: '#EF4444', draft: '#9CA3AF' };

const JobBoardScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_INTERNAL_JOBS);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deptQuickCreateOpen, setDeptQuickCreateOpen] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: raw = [], isLoading, refetch } = useJobListings();
  const { data: rawDepts = [] } = useDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateJobListing();
  const { mutate: remove } = useDeleteJobListing();
  const { mutateAsync: createDepartment } = useCreateDepartment();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const departments = Array.isArray(rawDepts) ? rawDepts : (rawDepts?.data ?? []);
  // Job listings store department as a plain name string, not a relation — the picker
  // selects/creates a real Department entity but only submits its name.
  const deptOptions = departments.map(d => ({ id: d.name, name: d.name }));

  const openAdd = () => { setForm(EMPTY_FORM); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Job title is required'); return; }
    try {
      await create(form);
      setShowModal(false);
    } catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Save failed'); }
  };

  const handleDelete = j => Alert.alert('Delete Job', `Delete "${j.title}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(j.id) },
  ]);

  const handleAddDepartment = async name => {
    const created = await createDepartment({ name });
    const dept = created?.data ?? created;
    setForm(p => ({ ...p, department: dept?.name ?? name }));
    return dept;
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Job Board</Text>
        {canManage && (
          <HeaderAddButton onPress={openAdd} label="Post" />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.title}</Text>
              {item.department ? <Text style={styles.rowSub}>{item.department}</Text> : null}
              {item.deadline ? <Text style={styles.rowSub}>Deadline: {item.deadline}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>{item.status ?? 'open'}</Text>
              </View>
              {canManage && (
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.delText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No job postings yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Post Internal Job</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={set('title')} placeholder="Job Title" placeholderTextColor="#999" />
            </View>

            <InlinePicker
              label="Department"
              value={form.department}
              options={deptOptions}
              keyField="id"
              labelField="name"
              onSelect={set('department')}
              onAddNew={() => setDeptQuickCreateOpen(true)}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Description" placeholderTextColor="#999" multiline />
            </View>

            <DatePicker
              label="Application Deadline"
              value={form.deadline}
              onDateChange={set('deadline')}
              placeholder="Select deadline"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <QuickCreateModal
        visible={deptQuickCreateOpen}
        title="Add New Department"
        fields={[{ key: 'name', label: 'Department Name *', placeholder: 'e.g. Sales' }]}
        onClose={() => setDeptQuickCreateOpen(false)}
        onCreate={values => handleAddDepartment(values.name)}
      />
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
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  delBtn:       { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delText:      { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
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

export default JobBoardScreen;
