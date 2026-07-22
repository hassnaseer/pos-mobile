import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, Image, ScrollView, Switch,
} from 'react-native';
import {
  useStaffInfinite, useCreateStaff, useUpdateStaff, useDeleteStaff,
  useCustomRoles, useDepartments, useCreateDepartment, useStaffList,
  useHRMSStaffProfile, useUpdateHRMSStaffProfile, flattenPages,
} from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import QuickCreateModal from '../../../../components/QuickCreateModal/QuickCreateModal';
import DatePicker from '../../../../components/Ui/DatePicker';
import PhoneInput from '../../../../components/PhoneInput/PhoneInput';
import colors from '../../../../theme/colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_FORM = {
  fullName: '', email: '', password: '',
  phoneNumber: '', baseSalary: '',
  customRoleId: '', departmentId: '',
  workStartTime: '09:00', workEndTime: '18:00',
  workingDays: [],
  permissionCodes: [], isActive: true,
};

const EMPTY_HRMS_FORM = {
  designation: '', employeeId: '', dateOfBirth: '', joiningDate: '',
  emergencyContact: '',
  shiftStartTime: '', shiftEndTime: '', reportsToId: '', employeeType: '', gender: '',
  usesCompanyTransport: false, transportPickupNote: '',
  workingDaysPerWeek: '6',
};

const WORKING_DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: String(n), name: `${n} day${n === 1 ? '' : 's'}/week` }));

const EMPLOYEE_TYPES = [
  { id: 'full_time', name: 'Full Time' },
  { id: 'part_time', name: 'Part Time' },
  { id: 'intern', name: 'Intern' },
  { id: 'probation', name: 'Probation' },
  { id: 'training_nesting', name: 'Training & Nesting' },
];

const GENDERS = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
  { id: 'other', name: 'Other' },
];

const StaffScreen = () => {
  const { user } = useAuth();
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_STAFF);
  const isMedicalBusiness = perms.can(PERMISSIONS.ACCESS_MEDICAL);
  const ownerHasDeliveries = perms.can(PERMISSIONS.HANDLE_DELIVERIES);
  const canManageTransport = !user?.permissionCodes?.length || user.permissionCodes.includes(PERMISSIONS.MANAGE_TRANSPORT);

  const [modal, setModal]   = useState(null); // null | 'add' | 'edit'
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [deptQuickCreateOpen, setDeptQuickCreateOpen] = useState(false);

  const [hrmsStaff, setHrmsStaff] = useState(null); // the row currently open in the HRMS Profile modal
  const [hrmsForm, setHrmsForm]   = useState(EMPTY_HRMS_FORM);

  const {
    data: staffData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useStaffInfinite();
  const { data: rawRoles = [] }                      = useCustomRoles();
  const { data: rawDepts = [] }                      = useDepartments();
  const { data: rawStaffList = [] }                  = useStaffList();
  const { mutateAsync: create, isPending: creating } = useCreateStaff();
  const { mutateAsync: update, isPending: updating } = useUpdateStaff();
  const { mutate: remove }                           = useDeleteStaff();
  const { mutateAsync: createDepartment }            = useCreateDepartment();
  const { data: hrmsProfile, isLoading: hrmsLoading } = useHRMSStaffProfile(hrmsStaff?.id);
  const { mutateAsync: saveHrmsProfile, isPending: savingHrms } = useUpdateHRMSStaffProfile();

  const members     = flattenPages(staffData);
  const roles       = Array.isArray(rawRoles) ? rawRoles : (rawRoles?.data ?? []);
  const departments = Array.isArray(rawDepts) ? rawDepts : (rawDepts?.data ?? []);
  const staffList   = Array.isArray(rawStaffList) ? rawStaffList : (rawStaffList?.data ?? []);
  const reportsToOptions = staffList
    .filter(s => s.id !== hrmsStaff?.id)
    .map(s => ({ id: s.id, name: s.fullName ?? s.name }));

  const set = key => val => setForm(p => ({ ...p, [key]: val }));
  const setHrms = key => val => setHrmsForm(p => ({ ...p, [key]: val }));

  const toggleDay = day => setForm(p => ({
    ...p,
    workingDays: p.workingDays.includes(day)
      ? p.workingDays.filter(d => d !== day)
      : [...p.workingDays, day],
  }));

  // Populate the HRMS Profile form once the full profile loads for the selected row
  useEffect(() => {
    if (!hrmsProfile) return;
    setHrmsForm({
      designation:       hrmsProfile.designation ?? '',
      employeeId:        hrmsProfile.employeeId ?? '',
      dateOfBirth:       hrmsProfile.dateOfBirth ? String(hrmsProfile.dateOfBirth).slice(0, 10) : '',
      joiningDate:       hrmsProfile.joiningDate ? String(hrmsProfile.joiningDate).slice(0, 10) : '',
      emergencyContact:  hrmsProfile.emergencyContact ?? '',
      shiftStartTime:    hrmsProfile.shiftStartTime ?? '',
      shiftEndTime:      hrmsProfile.shiftEndTime ?? '',
      reportsToId:       hrmsProfile.reportsTo?.id ?? '',
      employeeType:      hrmsProfile.employeeType ?? '',
      gender:            hrmsProfile.gender ?? '',
      usesCompanyTransport: hrmsProfile.usesCompanyTransport ?? false,
      transportPickupNote:  hrmsProfile.transportPickupNote ?? '',
      workingDaysPerWeek: hrmsProfile.workingDaysPerWeek != null ? String(hrmsProfile.workingDaysPerWeek) : '6',
    });
  }, [hrmsProfile]);

  const openHrms = s => { setHrmsForm(EMPTY_HRMS_FORM); setHrmsStaff(s); };
  const closeHrms = () => setHrmsStaff(null);

  const handleHrmsSave = async () => {
    try {
      await saveHrmsProfile({
        id: hrmsStaff.id,
        designation:       hrmsForm.designation || undefined,
        employeeId:        hrmsForm.employeeId || undefined,
        dateOfBirth:       hrmsForm.dateOfBirth || undefined,
        joiningDate:       hrmsForm.joiningDate || undefined,
        emergencyContact:  hrmsForm.emergencyContact || undefined,
        shiftStartTime:    hrmsForm.shiftStartTime || null,
        shiftEndTime:      hrmsForm.shiftEndTime || null,
        reportsToId:       hrmsForm.reportsToId || null,
        employeeType:      hrmsForm.employeeType || null,
        gender:            hrmsForm.gender || null,
        workingDaysPerWeek: hrmsForm.workingDaysPerWeek ? parseInt(hrmsForm.workingDaysPerWeek, 10) : undefined,
        ...(canManageTransport ? {
          usesCompanyTransport: hrmsForm.usesCompanyTransport,
          transportPickupNote:  hrmsForm.transportPickupNote || null,
        } : {}),
      });
      closeHrms();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to save HRMS profile');
    }
  };

  const handleAddDepartment = async name => {
    const created = await createDepartment({ name });
    const dept = created?.data ?? created;
    setForm(p => ({ ...p, departmentId: dept?.id ?? '' }));
    return dept;
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = s => {
    setForm({
      fullName:     s.fullName ?? s.name ?? '',
      email:        s.email ?? '',
      password:     '',
      phoneNumber:  s.phoneNumber ?? s.phone ?? '',
      baseSalary:   s.baseSalary != null ? String(s.baseSalary) : '',
      customRoleId: s.customRoleId ?? '',
      departmentId: s.departmentId ?? s.department?.id ?? '',
      workStartTime:s.workStartTime ?? '09:00',
      workEndTime:  s.workEndTime ?? '18:00',
      workingDays:  Array.isArray(s.workingDays) ? s.workingDays : [],
      permissionCodes: Array.isArray(s.permissionCodes) ? s.permissionCodes : [],
      isActive:     s.isActive ?? true,
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
      phoneNumber:  form.phoneNumber || undefined,
      baseSalary:   form.baseSalary ? parseFloat(form.baseSalary) : undefined,
      customRoleId: form.customRoleId || undefined,
      departmentId: form.departmentId || undefined,
      workStartTime:form.workStartTime || undefined,
      workEndTime:  form.workEndTime || undefined,
      workingDays:  form.workingDays,
      permissionCodes: form.permissionCodes,
      isActive:     form.isActive,
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

  const handleDelete = s => Alert.alert('Remove Employee', `Remove "${s.fullName ?? s.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => remove(s.id) },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Employee Management</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Employee</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={s => String(s.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No employees yet.</Text>}
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
                  <TouchableOpacity style={styles.hrmsBtn} onPress={() => openHrms(item)}>
                    <Text style={styles.hrmsText}>HRMS</Text>
                  </TouchableOpacity>
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
              {modal === 'add' ? 'Add New Employee' : 'Edit Employee'}
            </Text>

            {/* Required fields */}
            <Text style={styles.section}>Basic Info</Text>
            {[
              { key: 'fullName',    label: 'Full Name *', placeholder: 'Jane Smith' },
              { key: 'email',      label: 'Email *',     placeholder: 'jane@example.com', keyboard: 'email-address' },
              { key: 'phoneNumber',label: 'Phone',        placeholder: '+1 234 567 890',  keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                {f.key === 'phoneNumber' ? (
                  <PhoneInput label={f.label} value={form[f.key]} onChange={set(f.key)} placeholder="Phone number" />
                ) : (
                  <>
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
                  </>
                )}
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
              onAddNew={() => setDeptQuickCreateOpen(true)}
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

            {/* Work Hours — medical businesses only, matches web's isMedical gate */}
            {isMedicalBusiness && (
              <>
                <Text style={styles.section}>Medical Working Schedule</Text>
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
              </>
            )}

            {/* Rider Access — only shown when the business has the delivery/rider module enabled */}
            {ownerHasDeliveries && (
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Rider Access</Text>
                  <Text style={styles.statusHint}>Can view and manage their assigned deliveries</Text>
                </View>
                <Switch
                  value={form.permissionCodes.includes('rider_access')}
                  onValueChange={v => set('permissionCodes')(
                    v ? [...form.permissionCodes, 'rider_access'] : form.permissionCodes.filter(c => c !== 'rider_access'),
                  )}
                  trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }}
                  thumbColor={form.permissionCodes.includes('rider_access') ? colors.primary : '#9ca3af'}
                />
              </View>
            )}

            {/* Account status — edit only */}
            {modal === 'edit' && (
              <View style={styles.statusToggle}>
                <View>
                  <Text style={styles.label}>Account Status</Text>
                  <Text style={styles.statusHint}>
                    {form.isActive ? 'Employee can log in' : 'Employee is blocked'}
                  </Text>
                </View>
                <View style={styles.statusRight}>
                  <Text style={[styles.statusLabel, { color: form.isActive ? '#16a34a' : '#9ca3af' }]}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  <Switch
                    value={form.isActive}
                    onValueChange={set('isActive')}
                    trackColor={{ false: '#D0D5DD', true: '#bbf7d0' }}
                    thumbColor={form.isActive ? '#16a34a' : '#9ca3af'}
                  />
                </View>
              </View>
            )}

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

      <QuickCreateModal
        visible={deptQuickCreateOpen}
        title="Add New Department"
        fields={[{ key: 'name', label: 'Department Name *', placeholder: 'e.g. Sales' }]}
        onClose={() => setDeptQuickCreateOpen(false)}
        onCreate={values => handleAddDepartment(values.name)}
      />

      <Modal visible={!!hrmsStaff} animationType="slide" transparent onRequestClose={closeHrms}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>HRMS Profile</Text>
            <Text style={styles.statusHint}>{hrmsStaff?.fullName ?? hrmsStaff?.name}</Text>

            {hrmsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <>
                <Text style={styles.section}>Employment</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Designation</Text>
                  <TextInput style={styles.input} value={hrmsForm.designation} onChangeText={setHrms('designation')} placeholder="e.g. Senior Developer" placeholderTextColor="#999" />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Employee ID</Text>
                  <TextInput style={styles.input} value={hrmsForm.employeeId} onChangeText={setHrms('employeeId')} placeholder="e.g. EMP-1042" placeholderTextColor="#999" />
                </View>
                <View style={styles.timeRow}>
                  <DatePicker
                    label="Date of Birth"
                    value={hrmsForm.dateOfBirth}
                    onDateChange={setHrms('dateOfBirth')}
                    placeholder="Select date of birth"
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <DatePicker
                    label="Joining Date"
                    value={hrmsForm.joiningDate}
                    onDateChange={setHrms('joiningDate')}
                    placeholder="Select joining date"
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                </View>
                <InlinePicker
                  label="Reports To"
                  value={hrmsForm.reportsToId}
                  options={reportsToOptions}
                  onSelect={setHrms('reportsToId')}
                />
                <InlinePicker
                  label="Employee Type"
                  value={hrmsForm.employeeType}
                  options={EMPLOYEE_TYPES}
                  onSelect={setHrms('employeeType')}
                />
                <InlinePicker
                  label="Gender"
                  value={hrmsForm.gender}
                  options={GENDERS}
                  onSelect={setHrms('gender')}
                />

                {canManageTransport && (
                  <>
                    <Text style={styles.section}>Company Transport</Text>
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Uses Company Transport</Text>
                        <Text style={styles.statusHint}>Enrolled in the pick-and-drop service; half the cost is deducted each payroll run</Text>
                      </View>
                      <Switch
                        value={hrmsForm.usesCompanyTransport}
                        onValueChange={setHrms('usesCompanyTransport')}
                        trackColor={{ false: '#D0D5DD', true: colors.primary + '80' }}
                        thumbColor={hrmsForm.usesCompanyTransport ? colors.primary : '#9ca3af'}
                      />
                    </View>
                    {hrmsForm.usesCompanyTransport && (
                      <View style={styles.field}>
                        <Text style={styles.label}>Pickup Point / Route Note</Text>
                        <TextInput
                          style={styles.input}
                          value={hrmsForm.transportPickupNote}
                          onChangeText={setHrms('transportPickupNote')}
                          placeholder="e.g. Gulshan pickup point, 8:30am"
                          placeholderTextColor="#999"
                        />
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.section}>Shift Timing</Text>
                <View style={styles.timeRow}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Shift Start</Text>
                    <TextInput style={styles.input} value={hrmsForm.shiftStartTime} onChangeText={setHrms('shiftStartTime')} placeholder="09:00" placeholderTextColor="#999" />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Shift End</Text>
                    <TextInput style={styles.input} value={hrmsForm.shiftEndTime} onChangeText={setHrms('shiftEndTime')} placeholder="18:00" placeholderTextColor="#999" />
                  </View>
                </View>
                <Text style={styles.statusHint}>Used for Late / Half-Day attendance calculation. Falls back to the business's default opening time if left blank.</Text>

                <InlinePicker
                  label="Working Days Per Week"
                  value={hrmsForm.workingDaysPerWeek}
                  options={WORKING_DAYS_OPTIONS}
                  onSelect={setHrms('workingDaysPerWeek')}
                  allowNone={false}
                />
                <Text style={styles.statusHint}>Used with shift start/end time to compute this employee's daily pay rate</Text>

                <Text style={styles.section}>Emergency Contact</Text>
                <View style={styles.field}>
                  <TextInput style={styles.input} value={hrmsForm.emergencyContact} onChangeText={setHrms('emergencyContact')} placeholder="Name, relation, phone number" placeholderTextColor="#999" multiline />
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeHrms}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleHrmsSave} disabled={savingHrms || hrmsLoading}>
                {savingHrms ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save Profile</Text>}
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
  hrmsBtn: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  hrmsText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
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
  statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statusHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default StaffScreen;
