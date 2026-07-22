import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert, Switch, ScrollView, RefreshControl } from 'react-native';
import { useCustomRoles, useCreateCustomRole, useUpdateCustomRole, useDeleteCustomRole } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const ALL_PERMS = [
  // Sales
  { code: 'pos_sales',                     label: 'POS / Sales',              category: 'Sales' },
  { code: 'view_orders',                   label: 'View Orders',              category: 'Sales' },
  { code: 'process_refunds',               label: 'Process Refunds',          category: 'Sales' },
  { code: 'access_referral',               label: 'Referral Access',          category: 'Sales' },
  // Inventory
  { code: 'manage_products',               label: 'Manage Products',          category: 'Inventory' },
  { code: 'view_products',                 label: 'View Products',            category: 'Inventory' },
  { code: 'manage_categories',             label: 'Manage Categories',        category: 'Inventory' },
  { code: 'manage_suppliers',              label: 'Manage Suppliers',         category: 'Inventory' },
  { code: 'manage_manufacturers',          label: 'Manage Manufacturers',     category: 'Inventory' },
  { code: 'manage_conditions',             label: 'Device Conditions',        category: 'Inventory' },
  { code: 'manage_misc',                   label: 'Misc Charges',             category: 'Inventory' },
  // Tickets & Customers
  { code: 'create_tickets',                label: 'Create Tickets',           category: 'Tickets & Customers' },
  { code: 'update_tickets',                label: 'Update Tickets',           category: 'Tickets & Customers' },
  { code: 'manage_customers',              label: 'Manage Customers',         category: 'Tickets & Customers' },
  // HRMS
  { code: 'manage_staff',                  label: 'Manage Staff',             category: 'HRMS' },
  { code: 'manage_departments',            label: 'Departments',              category: 'HRMS' },
  { code: 'manage_attendance',             label: 'Attendance & Check-In',    category: 'HRMS' },
  { code: 'manage_leave',                  label: 'Leave Management',         category: 'HRMS' },
  { code: 'manage_claims',                 label: 'Claims Management',        category: 'HRMS' },
  { code: 'manage_payroll',                label: 'Payroll',                  category: 'HRMS' },
  { code: 'manage_announcements',          label: 'Announcements',            category: 'HRMS' },
  { code: 'manage_tasks',                  label: 'Tasks',                    category: 'HRMS' },
  { code: 'manage_reviews',                label: 'Annual Reviews',           category: 'HRMS' },
  { code: 'manage_internal_jobs',          label: 'Internal Job Postings',    category: 'HRMS' },
  { code: 'manage_documents',              label: 'Document Library',         category: 'HRMS' },
  { code: 'manage_trainings',              label: 'Upcoming Trainings',       category: 'HRMS' },
  { code: 'manage_transport',              label: 'Company Transport',        category: 'HRMS' },
  { code: 'manage_commissions',            label: 'Commission Structures & Entries', category: 'HRMS' },
  // Finance & Projects
  { code: 'manage_budgets',                label: 'Budgets & Earnings',       category: 'Finance & Projects' },
  { code: 'manage_projects',               label: 'Manage Projects',          category: 'Finance & Projects' },
  { code: 'manage_kanban',                 label: 'Kanban Board',             category: 'Finance & Projects' },
  { code: 'manage_project_sales',          label: 'Project Sales Entries',    category: 'Finance & Projects' },
  { code: 'manage_milestones',             label: 'Project Milestones',       category: 'Finance & Projects' },
  { code: 'manage_clients',                label: 'Manage Clients',           category: 'Finance & Projects' },
  { code: 'manage_marketplaces',           label: 'Manage Marketplaces',      category: 'Finance & Projects' },
  { code: 'manage_supplier_bills',         label: 'Supplier Bills',           category: 'Finance & Projects' },
  { code: 'manage_payment_accounts',       label: 'Payment Accounts',         category: 'Finance & Projects' },
  // Reporting & Logs
  { code: 'view_reports',                  label: 'Reports & Analytics',      category: 'Reporting' },
  { code: 'view_finance_reports',          label: 'Finance / Profit & Loss',  category: 'Reporting' },
  { code: 'view_team_overview',            label: 'Finance Team Overview',    category: 'Reporting' },
  { code: 'view_ar_aging',                 label: 'AR Aging Report',          category: 'Reporting' },
  { code: 'view_tax_summary',              label: 'Tax Summary Report',       category: 'Reporting' },
  { code: 'view_activity_logs',            label: 'Activity Logs',            category: 'Reporting' },
  // Settings & Admin
  { code: 'system_settings',               label: 'System Settings',          category: 'Settings' },
  { code: 'manage_invoices',               label: 'Invoice Print Template',   category: 'Settings' },
  { code: 'manage_taxes',                  label: 'Manage Taxes',             category: 'Settings' },
  { code: 'manage_businesses',             label: 'Manage Businesses',        category: 'Settings' },
  // Integrations
  { code: 'ecommerce_shopify',             label: 'Shopify Integration',            category: 'Integrations' },
  { code: 'ecommerce_bigcommerce',         label: 'BigCommerce Integration',        category: 'Integrations' },
  { code: 'ecommerce_wix',                 label: 'Wix Integration',                category: 'Integrations' },
  { code: 'ecommerce_woocommerce',         label: 'WooCommerce Integration',        category: 'Integrations' },
  { code: 'ecommerce_squarespace',         label: 'Squarespace Integration',        category: 'Integrations' },
  { code: 'ecommerce_magento',             label: 'Magento Integration',            category: 'Integrations' },
  { code: 'ecommerce_opencart',            label: 'OpenCart Integration',           category: 'Integrations' },
  { code: 'ecommerce_prestashop',          label: 'PrestaShop Integration',         category: 'Integrations' },
  { code: 'ecommerce_amazon',              label: 'Amazon Integration',             category: 'Integrations' },
  { code: 'ecommerce_ebay',                label: 'eBay Integration',               category: 'Integrations' },
  { code: 'ecommerce_tiktokshop',          label: 'TikTok Shop Integration',        category: 'Integrations' },
  { code: 'ecommerce_etsy',                label: 'Etsy Integration',               category: 'Integrations' },
  { code: 'ecommerce_walmart',             label: 'Walmart Marketplace Integration', category: 'Integrations' },
  { code: 'ecommerce_metashops',           label: 'Facebook & Instagram Shops Integration', category: 'Integrations' },
  { code: 'ecommerce_googleshopping',      label: 'Google Shopping Integration',    category: 'Integrations' },
  { code: 'ecommerce_daraz',               label: 'Daraz Integration',              category: 'Integrations' },
  { code: 'ecommerce_lazada',              label: 'Lazada Integration',             category: 'Integrations' },
  { code: 'ecommerce_shopee',              label: 'Shopee Integration',             category: 'Integrations' },
  // Vendor / Marketplace
  { code: 'access_vendor_buyer',           label: 'Vendor Buyer Access',      category: 'Vendor' },
  { code: 'access_vendor_seller',          label: 'Vendor Seller Access',     category: 'Vendor' },
  // Advanced Features
  { code: 'access_advanced_analytics',     label: 'Advanced Analytics',       category: 'Advanced' },
  { code: 'access_bulk_operations',        label: 'Bulk Operations',          category: 'Advanced' },
  // Medical
  { code: 'access_medical',                label: 'Medical Module',           category: 'Medical' },
  { code: 'manage_patients',               label: 'Manage Patients',          category: 'Medical' },
  { code: 'manage_doctors',                label: 'Manage Doctors',           category: 'Medical' },
  { code: 'manage_appointments',           label: 'Manage Appointments',      category: 'Medical' },
  { code: 'manage_prescriptions',          label: 'Manage Prescriptions',     category: 'Medical' },
  { code: 'access_medical_reminders',      label: 'Medical Reminders',        category: 'Medical' },
  { code: 'access_medical_patient_tracking', label: 'Patient Tracking',       category: 'Medical' },
  { code: 'access_medical_insurance',      label: 'Insurance Management',     category: 'Medical' },
  // Delivery
  { code: 'rider_access',                  label: 'Rider Access',             category: 'Delivery' },
  { code: 'handle_deliveries',             label: 'Delivery Management',      category: 'Delivery' },
  // Modules
  { code: 'access_restaurant',             label: 'Restaurant Module',        category: 'Modules' },
  { code: 'access_facebook',               label: 'Facebook Platform',        category: 'Modules' },
  { code: 'access_instagram',              label: 'Instagram Platform',       category: 'Modules' },
  { code: 'access_whatsapp',               label: 'WhatsApp Platform',        category: 'Modules' },
  { code: 'access_factory',                label: 'Factory Module',           category: 'Modules' },
  { code: 'access_pharmacy',               label: 'Pharmacy Module',          category: 'Modules' },
  { code: 'internal_chat',                 label: 'Internal Chat',            category: 'Modules' },
  { code: 'internal_chat_groups',          label: 'Internal Chat — Group Chat', category: 'Modules' },
];

const RolesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_STAFF);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [selected, setSelected] = useState({});

  const { data: roles = [], isLoading, refetch } = useCustomRoles();
  const { mutateAsync: create, isPending: creating } = useCreateCustomRole();
  const { mutateAsync: update, isPending: updating } = useUpdateCustomRole();
  const { mutate: remove } = useDeleteCustomRole();

  // Only offer permissions the business is actually currently granted — an admin's own
  // permissionCodes already equal the business's full grant (see toPosUser on the backend).
  // Without this, the toggle list showed every permission that exists in the whole system,
  // including ones this business's plan/type doesn't have at all.
  const bizCodes = perms.permissionCodes ?? [];
  const grantablePerms = ALL_PERMS.filter(p => bizCodes.length === 0 || bizCodes.includes(p.code));

  const togglePerm = code => setSelected(p => ({ ...p, [code]: !p[code] }));

  const openCreate = () => {
    setEditing(null);
    setRoleName('');
    setSelected({});
    setShowModal(true);
  };

  const openEdit = role => {
    setEditing(role);
    setRoleName(role.name ?? '');
    const codes = role.permissionCodes ?? [];
    setSelected(Object.fromEntries(codes.map(c => [c, true])));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!roleName.trim()) { Alert.alert('Error', 'Role name is required'); return; }
    // The backend re-clamps this against the business's current permissions on save
    // anyway — filtering here just keeps the UI honest before the round-trip.
    const grantableCodes = new Set(grantablePerms.map(p => p.code));
    const codes = Object.keys(selected).filter(k => selected[k] && grantableCodes.has(k));
    try {
      if (editing) {
        await update({ id: editing.id, name: roleName.trim(), permissionCodes: codes });
      } else {
        await create({ name: roleName.trim(), permissionCodes: codes });
      }
      setShowModal(false);
      setEditing(null);
      setRoleName('');
      setSelected({});
    } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  const handleDelete = r => Alert.alert('Delete Role', `Delete "${r.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
  ]);

  const allRoles = Array.isArray(roles) ? roles : (roles?.data ?? []);
  const isSaving = creating || updating;

  const byCategory = grantablePerms.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Custom Roles</Text>
        {canManage && (
          <HeaderAddButton onPress={openCreate} label="New Role" />
        )}
      </View>

      <FlatList
        data={allRoles}
        keyExtractor={r => String(r.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const permsCount = (item.permissionCodes ?? []).length;
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{permsCount} permission{permsCount !== 1 ? 's' : ''}</Text>
                {item.permissionCodes?.length > 0 && (
                  <View style={styles.tagRow}>
                    {item.permissionCodes.slice(0, 3).map(c => {
                      const p = ALL_PERMS.find(x => x.code === c);
                      return (
                        <View key={c} style={styles.tag}>
                          <Text style={styles.tagText}>{p?.label ?? c}</Text>
                        </View>
                      );
                    })}
                    {item.permissionCodes.length > 3 && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>+{item.permissionCodes.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {canManage && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No custom roles yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Role' : 'New Role'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              placeholder="Role name"
              placeholderTextColor="#999"
              value={roleName}
              onChangeText={setRoleName}
            />
            <Text style={styles.permsLabel}>Permissions</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {Object.entries(byCategory).map(([cat, catPerms]) => (
                <View key={cat}>
                  <Text style={styles.catLabel}>{cat}</Text>
                  {catPerms.map(p => (
                    <View key={p.code} style={styles.permRow}>
                      <Text style={styles.permLabel}>{p.label}</Text>
                      <Switch
                        value={!!selected[p.code]}
                        onValueChange={() => togglePerm(p.code)}
                        trackColor={{ false: '#D0D5DD', true: colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveText}>{editing ? 'Update' : 'Create'}</Text>}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 16, gap: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  rowSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontFamily: 'Outfit-Medium', color: colors.primary },
  actions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  editBtn: { backgroundColor: '#EBF0FF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
  empty: { textAlign: 'center', color: '#6b7280', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  permsLabel: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  catLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  permLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6b7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default RolesScreen;
