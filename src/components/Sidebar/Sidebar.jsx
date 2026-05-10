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

const ADMIN_MENU = [
  // ── Core ─────────────────────────────────────────────────────────────────────
  {
    id: 'dashboard', title: 'Dashboard', route: 'Dashboard', icon: dashIcon,
    adminOnly: true,
  },
  { id: 'my-biz',      title: 'My Businesses', route: 'MyBusinesses',    icon: suppliersIcon, adminOnly: true },
  { id: 'pos',         title: 'POS',           route: 'POS',             icon: posIcon,       permission: PERMISSIONS.POS_SALES },
  { id: 'products',    title: 'Products',      route: 'Products',        icon: productsIcon,  permission: PERMISSIONS.MANAGE_PRODUCTS },
  { id: 'categories',  title: 'Categories',    route: 'Categories',      icon: productsIcon,  permission: PERMISSIONS.MANAGE_CATEGORIES, adminOnly: true },
  { id: 'customers',   title: 'Customers',     route: 'Customers',       icon: customersIcon, permission: PERMISSIONS.MANAGE_CUSTOMERS },
  { id: 'orders',      title: 'Invoices',      route: 'Orders',          icon: ordersIcon,    permission: PERMISSIONS.VIEW_ORDERS },
  { id: 'tickets',     title: 'Tickets',       route: 'Tickets',         icon: ticketsIcon,   permission: PERMISSIONS.CREATE_TICKETS },

  // ── Admin-only config ─────────────────────────────────────────────────────────
  { id: 'suppliers',     title: 'Suppliers',         route: 'Suppliers',        icon: suppliersIcon, permission: PERMISSIONS.MANAGE_SUPPLIERS,     adminOnly: true },
  { id: 'manufacturers', title: 'Manufacturers',     route: 'Manufacturers',    icon: productsIcon,  permission: PERMISSIONS.MANAGE_MANUFACTURERS, adminOnly: true },
  { id: 'conditions',    title: 'Device Conditions', route: 'DeviceConditions', icon: rolesIcon,     permission: PERMISSIONS.MANAGE_CONDITIONS,    adminOnly: true },
  { id: 'staff',         title: 'Staff',             route: 'Staff',            icon: staffIcon,     permission: PERMISSIONS.MANAGE_STAFF,         adminOnly: true },
  { id: 'reports',       title: 'Reports',           route: 'Reports',          icon: reportsIcon,   permission: PERMISSIONS.VIEW_REPORTS },

  // ── Billing (admin only, no web sidebar equivalent but needed for mobile) ────
  { id: 'billing', title: 'Billing & Plan', route: 'Billing', icon: reportsIcon, adminOnly: true },

  // ── Specialty: Medical ────────────────────────────────────────────────────────
  { id: 'medical-dash',  title: 'Medical Dashboard', route: 'MedicalDashboard', icon: dashIcon,      permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'appointments',  title: 'Appointments',      route: 'Appointments',     icon: ordersIcon,    permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'patients',      title: 'Patients',          route: 'Patients',         icon: customersIcon, permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'doctors',       title: 'Doctors',           route: 'Doctors',          icon: staffIcon,     permission: PERMISSIONS.ACCESS_MEDICAL },

  // ── Specialty: Restaurant ─────────────────────────────────────────────────────
  { id: 'restaurant-dash',   title: 'Restaurant Dashboard', route: 'RestaurantDashboard', icon: dashIcon,     permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-menu',   title: 'Menu',                 route: 'RestaurantMenu',      icon: productsIcon, permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-tables', title: 'Tables',               route: 'RestaurantTables',    icon: rolesIcon,    permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-orders', title: 'Restaurant Orders',    route: 'RestaurantOrders',    icon: ordersIcon,   permission: PERMISSIONS.ACCESS_RESTAURANT },

  // ── Specialty: Factory ────────────────────────────────────────────────────────
  { id: 'factory-medicines', title: 'Medicines',   route: 'FactoryMedicines',  icon: productsIcon, permission: PERMISSIONS.ACCESS_FACTORY },
  { id: 'factory-orders',    title: 'Order Inbox', route: 'FactoryOrderInbox', icon: ordersIcon,   permission: PERMISSIONS.ACCESS_FACTORY },

  // ── Specialty: Pharmacy ───────────────────────────────────────────────────────
  { id: 'pharmacy-factories', title: 'Browse Factories', route: 'PharmacyFactories', icon: suppliersIcon, permission: PERMISSIONS.ACCESS_PHARMACY },
  { id: 'pharmacy-orders',    title: 'My Med Orders',   route: 'PharmacyOrders',    icon: ordersIcon,    permission: PERMISSIONS.ACCESS_PHARMACY },

  // ── Specialty: Social Media ───────────────────────────────────────────────────
  { id: 'social-accounts',  title: 'Connected Accounts', route: 'SocialAccounts',  icon: chatIcon,    permission: PERMISSIONS.ACCESS_SOCIAL_MEDIA },
  { id: 'social-posts',     title: 'Posts',              route: 'SocialPosts',     icon: reportsIcon, permission: PERMISSIONS.ACCESS_SOCIAL_MEDIA },
  { id: 'social-comments',  title: 'Comments',           route: 'SocialComments',  icon: chatIcon,    permission: PERMISSIONS.ACCESS_SOCIAL_MEDIA },
  { id: 'social-messages',  title: 'Messages',           route: 'SocialMessages',  icon: chatIcon,    permission: PERMISSIONS.ACCESS_SOCIAL_MEDIA },

  // ── Attendance: staff-only + medical access ───────────────────────────────────
  { id: 'attendance', title: 'My Attendance', route: 'Attendance', icon: ordersIcon, staffOnly: true, permission: PERMISSIONS.ACCESS_MEDICAL },
];

const SUPER_ADMIN_MENU = [
  { id: 'sa-dashboard',      title: 'Dashboard',         route: 'SADashboard',     icon: dashIcon },
  { id: 'sa-businesses',     title: 'Businesses',        route: 'SABusinesses',    icon: productsIcon },
  { id: 'sa-business-types', title: 'Business Types',    route: 'SABusinessTypes', icon: ordersIcon },
  { id: 'sa-packages',       title: 'Package Plans',     route: 'SAPackagePlans',  icon: rolesIcon },
  { id: 'sa-roles',          title: 'Roles',             route: 'SARoles',         icon: rolesIcon },
  { id: 'sa-reports',        title: 'Revenue Reports',   route: 'SAReports',       icon: reportsIcon },
  { id: 'sa-support',        title: 'Customer Support',  route: 'SASupport',       icon: chatIcon },
  { id: 'sa-legal',          title: 'Legal Pages',       route: 'SALegalPages',    icon: ordersIcon },
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

  const getMenuItems = () => {
    if (userRole === ROLES.SUPER_ADMIN)   return SUPER_ADMIN_MENU;
    if (userRole === ROLES.SUPPORT_STAFF) return SUPPORT_STAFF_MENU;

    const isStaff    = userRole === ROLES.STAFF;
    const isAdmin    = !isStaff;
    const permCodes  = user?.permissionCodes ?? [];

    return ADMIN_MENU.filter(item => {
      if (isStaff && item.adminOnly)   return false;
      if (isAdmin && item.staffOnly)   return false;
      if (item.permission && !perms.can(item.permission)) return false;
      if (item.hideFor && item.hideFor.some(p => permCodes.includes(p))) return false;
      return true;
    });
  };

  const menuItems = getMenuItems();

  const handlePress = route => {
    setActiveRoute(route);
    navigation.navigate('Main', { screen: route });
    onClose?.();
  };

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
});

export default Sidebar;
