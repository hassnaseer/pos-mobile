import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
  Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ROLES, PERMISSIONS } from '../../utils/permissions';
import colors from '../../theme/colors';
import crossIcon from '../../assets/icons/cross-icon.png';

// Icons
import dashIcon      from '../../assets/icons/pie-chart-03.png';
import posIcon       from '../../assets/icons/coins-swap-01.png';
import productsIcon  from '../../assets/icons/layers.png';
import customersIcon from '../../assets/icons/users-01.png';
import ordersIcon    from '../../assets/icons/check-done-01.png';
import suppliersIcon from '../../assets/icons/home-line.png';
import rolesIcon     from '../../assets/icons/git-branch-01.png';
import staffIcon     from '../../assets/icons/users-01.png';
import ticketsIcon   from '../../assets/icons/coins-swap-01.png';
import reportsIcon   from '../../assets/icons/pie-chart-03.png';
import chatIcon      from '../../assets/icons/users-01.png';

// ─── Menu item shape ──────────────────────────────────────────────────────────
// permission : string   — only show if perms.can(permission)
// adminOnly  : boolean  — hidden for staff role
// staffOnly  : boolean  — hidden for admin role (shown for staff only)
// hideFor    : string[] — hidden if user has ANY of these permission codes
// canShow(perms) — optional function for multi-permission checks
// isGroup    : boolean  — renders as expandable group header with subItems
// subItems   : array    — child items (same shape minus isGroup); filtered by permission at render time

const ADMIN_MENU = [
  // ── Core ─────────────────────────────────────────────────────────────────────
  { id: 'staff-dashboard', title: 'Dashboard', route: 'StaffDashboard', icon: dashIcon, staffOnly: true },
  { id: 'dashboard',  title: 'Dashboard', route: 'Dashboard', icon: dashIcon, adminOnly: true,
    hideFor: [PERMISSIONS.ACCESS_MEDICAL, PERMISSIONS.ACCESS_RESTAURANT, PERMISSIONS.MANAGE_ATTENDANCE] },
  { id: 'my-biz',     title: 'My Businesses',  route: 'MyBusinesses', icon: suppliersIcon, adminOnly: true, permission: PERMISSIONS.MANAGE_BUSINESSES },
  { id: 'pos',        title: 'POS',            route: 'POS',          icon: posIcon,       permission: PERMISSIONS.POS_SALES },

  // ── Inventory (expandable group) ──────────────────────────────────────────────
  {
    id: 'inventory', title: 'Inventory', icon: productsIcon, isGroup: true,
    subItems: [
      { id: 'products',     title: 'Products',     route: 'Products',    icon: productsIcon, permission: PERMISSIONS.MANAGE_PRODUCTS },
      { id: 'misc-charges', title: 'Misc Charges', route: 'MiscCharges', icon: productsIcon, permission: PERMISSIONS.MANAGE_MISC,       adminOnly: true },
      { id: 'categories',   title: 'Categories',   route: 'Categories',  icon: productsIcon, permission: PERMISSIONS.MANAGE_CATEGORIES, adminOnly: true },
    ],
  },

  // ── CRM ──────────────────────────────────────────────────────────────────────
  { id: 'customers', title: 'Customers', route: 'Customers', icon: customersIcon, permission: PERMISSIONS.MANAGE_CUSTOMERS },
  { id: 'orders',    title: 'Invoices',  route: 'Orders',    icon: ordersIcon,    permission: PERMISSIONS.VIEW_ORDERS },
  { id: 'tickets',   title: 'Tickets',   route: 'Tickets',   icon: ticketsIcon,   permission: PERMISSIONS.CREATE_TICKETS },

  // ── Config (admin-only) ───────────────────────────────────────────────────────
  { id: 'staff', title: 'Staff', route: 'Staff', icon: staffIcon, permission: PERMISSIONS.MANAGE_STAFF, adminOnly: true },

  // ── Reports & Logs ────────────────────────────────────────────────────────────
  { id: 'reports',       title: 'Reports',       route: 'Reports',      icon: reportsIcon, permission: PERMISSIONS.VIEW_REPORTS },
  { id: 'activity-logs', title: 'Activity Logs', route: 'ActivityLogs', icon: reportsIcon, permission: PERMISSIONS.VIEW_ACTIVITY_LOGS, adminOnly: true },

  // ── Integrations ─────────────────────────────────────────────────────────────
  { id: 'integrations', title: 'Integrations', route: 'Integrations', icon: rolesIcon, permission: PERMISSIONS.MANAGE_ECOMMERCE, adminOnly: true },

  // ── HRMS ──────────────────────────────────────────────────────────────────────
  { id: 'hrms-dash',           title: 'HRMS Dashboard',      route: 'HRMSDashboard',      icon: dashIcon,    canShow: p => p.hasAnyHRMS() },
  { id: 'fingerprint-devices', title: 'Fingerprint Devices', route: 'FingerprintDevices', icon: staffIcon,   permission: PERMISSIONS.DEVICE_ATTENDANCE, adminOnly: true },
  { id: 'attendance',     title: 'Attendance',    route: 'HRMSAttendance',    icon: ordersIcon,  permission: PERMISSIONS.MANAGE_ATTENDANCE },
  { id: 'hrms-leave',     title: 'Leave',         route: 'HRMSLeave',         icon: ordersIcon,  permission: PERMISSIONS.MANAGE_LEAVE },
  { id: 'hrms-claims',    title: 'Claims',        route: 'HRMSClaims',        icon: reportsIcon, permission: PERMISSIONS.MANAGE_CLAIMS },
  { id: 'hrms-announce',  title: 'Announcements', route: 'HRMSAnnouncements', icon: chatIcon,    permission: PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { id: 'hrms-payroll',   title: 'Payroll',       route: 'HRMSPayroll',       icon: reportsIcon, permission: PERMISSIONS.MANAGE_PAYROLL },
  { id: 'hrms-tasks',     title: 'Tasks',         route: 'HRMSTasks',         icon: ticketsIcon, permission: PERMISSIONS.MANAGE_TASKS },
  { id: 'hrms-reviews',   title: 'Annual Reviews',route: 'HRMSReviews',       icon: reportsIcon, permission: PERMISSIONS.MANAGE_REVIEWS },
  { id: 'hrms-jobs',      title: 'Job Board',     route: 'HRMSJobBoard',      icon: staffIcon,   permission: PERMISSIONS.MANAGE_INTERNAL_JOBS },
  { id: 'hrms-docs',      title: 'Documents',     route: 'HRMSDocuments',     icon: ordersIcon,  permission: PERMISSIONS.MANAGE_DOCUMENTS },
  { id: 'hrms-trainings', title: 'Trainings',     route: 'HRMSTrainings',     icon: productsIcon,permission: PERMISSIONS.MANAGE_TRAININGS },

  // ── Vendor / Marketplace ──────────────────────────────────────────────────────
  { id: 'marketplace',     title: 'Marketplace',     route: 'Marketplace',    icon: productsIcon,  permission: PERMISSIONS.ACCESS_VENDOR_BUYER },
  { id: 'vendor-orders',   title: 'My Orders',       route: 'VendorOrders',   icon: ordersIcon,    permission: PERMISSIONS.ACCESS_VENDOR_BUYER },
  { id: 'vendor-profile',  title: 'Vendor Profile',  route: 'VendorProfile',  icon: suppliersIcon, permission: PERMISSIONS.ACCESS_VENDOR_SELLER },
  { id: 'vendor-listings', title: 'My Listings',     route: 'VendorListings', icon: productsIcon,  permission: PERMISSIONS.ACCESS_VENDOR_SELLER },
  { id: 'incoming-orders', title: 'Incoming Orders', route: 'IncomingOrders', icon: ordersIcon,    permission: PERMISSIONS.ACCESS_VENDOR_SELLER },

  // ── Specialty: Medical ────────────────────────────────────────────────────────
  { id: 'medical-dash',    title: 'Medical Dashboard',  route: 'MedicalDashboard',    icon: dashIcon,      permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'appointments',    title: 'Appointments',       route: 'Appointments',        icon: ordersIcon,    permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'patients',        title: 'Patients',           route: 'Patients',            icon: customersIcon, permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'doctors',         title: 'Doctors',            route: 'Doctors',             icon: staffIcon,     permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'appt-types',      title: 'Appointment Types',  route: 'AppointmentTypes',    icon: rolesIcon,     permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'medical-checkin', title: 'Staff Check-in',     route: 'MedicalStaffCheckin', icon: ordersIcon,    permission: PERMISSIONS.MANAGE_ATTENDANCE, adminOnly: true },
  { id: 'medical-reminders', title: 'Reminders',        route: 'MedicalReminders',    icon: ticketsIcon,   permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'medical-insurance', title: 'Insurance',        route: 'MedicalInsurance',    icon: reportsIcon,   permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'patient-tracking',  title: 'Patient Tracking', route: 'PatientTracking',     icon: customersIcon, permission: PERMISSIONS.ACCESS_MEDICAL },

  // ── Specialty: Restaurant ─────────────────────────────────────────────────────
  { id: 'restaurant-dash',   title: 'Restaurant Dashboard', route: 'RestaurantDashboard', icon: dashIcon,     permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-menu',   title: 'Menu',                 route: 'RestaurantMenu',      icon: productsIcon, permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-tables', title: 'Tables',               route: 'RestaurantTables',    icon: rolesIcon,    permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-orders', title: 'Restaurant Orders',    route: 'RestaurantOrders',    icon: ordersIcon,   permission: PERMISSIONS.ACCESS_RESTAURANT },

  // ── Specialty: Factory ────────────────────────────────────────────────────────
  { id: 'factory-medicines',   title: 'Medicines',   route: 'FactoryMedicines',   icon: productsIcon, permission: PERMISSIONS.ACCESS_FACTORY },
  { id: 'factory-orders',      title: 'Order Inbox', route: 'FactoryOrderInbox',  icon: ordersIcon,   permission: PERMISSIONS.ACCESS_FACTORY },
  { id: 'factory-connections', title: 'Connections', route: 'FactoryConnections', icon: rolesIcon,    permission: PERMISSIONS.ACCESS_FACTORY },

  // ── Specialty: Pharmacy ───────────────────────────────────────────────────────
  { id: 'pharmacy-factories',   title: 'Browse Factories', route: 'PharmacyFactories',   icon: suppliersIcon, permission: PERMISSIONS.ACCESS_PHARMACY },
  { id: 'pharmacy-orders',      title: 'My Med Orders',    route: 'PharmacyOrders',      icon: ordersIcon,    permission: PERMISSIONS.ACCESS_PHARMACY },
  { id: 'pharmacy-connections', title: 'Connections',      route: 'PharmacyConnections', icon: rolesIcon,     permission: PERMISSIONS.ACCESS_PHARMACY },

  // ── Social Media (expandable group) ──────────────────────────────────────────
  {
    id: 'social', title: 'Social Media', icon: chatIcon, isGroup: true,
    canShow: p => p.hasAnySocial(),
    subItems: [
      { id: 'social-accounts', title: 'Connected Accounts', route: 'SocialAccounts', icon: chatIcon },
      { id: 'social-posts',    title: 'Posts',              route: 'SocialPosts',    icon: reportsIcon },
      { id: 'social-messages', title: 'Messages',           route: 'SocialMessages', icon: chatIcon },
    ],
  },

  // ── Staff Personal (HRMS personal items — staffOnly) ──────────────────────────
  // ownerPerm: business must have this module; if businessPermissionCodes absent → show (graceful degradation)
  { id: 'my-attendance',  title: 'My Attendance', route: 'MyAttendance', icon: ordersIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_ATTENDANCE },
  { id: 'my-leave',       title: 'My Leave',       route: 'MyLeave',      icon: ordersIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_LEAVE },
  { id: 'my-payslips',    title: 'My Payslips',    route: 'MyPayslips',   icon: reportsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_PAYROLL },
  { id: 'my-claims',      title: 'My Claims',      route: 'MyClaims',     icon: reportsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_CLAIMS },
  { id: 'my-announce',    title: 'Announcements',  route: 'MyAnnouncements', icon: chatIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { id: 'my-tasks',       title: 'My Tasks',       route: 'MyTasks',      icon: ticketsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_TASKS },
  { id: 'my-reviews',     title: 'My Reviews',     route: 'MyReviews',    icon: reportsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_REVIEWS },
  { id: 'staff-jobs',     title: 'Job Board',      route: 'StaffJobBoard', icon: staffIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_INTERNAL_JOBS },
  { id: 'my-documents',   title: 'My Documents',   route: 'MyDocuments',  icon: ordersIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_DOCUMENTS },
  { id: 'my-trainings',   title: 'My Trainings',   route: 'MyTrainings',  icon: productsIcon,  staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_TRAININGS },
];

const SUPER_ADMIN_MENU = [
  { id: 'sa-dashboard',      title: 'Dashboard',         route: 'SADashboard',     icon: dashIcon },
  { id: 'sa-businesses',     title: 'Businesses',        route: 'SABusinesses',    icon: productsIcon },
  { id: 'sa-business-types', title: 'Business Types',    route: 'SABusinessTypes', icon: ordersIcon },
  { id: 'sa-packages',       title: 'Package Plans',     route: 'SAPackagePlans',  icon: rolesIcon },
  { id: 'sa-reports',        title: 'Revenue Reports',   route: 'SAReports',       icon: reportsIcon },
  { id: 'sa-support',         title: 'Customer Support',  route: 'SASupport',         icon: chatIcon },
  { id: 'sa-support-tickets', title: 'Support Tickets',   route: 'SASupportTickets',  icon: ticketsIcon },
  { id: 'sa-legal',          title: 'Legal Pages',       route: 'SALegalPages',    icon: ordersIcon },
  { id: 'sa-vendors',        title: 'Vendors',           route: 'SAVendors',       icon: productsIcon },
  { id: 'sa-demo-requests',  title: 'Demo Requests',     route: 'SADemoRequests',  icon: ordersIcon },
  { id: 'sa-platform-team',  title: 'Platform Team',     route: 'SAPlatformTeam',  icon: staffIcon },
  { id: 'sa-documents',      title: 'Documents',         route: 'SADocuments',     icon: reportsIcon },
  { id: 'sa-activity-logs',        title: 'Activity Logs',       route: 'SAActivityLogs',       icon: reportsIcon },
  { id: 'sa-learn-guides',         title: 'Learn Guides',        route: 'SALearnGuides',        icon: dashIcon },
  { id: 'sa-business-categories',  title: 'Business Categories', route: 'SABusinessCategories', icon: productsIcon },
  { id: 'sa-custom-plans',         title: 'Custom Plans',        route: 'SACustomPlans',        icon: rolesIcon },
  { id: 'sa-payment-queue',        title: 'Payment Queue',       route: 'SAPaymentQueue',       icon: ordersIcon },
  { id: 'sa-error-logs',           title: 'Error Logs',          route: 'SAErrorLogs',          icon: reportsIcon },
];

const SUPPORT_STAFF_MENU = [
  { id: 'support-chat', title: 'Customer Support', route: 'SupportDashboard', icon: chatIcon },
];

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const Sidebar = ({ onClose }) => {
  const navigation = useNavigation();
  const { userRole, user } = useAuth();
  const perms = usePermissions();
  const [activeRoute, setActiveRoute] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const filterItem = (item, isStaff, isAdmin, permCodes, bizPermCodes) => {
    if (isStaff && item.adminOnly)   return false;
    if (isAdmin && item.staffOnly)   return false;
    if (item.canShow && !item.canShow(perms)) return false;
    if (item.permission && !perms.can(item.permission)) return false;
    if (item.hideFor && item.hideFor.some(p => permCodes.includes(p))) return false;
    if (item.ownerPerm && bizPermCodes && !bizPermCodes.includes(item.ownerPerm)) return false;
    return true;
  };

  const getMenuItems = () => {
    if (userRole === ROLES.SUPER_ADMIN)   return SUPER_ADMIN_MENU;
    if (userRole === ROLES.SUPPORT_STAFF) return SUPPORT_STAFF_MENU;

    const isStaff      = userRole === ROLES.STAFF;
    const isAdmin      = !isStaff;
    const permCodes    = user?.permissionCodes ?? [];
    const bizPermCodes = user?.businessPermissionCodes;

    return ADMIN_MENU.reduce((acc, item) => {
      if (item.isGroup) {
        if (item.canShow && !item.canShow(perms)) return acc;
        const visibleSubs = item.subItems.filter(sub =>
          filterItem(sub, isStaff, isAdmin, permCodes, bizPermCodes),
        );
        if (visibleSubs.length > 0) acc.push({ ...item, subItems: visibleSubs });
        return acc;
      }
      if (filterItem(item, isStaff, isAdmin, permCodes, bizPermCodes)) acc.push(item);
      return acc;
    }, []);
  };

  const menuItems = getMenuItems();

  const handlePress = route => {
    setActiveRoute(route);
    navigation.navigate('Main', { screen: route });
    onClose?.();
  };

  const toggleGroup = id =>
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const businessInitial = (user?.businessName ?? user?.name ?? 'B')[0].toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: STATUS_BAR_HEIGHT }]}>
      {/* ── Business header ── */}
      <View style={styles.bizHeader}>
        <View style={styles.bizLogoWrap}>
          {user?.businessLogo
            ? <Image source={{ uri: user.businessLogo }} style={styles.bizLogoImg} resizeMode="cover" />
            : <Text style={styles.bizLogoText}>{businessInitial}</Text>}
        </View>
        <View style={styles.bizInfo}>
          <Text style={styles.bizName} numberOfLines={1}>{user?.businessName ?? 'My Business'}</Text>
          {user?.businessType ? <Text style={styles.bizType} numberOfLines={1}>{user.businessType}</Text> : null}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Image source={crossIcon} style={styles.closeIcon} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable menu (no footer — Profile/Settings/Logout are in the header) ── */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {menuItems.map(item => {
          if (item.isGroup) {
            const expanded = !!expandedGroups[item.id];
            const anySubActive = item.subItems.some(s => s.route === activeRoute);
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={[styles.menuItem, anySubActive && styles.menuItemActive]}
                  onPress={() => toggleGroup(item.id)}
                  activeOpacity={0.7}
                >
                  <Image source={item.icon} style={[styles.menuIcon, { tintColor: anySubActive ? colors.primary : '#666' }]} />
                  <Text style={[styles.menuText, anySubActive && styles.menuTextActive]}>{item.title}</Text>
                  <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
                </TouchableOpacity>
                {expanded && item.subItems.map(sub => {
                  const subActive = activeRoute === sub.route;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.menuItem, styles.subItem, subActive && styles.menuItemActive]}
                      onPress={() => handlePress(sub.route)}
                      activeOpacity={0.7}
                    >
                      <Image source={sub.icon} style={[styles.menuIcon, { tintColor: subActive ? colors.primary : '#999' }]} />
                      <Text style={[styles.menuText, styles.subItemText, subActive && styles.menuTextActive]}>{sub.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }

          const active = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.7}
            >
              <Image source={item.icon} style={[styles.menuIcon, { tintColor: active ? colors.primary : '#666' }]} />
              <Text style={[styles.menuText, active && styles.menuTextActive]}>{item.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', flexDirection: 'column' },

  bizHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  bizLogoWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  bizLogoImg: { width: 44, height: 44, borderRadius: 10 },
  bizLogoText: { color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold' },
  bizInfo: { flex: 1 },
  bizName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  bizType: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 1 },
  closeBtn: { padding: 4 },
  closeIcon: { width: 16, height: 16, resizeMode: 'contain', tintColor: '#666' },

  menuScroll: { flex: 1 },
  menuContent: { paddingVertical: 8, paddingBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginHorizontal: 10, marginVertical: 1, paddingVertical: 12, borderRadius: 8, gap: 12 },
  menuItemActive: { backgroundColor: colors.primary + '15' },
  menuIcon: { width: 20, height: 20, resizeMode: 'contain' },
  menuText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#333', flex: 1 },
  menuTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  chevron: { fontSize: 18, color: '#999', transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  subItem: { marginLeft: 16, paddingLeft: 8 },
  subItemText: { fontSize: 13, color: '#555' },
});

export default Sidebar;
