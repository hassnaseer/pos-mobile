import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, Image, ScrollView, Switch,
} from 'react-native';
import {
  useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  useCustomRoles, useDepartments,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_FORM = {
  fullName: '', email: '', password: '',
  phone: '', baseSalary: '',
  customRoleId: '', departmentId: '',
  workStartTime: '', workEndTime: '',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  isMedical: false,
};

const InlinePicker = ({ label, value, options, onSelect, keyField = 'id', labelField = 'name' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o[keyField] === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>
          {selected ? selected[labelField] : 'Select…'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={styles.pickerOptionText}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt[keyField]} style={styles.pickerOption} onPress={() => { onSelect(opt[keyField]); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt[keyField] && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>
                    {opt[labelField]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const StaffScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_STAFF);

  const [modal, setModal]   = useState(null); // null | 'add' | 'edit'
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const { data: rawStaff = [], isLoading, refetch } = useStaff();
  const { data: rawRoles = [] }                      = useCustomRoles();
  const { data: rawDepts = [] }                      = useDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateStaff();
  const { mutateAsync: update, isPending: updating } = useUpdateStaff();
  const { mutate: remove }                           = useDeleteStaff();

  const members     = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const roles       = Array.isArray(rawRoles) ? rawRoles : (rawRoles?.data ?? []);
  const departments = Array.isArray(rawDepts) ? rawDepts : (rawDepts?.data ?? []);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const toggleDay = day => setForm(p => ({
    ...p,
    workingDays: p.workingDays.includes(day)
      ? p.workingDays.filter(d => d !== day)
      : [...p.workingDays, day],
  }));

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = s => {
    setForm({
      fullName:     s.fullName ?? s.name ?? '',
      email:        s.email ?? '',
      password:     '',
      phone:        s.phone ?? '',
      baseSalary:   s.baseSalary != null ? String(s.baseSalary) : '',
      customRoleId: s.customRoleId ?? '',
      departmentId: s.departmentId ?? s.department?.id ?? '',
      workStartTime:s.workStartTime ?? '',
      workEndTime:  s.workEndTime ?? '',
      workingDays:  Array.isArray(s.workingDays) ? s.workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      isMedical:    s.isMedical ?? false,
    });
    setEditId(s.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      Alert.alert('Error', 'Full name and email are required');
      return;
    }
    if (modal === 'add' && !form.password.trim()) {
      Alert.alert('Error', 'Password is required for new staff');
      return;
    }
    const payload = {
      fullName:     form.fullName.trim(),
      email:        form.email.trim(),
      phone:        form.phone || undefined,
      baseSalary:   form.baseSalary ? parseFloat(form.baseSalary) : undefined,
      customRoleId: form.customRoleId || undefined,
      departmentId: form.departmentId || undefined,
      workStartTime:form.workStartTime || undefined,
      workEndTime:  form.workEndTime || undefined,
      workingDays:  form.workingDays.length ? form.workingDays : undefined,
      isMedical:    form.isMedical,
      ...(modal === 'add' && { password: form.password }),
    };
    try {
      if (modal === 'add') await create(payload);
      else await update({ id: editId, ...payload });
      setModal(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to save staff');
    }
  };

  const handleDelete = s => Alert.alert('Remove Staff', `Remove "${s.fullName ?? s.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => remove(s.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Staff</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Staff</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={s => String(s.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No staff members yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              {item.profileImg
                ? <Image source={{ uri: item.profileImg }} style={styles.avatarImg} />
                : <Text style={styles.avatarText}>{(item.fullName ?? item.name ?? 'S')[0].toUpperCase()}</Text>}
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.fullName ?? item.name}</Text>
              <Text style={styles.rowEmail}>{item.email}</Text>
              {item.phone ? <Text style={styles.rowPhone}>{item.phone}</Text> : null}
              <View style={styles.rowMeta}>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive !== false ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.statusText, { color: item.isActive !== false ? '#16a34a' : '#dc2626' }]}>
                    {item.isActive !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {item.department?.name && (
                  <View style={styles.deptBadge}>
                    <Text style={styles.deptText}>{item.department.name}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.roleBadge}>{item.customRoleName ?? item.role ?? 'staff'}</Text>
              {item.baseSalary != null && (
                <Text style={styles.salaryText}>${item.baseSalary}</Text>
              )}
              {canManage && (
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delText}>Del</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={!!modal} animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {modal === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
            </Text>

            {/* Required fields */}
            <Text style={styles.section}>Basic Info</Text>
            {[
              { key: 'fullName', label: 'Full Name *', placeholder: 'Jane Smith' },
              { key: 'email',    label: 'Email *',     placeholder: 'jane@example.com', keyboard: 'email-address' },
              { key: 'phone',    label: 'Phone',        placeholder: '+1 234 567 890',  keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={set(f.key)}
                  placeholder={f.placeholder}
                  placeholderTextColor="#999"
                  keyboardType={f.keyboard ?? 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}

            {modal === 'add' && (
              <View style={styles.field}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={set('password')}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
            )}

            {/* Role & Department */}
            <Text style={styles.section}>Role & Department</Text>
            <InlinePicker
              label="Custom Role"
              value={form.customRoleId}
              options={roles}
              onSelect={set('customRoleId')}
            />
            <InlinePicker
              label="Department"
              value={form.departmentId}
              options={departments}
              onSelect={set('departmentId')}
            />

            {/* Salary */}
            <Text style={styles.section}>Compensation</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Base Salary</Text>
              <TextInput
                style={styles.input}
                value={form.baseSalary}
                onChangeText={set('baseSalary')}
                placeholder="e.g. 3000"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Work Hours */}
            <Text style={styles.section}>Work Schedule</Text>
            <View style={styles.timeRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.workStartTime}
                  onChangeText={set('workStartTime')}
                  placeholder="09:00"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={form.workEndTime}
                  onChangeText={set('workEndTime')}
                  placeholder="18:00"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Working Days</Text>
              <View style={styles.chipRow}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, form.workingDays.includes(day) && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, form.workingDays.includes(day) && styles.dayChipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Medical flag */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>Medical Staff</Text>
              <Switch
                value={form.isMedical}
                onValueChange={set('isMedical')}
                trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }}
                thumbColor={form.isMedical ? colors.primary : '#9ca3af'}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                {(creating || updating)
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{modal === 'add' ? 'Add' : 'Update'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowEmail: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowPhone: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  rowMeta: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  deptBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#ede9fe' },
  deptText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  roleBadge: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, textTransform: 'capitalize' },
  salaryText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  rowActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.warning },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 4 },
  section: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chevron: { fontSize: 12, color: colors.secondary },
  timeRow: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: '#D0D5DD', backgroundColor: '#fff' },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  dayChipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 320, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default StaffScreen;
