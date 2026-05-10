import React, { useMemo } from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../services/api/posApi';
import { ROLES } from '../utils/permissions';
import { useSidebarStore } from '../store/sidebarStore';
import SidebarOverlay from '../components/Sidebar/SidebarOverlay';
import ChatFAB from '../components/ChatFAB/ChatFAB';
import Header from '../components/Header/Header';

// Shared
import NotificationsScreen from '../screens/main/shared/Notifications/NotificationsScreen';
import ProfileScreen from '../screens/main/shared/Profile/ProfileScreen';

// Admin / Staff
import DashboardScreen from '../screens/main/admin/Dashboard/DashboardScreen';
import MyBusinessesScreen from '../screens/main/admin/MyBusinesses/MyBusinessesScreen';
import POSScreen from '../screens/main/admin/POS/POSScreen';
import ProductsScreen from '../screens/main/admin/Products/ProductsScreen';
import CategoriesScreen from '../screens/main/admin/Categories/CategoriesScreen';
import CustomersScreen from '../screens/main/admin/Customers/CustomersScreen';
import OrdersScreen from '../screens/main/admin/Orders/OrdersScreen';
import OrderDetailScreen from '../screens/main/admin/Orders/OrderDetailScreen';
import StaffScreen from '../screens/main/admin/Staff/StaffScreen';
import RolesScreen from '../screens/main/admin/Roles/RolesScreen';
import SuppliersScreen from '../screens/main/admin/Suppliers/SuppliersScreen';
import ManufacturersScreen from '../screens/main/admin/Manufacturers/ManufacturersScreen';
import DeviceConditionsScreen from '../screens/main/admin/DeviceConditions/DeviceConditionsScreen';
import TicketsScreen from '../screens/main/admin/Tickets/TicketsScreen';
import ReportsScreen from '../screens/main/admin/Reports/ReportsScreen';
import IntegrationsScreen from '../screens/main/admin/Integrations/IntegrationsScreen';
import BillingScreen from '../screens/main/admin/Billing/BillingScreen';
import AttendanceScreen from '../screens/main/admin/Attendance/AttendanceScreen';
import SupportChatScreen from '../screens/main/admin/Chat/SupportChatScreen';
import SettingsScreen from '../screens/main/admin/Settings/SettingsScreen';

// Medical
import MedicalDashboardScreen from '../screens/main/admin/Medical/MedicalDashboardScreen';
import AppointmentsScreen from '../screens/main/admin/Medical/AppointmentsScreen';
import PatientsScreen from '../screens/main/admin/Medical/PatientsScreen';
import DoctorsScreen from '../screens/main/admin/Medical/DoctorsScreen';

// Restaurant
import RestaurantDashboardScreen from '../screens/main/admin/Restaurant/RestaurantDashboardScreen';
import MenuScreen from '../screens/main/admin/Restaurant/MenuScreen';
import TablesScreen from '../screens/main/admin/Restaurant/TablesScreen';
import RestaurantOrdersScreen from '../screens/main/admin/Restaurant/RestaurantOrdersScreen';

// Factory
import FactoryMedicinesScreen from '../screens/main/admin/Factory/FactoryMedicinesScreen';
import FactoryOrderInboxScreen from '../screens/main/admin/Factory/FactoryOrderInboxScreen';

// Pharmacy
import PharmacyFactoriesScreen from '../screens/main/admin/Pharmacy/PharmacyFactoriesScreen';
import PharmacyOrdersScreen from '../screens/main/admin/Pharmacy/PharmacyOrdersScreen';

// Social Media
import SocialAccountsScreen from '../screens/main/admin/Social/SocialAccountsScreen';
import SocialPostsScreen from '../screens/main/admin/Social/SocialPostsScreen';
import SocialCommentsScreen from '../screens/main/admin/Social/SocialCommentsScreen';
import SocialMessagesScreen from '../screens/main/admin/Social/SocialMessagesScreen';

// Super Admin
import SADashboardScreen from '../screens/main/super-admin/Dashboard/SADashboardScreen';
import SABusinessesScreen from '../screens/main/super-admin/Businesses/SABusinessesScreen';
import SABusinessDetailScreen from '../screens/main/super-admin/Businesses/SABusinessDetailScreen';
import SABusinessTypesScreen from '../screens/main/super-admin/BusinessTypes/SABusinessTypesScreen';
import SAPackagePlansScreen from '../screens/main/super-admin/PackagePlans/SAPackagePlansScreen';
import SARolesScreen from '../screens/main/super-admin/Roles/SARolesScreen';
import SAReportsScreen from '../screens/main/super-admin/Reports/SAReportsScreen';
import SASupportScreen from '../screens/main/super-admin/Chat/SASupportScreen';
import SALegalPagesScreen from '../screens/main/super-admin/LegalPages/SALegalPagesScreen';
import SASettingsScreen from '../screens/main/super-admin/Settings/SASettingsScreen';

// Support Staff
import SupportDashboardScreen from '../screens/main/support/Chat/SupportDashboardScreen';

const Stack = createStackNavigator();

// ─── Header builders ──────────────────────────────────────────────────────────
const makeMenuHeader = (openSidebar, unreadCount) => ({ navigation }) => (
  <Header
    showMenuButton
    showBackButton={false}
    showSearchBar={false}
    onMenuPress={openSidebar}
    onNotificationPress={() => navigation.navigate('Notifications')}
    notificationCount={unreadCount}
  />
);

const makeBackHeader = unreadCount => ({ navigation }) => (
  <Header
    showMenuButton={false}
    showBackButton
    showSearchBar={false}
    onBackPress={() => navigation.goBack()}
    onNotificationPress={() => navigation.navigate('Notifications')}
    notificationCount={unreadCount}
  />
);

// ─── Admin / Staff ────────────────────────────────────────────────────────────
const ADMIN_SCREENS = [
  { name: 'Dashboard',    component: DashboardScreen },
  { name: 'MyBusinesses', component: MyBusinessesScreen },
  { name: 'POS',          component: POSScreen },
  { name: 'Products',     component: ProductsScreen },
  { name: 'Categories',   component: CategoriesScreen },
  { name: 'Customers',    component: CustomersScreen },
  { name: 'Orders',       component: OrdersScreen },
  { name: 'Tickets',      component: TicketsScreen },
  { name: 'Suppliers',         component: SuppliersScreen },
  { name: 'Manufacturers',     component: ManufacturersScreen },
  { name: 'DeviceConditions',  component: DeviceConditionsScreen },
  { name: 'Staff',             component: StaffScreen },
  { name: 'Roles',        component: RolesScreen },
  { name: 'Reports',      component: ReportsScreen },
  { name: 'Integrations', component: IntegrationsScreen },
  { name: 'Billing',      component: BillingScreen },
  { name: 'Attendance',   component: AttendanceScreen },
  { name: 'SupportChat',  component: SupportChatScreen },
  { name: 'Settings',     component: SettingsScreen },

  // Medical
  { name: 'MedicalDashboard', component: MedicalDashboardScreen },
  { name: 'Appointments',     component: AppointmentsScreen },
  { name: 'Patients',         component: PatientsScreen },
  { name: 'Doctors',          component: DoctorsScreen },

  // Restaurant
  { name: 'RestaurantDashboard', component: RestaurantDashboardScreen },
  { name: 'RestaurantMenu',      component: MenuScreen },
  { name: 'RestaurantTables',    component: TablesScreen },
  { name: 'RestaurantOrders',    component: RestaurantOrdersScreen },

  // Factory
  { name: 'FactoryMedicines',  component: FactoryMedicinesScreen },
  { name: 'FactoryOrderInbox', component: FactoryOrderInboxScreen },

  // Pharmacy
  { name: 'PharmacyFactories', component: PharmacyFactoriesScreen },
  { name: 'PharmacyOrders',    component: PharmacyOrdersScreen },

  // Social Media
  { name: 'SocialAccounts',  component: SocialAccountsScreen },
  { name: 'SocialPosts',     component: SocialPostsScreen },
  { name: 'SocialComments',  component: SocialCommentsScreen },
  { name: 'SocialMessages',  component: SocialMessagesScreen },
];

const AdminNavigator = ({ unreadCount }) => {
  const openSidebar = useSidebarStore(s => s.open);
  const menuHdr = makeMenuHeader(openSidebar, unreadCount);
  const backHdr = makeBackHeader(unreadCount);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {ADMIN_SCREENS.map(({ name, component: C }) => (
          <Stack.Screen key={name} name={name} component={C} options={{ header: menuHdr }} />
        ))}
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ header: backHdr }} />
        <Stack.Screen name="OrderDetail"   component={OrderDetailScreen}   options={{ header: backHdr }} />
        <Stack.Screen name="Profile"       component={ProfileScreen}       options={{ header: backHdr }} />
      </Stack.Navigator>
      <SidebarOverlay />
      <ChatFAB />
    </View>
  );
};

// ─── Super Admin ──────────────────────────────────────────────────────────────
const SA_SCREENS = [
  { name: 'SADashboard',     component: SADashboardScreen },
  { name: 'SABusinesses',    component: SABusinessesScreen },
  { name: 'SABusinessTypes', component: SABusinessTypesScreen },
  { name: 'SAPackagePlans',  component: SAPackagePlansScreen },
  { name: 'SARoles',         component: SARolesScreen },
  { name: 'SAReports',       component: SAReportsScreen },
  { name: 'SASupport',       component: SASupportScreen },
  { name: 'SALegalPages',    component: SALegalPagesScreen },
  { name: 'SASettings',      component: SASettingsScreen },
];

const SuperAdminNavigator = ({ unreadCount }) => {
  const openSidebar = useSidebarStore(s => s.open);
  const menuHdr = makeMenuHeader(openSidebar, unreadCount);
  const backHdr = makeBackHeader(unreadCount);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {SA_SCREENS.map(({ name, component: C }) => (
          <Stack.Screen key={name} name={name} component={C} options={{ header: menuHdr }} />
        ))}
        <Stack.Screen name="SABusinessDetail" component={SABusinessDetailScreen} options={{ header: backHdr }} />
        <Stack.Screen name="Notifications"    component={NotificationsScreen}    options={{ header: backHdr }} />
        <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ header: backHdr }} />
      </Stack.Navigator>
      <SidebarOverlay />
    </View>
  );
};

// ─── Support Staff ────────────────────────────────────────────────────────────
const SupportNavigator = ({ unreadCount }) => {
  const openSidebar = useSidebarStore(s => s.open);
  const menuHdr = makeMenuHeader(openSidebar, unreadCount);
  const backHdr = makeBackHeader(unreadCount);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen name="SupportDashboard" component={SupportDashboardScreen} options={{ header: menuHdr }} />
        <Stack.Screen name="Notifications"    component={NotificationsScreen}    options={{ header: backHdr }} />
        <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ header: backHdr }} />
      </Stack.Navigator>
      <SidebarOverlay />
    </View>
  );
};

// ─── Main Stack — role switch ─────────────────────────────────────────────────
export default function MainStack() {
  const { userRole } = useAuth();
  const { data: notifs } = useNotifications();
  const unreadCount = useMemo(
    () => Array.isArray(notifs) ? notifs.filter(n => !n.isRead).length : 0,
    [notifs],
  );

  if (userRole === ROLES.SUPER_ADMIN)   return <SuperAdminNavigator unreadCount={unreadCount} />;
  if (userRole === ROLES.SUPPORT_STAFF) return <SupportNavigator    unreadCount={unreadCount} />;
  return <AdminNavigator unreadCount={unreadCount} />;
}
