import React, { useMemo } from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../services/api/posApi';
import { ROLES, PERMISSIONS, isStaff } from '../utils/permissions';
import { useSidebarStore } from '../store/sidebarStore';
import { useActiveRouteStore } from '../store/activeRouteStore';
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
import CreateTicketScreen from '../screens/main/admin/Tickets/CreateTicketScreen';
import ProductFormScreen from '../screens/main/admin/Products/ProductFormScreen';
import ReportsScreen from '../screens/main/admin/Reports/ReportsScreen';
import IntegrationsScreen from '../screens/main/admin/Integrations/IntegrationsScreen';
import MiscChargesScreen from '../screens/main/admin/MiscCharges/MiscChargesScreen';
import ActivityLogsScreen from '../screens/main/admin/ActivityLogs/ActivityLogsScreen';
import AttendanceScreen from '../screens/main/admin/Attendance/AttendanceScreen';
import AdvancedAnalyticsScreen from '../screens/main/admin/Reports/AdvancedAnalyticsScreen';
import MultiBranchViewScreen from '../screens/main/admin/Reports/MultiBranchViewScreen';
import LearnHubScreen from '../screens/main/admin/Learn/LearnHubScreen';
import LearnPageScreen from '../screens/main/admin/Learn/LearnPageScreen';

// HRMS
import HRMSDashboardScreen from '../screens/main/admin/HRMS/HRMSDashboardScreen';
import LeaveScreen from '../screens/main/admin/HRMS/LeaveScreen';
import ClaimsScreen from '../screens/main/admin/HRMS/ClaimsScreen';
import AnnouncementsScreen from '../screens/main/admin/HRMS/AnnouncementsScreen';
import PayrollScreen from '../screens/main/admin/HRMS/PayrollScreen';
import TasksScreen from '../screens/main/admin/HRMS/TasksScreen';
import ReviewsScreen from '../screens/main/admin/HRMS/ReviewsScreen';
import JobBoardScreen from '../screens/main/admin/HRMS/JobBoardScreen';
import HRDocumentsScreen from '../screens/main/admin/HRMS/HRDocumentsScreen';
import TrainingsScreen from '../screens/main/admin/HRMS/TrainingsScreen';
import OrgChartScreen from '../screens/main/admin/HRMS/OrgChartScreen';
import FinesScreen from '../screens/main/admin/HRMS/FinesScreen';
import SalaryAdvancesScreen from '../screens/main/admin/HRMS/SalaryAdvancesScreen';
import CommissionStructuresScreen from '../screens/main/admin/HRMS/CommissionStructuresScreen';
import CommissionEntriesScreen from '../screens/main/admin/HRMS/CommissionEntriesScreen';

// Team Chat
import TeamChatListScreen from '../screens/main/admin/TeamChat/TeamChatListScreen';
import TeamChatThreadScreen from '../screens/main/admin/TeamChat/TeamChatThreadScreen';

// Vendor / Marketplace
import MarketplaceScreen from '../screens/main/admin/Vendor/MarketplaceScreen';
import VendorOrdersScreen from '../screens/main/admin/Vendor/VendorOrdersScreen';
import VendorProfileScreen from '../screens/main/admin/Vendor/VendorProfileScreen';
import VendorListingsScreen from '../screens/main/admin/Vendor/VendorListingsScreen';
import IncomingOrdersScreen from '../screens/main/admin/Vendor/IncomingOrdersScreen';
import VendorDashboardScreen from '../screens/main/admin/Vendor/VendorDashboardScreen';
import SupportChatScreen from '../screens/main/admin/Chat/SupportChatScreen';
import SettingsScreen from '../screens/main/admin/Settings/SettingsScreen';
import BillingScreen from '../screens/main/admin/Billing/BillingScreen';
import AwaitingPaymentScreen from '../screens/main/admin/Billing/AwaitingPaymentScreen';
import InvoiceTemplateScreen from '../screens/main/admin/Settings/InvoiceTemplateScreen';
import PayslipTemplateScreen from '../screens/main/admin/Settings/PayslipTemplateScreen';

// Medical
import MedicalDashboardScreen from '../screens/main/admin/Medical/MedicalDashboardScreen';
import AppointmentsScreen from '../screens/main/admin/Medical/AppointmentsScreen';
import PatientsScreen from '../screens/main/admin/Medical/PatientsScreen';
import DoctorsScreen from '../screens/main/admin/Medical/DoctorsScreen';
import AppointmentTypesScreen from '../screens/main/admin/Medical/AppointmentTypesScreen';
import RemindersScreen from '../screens/main/admin/Medical/RemindersScreen';
import InsuranceScreen from '../screens/main/admin/Medical/InsuranceScreen';
import PatientTrackingScreen from '../screens/main/admin/Medical/PatientTrackingScreen';

// Restaurant
import RestaurantDashboardScreen from '../screens/main/admin/Restaurant/RestaurantDashboardScreen';
import MenuScreen from '../screens/main/admin/Restaurant/MenuScreen';
import TablesScreen from '../screens/main/admin/Restaurant/TablesScreen';
import RestaurantOrdersScreen from '../screens/main/admin/Restaurant/RestaurantOrdersScreen';

// Factory
import FactoryMedicinesScreen from '../screens/main/admin/Factory/FactoryMedicinesScreen';
import FactoryOrderInboxScreen from '../screens/main/admin/Factory/FactoryOrderInboxScreen';
import FactoryConnectionsScreen from '../screens/main/admin/Factory/FactoryConnectionsScreen';

// Pharmacy
import PharmacyFactoriesScreen from '../screens/main/admin/Pharmacy/PharmacyFactoriesScreen';
import PharmacyOrdersScreen from '../screens/main/admin/Pharmacy/PharmacyOrdersScreen';
import PharmacyConnectionsScreen from '../screens/main/admin/Pharmacy/PharmacyConnectionsScreen';

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
import SAVendorsScreen from '../screens/main/super-admin/Vendors/SAVendorsScreen';
import SADemoRequestsScreen from '../screens/main/super-admin/DemoRequests/SADemoRequestsScreen';
import SAPlatformTeamScreen from '../screens/main/super-admin/PlatformTeam/SAPlatformTeamScreen';
import SADocumentsScreen from '../screens/main/super-admin/Documents/SADocumentsScreen';
import SAActivityLogsScreen from '../screens/main/super-admin/ActivityLogs/SAActivityLogsScreen';
import SALearnGuidesScreen from '../screens/main/super-admin/LearnGuides/SALearnGuidesScreen';
import SABusinessCategoriesScreen from '../screens/main/super-admin/BusinessCategories/SABusinessCategoriesScreen';
import SACustomPlansScreen from '../screens/main/super-admin/CustomPlans/SACustomPlansScreen';
import SAPaymentQueueScreen from '../screens/main/super-admin/PaymentQueue/SAPaymentQueueScreen';
import SABusinessTypeFormScreen from '../screens/main/super-admin/BusinessTypes/SABusinessTypeFormScreen';
import SAPackagePlanFormScreen from '../screens/main/super-admin/PackagePlans/SAPackagePlanFormScreen';
import SACustomPlanFormScreen from '../screens/main/super-admin/CustomPlans/SACustomPlanFormScreen';
import SABusinessFormScreen from '../screens/main/super-admin/Businesses/SABusinessFormScreen';
import SAErrorLogsScreen from '../screens/main/super-admin/ErrorLogs/SAErrorLogsScreen';
import SASupportTicketsScreen from '../screens/main/super-admin/SupportTickets/SASupportTicketsScreen';

// Staff Dashboard (all 3 variants inside)
import StaffDashboardScreen from '../screens/main/staff/StaffDashboardScreen';

// Finance
import BudgetsScreen        from '../screens/main/admin/Finance/BudgetsScreen';
import ExpensesScreen        from '../screens/main/admin/Finance/ExpensesScreen';
import PaymentAccountsScreen from '../screens/main/admin/Finance/PaymentAccountsScreen';
import SupplierBillsScreen   from '../screens/main/admin/Finance/SupplierBillsScreen';
import ExpenseCategoriesScreen from '../screens/main/admin/Finance/ExpenseCategoriesScreen';
import FinanceDashboardScreen from '../screens/main/admin/Finance/FinanceDashboardScreen';
import FinanceReportsScreen from '../screens/main/admin/Finance/FinanceReportsScreen';

// Projects
import ProjectsScreen       from '../screens/main/admin/Projects/ProjectsScreen';
import ProjectClientsScreen from '../screens/main/admin/Projects/ProjectClientsScreen';
import KanbanBoardScreen    from '../screens/main/admin/Projects/KanbanBoardScreen';
import ProjectMarketplacesScreen from '../screens/main/admin/Projects/ProjectMarketplacesScreen';
import ProjectDetailScreen from '../screens/main/admin/Projects/ProjectDetailScreen';

// Rider (Delivery)
import RiderDashboardScreen  from '../screens/main/staff/RiderDashboardScreen';
import RiderDeliveriesScreen from '../screens/main/staff/RiderDeliveriesScreen';

// Snooker
import SnookerTablesScreen       from '../screens/main/admin/Snooker/SnookerTablesScreen';
import SnookerSessionTypesScreen from '../screens/main/admin/Snooker/SnookerSessionTypesScreen';
import SnookerDashboardScreen    from '../screens/main/admin/Snooker/SnookerDashboardScreen';
import SnookerSessionsScreen     from '../screens/main/admin/Snooker/SnookerSessionsScreen';
import SnookerSessionDetailScreen from '../screens/main/admin/Snooker/SnookerSessionDetailScreen';

// Medical — prescriptions (sub-screen opened from PatientsScreen)
import PatientPrescriptionsScreen from '../screens/main/admin/Medical/PatientPrescriptionsScreen';

// Medical Staff Check-in (admin manual)
import MedicalStaffCheckinScreen from '../screens/main/admin/Medical/MedicalStaffCheckinScreen';

// Taxes
import TaxesScreen from '../screens/main/admin/Taxes/TaxesScreen';

// Departments
import DepartmentsScreen from '../screens/main/admin/Departments/DepartmentsScreen';

// Ticket Statuses & Fingerprint Devices
import TicketStatusesScreen    from '../screens/main/admin/TicketStatuses/TicketStatusesScreen';
import FingerprintDevicesScreen from '../screens/main/admin/FingerprintDevices/FingerprintDevicesScreen';

// Staff Personal (HRMS)
import MyAttendanceScreen  from '../screens/main/staff/MyAttendanceScreen';
import MyLeaveScreen       from '../screens/main/staff/MyLeaveScreen';
import MyPayslipsScreen    from '../screens/main/staff/MyPayslipsScreen';
import MyClaimsScreen      from '../screens/main/staff/MyClaimsScreen';
import MyAnnouncementsScreen from '../screens/main/staff/MyAnnouncementsScreen';
import MyTasksScreen       from '../screens/main/staff/MyTasksScreen';
import MyReviewsScreen     from '../screens/main/staff/MyReviewsScreen';
import StaffJobBoardScreen from '../screens/main/staff/StaffJobBoardScreen';
import MyDocumentsScreen   from '../screens/main/staff/MyDocumentsScreen';
import MyTrainingsScreen   from '../screens/main/staff/MyTrainingsScreen';

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
  { name: 'MiscCharges',  component: MiscChargesScreen },
  { name: 'Customers',    component: CustomersScreen },
  { name: 'Orders',       component: OrdersScreen },
  { name: 'Tickets',      component: TicketsScreen },
  { name: 'Staff',        component: StaffScreen },
  { name: 'Reports',      component: ReportsScreen },
  { name: 'AdvancedAnalytics', component: AdvancedAnalyticsScreen },
  { name: 'MultiBranchView',   component: MultiBranchViewScreen },
  { name: 'LearnHub',     component: LearnHubScreen },
  { name: 'Integrations', component: IntegrationsScreen },
  { name: 'ActivityLogs', component: ActivityLogsScreen },
  { name: 'Attendance',   component: AttendanceScreen },

  // HRMS
  { name: 'HRMSDashboard',     component: HRMSDashboardScreen },
  { name: 'HRMSAttendance',    component: AttendanceScreen },
  { name: 'HRMSLeave',         component: LeaveScreen },
  { name: 'HRMSClaims',        component: ClaimsScreen },
  { name: 'HRMSAnnouncements', component: AnnouncementsScreen },
  { name: 'HRMSPayroll',       component: PayrollScreen },
  { name: 'HRMSSalaryAdvances', component: SalaryAdvancesScreen },
  { name: 'HRMSFines',          component: FinesScreen },
  { name: 'HRMSCommissionStructures', component: CommissionStructuresScreen },
  { name: 'HRMSCommissionEntries',    component: CommissionEntriesScreen },
  { name: 'HRMSTasks',         component: TasksScreen },
  { name: 'HRMSReviews',       component: ReviewsScreen },
  { name: 'HRMSJobBoard',      component: JobBoardScreen },
  { name: 'HRMSDocuments',     component: HRDocumentsScreen },
  { name: 'HRMSTrainings',     component: TrainingsScreen },
  { name: 'OrgChart',          component: OrgChartScreen },
  { name: 'TeamChat',          component: TeamChatListScreen },

  // Vendor / Marketplace
  { name: 'Marketplace',    component: MarketplaceScreen },
  { name: 'VendorOrders',   component: VendorOrdersScreen },
  { name: 'VendorProfile',  component: VendorProfileScreen },
  { name: 'VendorListings', component: VendorListingsScreen },
  { name: 'IncomingOrders', component: IncomingOrdersScreen },
  { name: 'VendorDashboard', component: VendorDashboardScreen },

  { name: 'SupportChat',  component: SupportChatScreen },
  { name: 'Settings',     component: SettingsScreen },

  // Staff Dashboard
  { name: 'StaffDashboard', component: StaffDashboardScreen },

  // Medical
  { name: 'MedicalDashboard',    component: MedicalDashboardScreen },
  { name: 'Appointments',        component: AppointmentsScreen },
  { name: 'Patients',            component: PatientsScreen },
  { name: 'Doctors',             component: DoctorsScreen },
  { name: 'MedicalStaffCheckin', component: MedicalStaffCheckinScreen },
  { name: 'MedicalReminders',    component: RemindersScreen },
  { name: 'MedicalInsurance',    component: InsuranceScreen },
  { name: 'PatientTracking',     component: PatientTrackingScreen },

  // Restaurant
  { name: 'RestaurantDashboard', component: RestaurantDashboardScreen },
  { name: 'RestaurantMenu',      component: MenuScreen },
  { name: 'RestaurantTables',    component: TablesScreen },
  { name: 'RestaurantOrders',    component: RestaurantOrdersScreen },

  // Factory
  { name: 'FactoryMedicines',   component: FactoryMedicinesScreen },
  { name: 'FactoryOrderInbox',  component: FactoryOrderInboxScreen },
  { name: 'FactoryConnections', component: FactoryConnectionsScreen },

  // Pharmacy
  { name: 'PharmacyFactories',   component: PharmacyFactoriesScreen },
  { name: 'PharmacyOrders',      component: PharmacyOrdersScreen },
  { name: 'PharmacyConnections', component: PharmacyConnectionsScreen },

  // Finance
  { name: 'Budgets',         component: BudgetsScreen },
  { name: 'Expenses',        component: ExpensesScreen },
  { name: 'ExpenseCategories', component: ExpenseCategoriesScreen },
  { name: 'FinanceDashboard', component: FinanceDashboardScreen },
  { name: 'FinanceReports', component: FinanceReportsScreen },
  { name: 'PaymentAccounts', component: PaymentAccountsScreen },
  { name: 'SupplierBills',   component: SupplierBillsScreen },

  // Projects
  { name: 'Projects',        component: ProjectsScreen },
  { name: 'ProjectKanban',   component: KanbanBoardScreen },
  { name: 'ProjectClients',  component: ProjectClientsScreen },
  { name: 'ProjectMarketplaces', component: ProjectMarketplacesScreen },

  // Rider (Delivery)
  { name: 'RiderDashboard',  component: RiderDashboardScreen },
  { name: 'RiderDeliveries', component: RiderDeliveriesScreen },

  // Snooker
  { name: 'SnookerDashboard',    component: SnookerDashboardScreen },
  { name: 'SnookerSessions',     component: SnookerSessionsScreen },
  { name: 'SnookerTables',       component: SnookerTablesScreen },
  { name: 'SnookerSessionTypes', component: SnookerSessionTypesScreen },

  // Social Media
  { name: 'SocialAccounts',  component: SocialAccountsScreen },
  { name: 'SocialPosts',     component: SocialPostsScreen },
  { name: 'SocialComments',  component: SocialCommentsScreen },
  { name: 'SocialMessages',  component: SocialMessagesScreen },

  // Staff Personal (HRMS personal screens)
  { name: 'MyAttendance',    component: MyAttendanceScreen },
  { name: 'MyLeave',         component: MyLeaveScreen },
  { name: 'MyPayslips',      component: MyPayslipsScreen },
  { name: 'MyClaims',        component: MyClaimsScreen },
  { name: 'MyAnnouncements', component: MyAnnouncementsScreen },
  { name: 'MyTasks',         component: MyTasksScreen },
  { name: 'MyReviews',       component: MyReviewsScreen },
  { name: 'StaffJobBoard',   component: StaffJobBoardScreen },
  { name: 'MyDocuments',     component: MyDocumentsScreen },
  { name: 'MyTrainings',     component: MyTrainingsScreen },
];

// Settings sub-screens — opened from Settings > Configuration, always show back button
const SETTINGS_SCREENS = [
  { name: 'Suppliers',        component: SuppliersScreen },
  { name: 'Manufacturers',    component: ManufacturersScreen },
  { name: 'DeviceConditions', component: DeviceConditionsScreen },
  { name: 'Roles',            component: RolesScreen },
  { name: 'Departments',      component: DepartmentsScreen },
  { name: 'Taxes',            component: TaxesScreen },
  { name: 'TicketStatuses',    component: TicketStatusesScreen },
  { name: 'FingerprintDevices', component: FingerprintDevicesScreen },
  { name: 'AppointmentTypes',   component: AppointmentTypesScreen },
  { name: 'Billing',            component: BillingScreen },
  { name: 'AwaitingPayment',    component: AwaitingPaymentScreen },
  { name: 'InvoiceTemplate',    component: InvoiceTemplateScreen },
  { name: 'PayslipTemplate',    component: PayslipTemplateScreen },
];

// Mirrors the web admin's dashboard-selection logic exactly (ProtectedRoute's
// getDashboardPath / business-admin-dashboard's redirect effect): a business
// owner with manage_businesses always lands on My Businesses; otherwise the
// admin's business primaryDashboard picks the industry-specific dashboard,
// falling back to the retail/POS dashboard.
const DASHBOARD_ROUTE_BY_PRIMARY = {
  medical: 'MedicalDashboard',
  restaurant: 'RestaurantDashboard',
  hrms: 'HRMSDashboard',
  finance: 'FinanceDashboard',
  snooker: 'SnookerDashboard',
};

const adminInitialRoute = user => {
  if (user?.permissionCodes?.includes(PERMISSIONS.MANAGE_BUSINESSES)) return 'MyBusinesses';
  return DASHBOARD_ROUTE_BY_PRIMARY[user?.primaryDashboard] ?? 'Dashboard';
};

const AdminNavigator = ({ unreadCount, userRole, user }) => {
  const openSidebar = useSidebarStore(s => s.open);
  const setActiveRoute = useActiveRouteStore(s => s.setActiveRoute);
  const menuHdr = makeMenuHeader(openSidebar, unreadCount);
  const backHdr = makeBackHeader(unreadCount);
  const initialRoute = isStaff(userRole) ? 'StaffDashboard' : adminInitialRoute(user);

  React.useEffect(() => {
    setActiveRoute(initialRoute);
  }, [initialRoute, setActiveRoute]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{ headerShown: true }}
        initialRouteName={initialRoute}
        screenListeners={{
          state: e => {
            const s = e.data.state;
            const current = s?.routes?.[s.index];
            if (current) setActiveRoute(current.name);
          },
        }}
      >
        {ADMIN_SCREENS.map(({ name, component: C }) => (
          <Stack.Screen key={name} name={name} component={C} options={{ header: menuHdr }} />
        ))}
        {SETTINGS_SCREENS.map(({ name, component: C }) => (
          <Stack.Screen key={name} name={name} component={C} options={{ header: backHdr }} />
        ))}
        <Stack.Screen name="Notifications"          component={NotificationsScreen}          options={{ header: backHdr }} />
        <Stack.Screen name="OrderDetail"           component={OrderDetailScreen}           options={{ header: backHdr }} />
        <Stack.Screen name="Profile"               component={ProfileScreen}               options={{ header: backHdr }} />
        <Stack.Screen name="CreateTicket"          component={CreateTicketScreen}          options={{ header: backHdr }} />
        <Stack.Screen name="ProductForm"           component={ProductFormScreen}           options={{ header: backHdr }} />
        <Stack.Screen name="PatientPrescriptions"  component={PatientPrescriptionsScreen}  options={{ header: backHdr }} />
        <Stack.Screen name="TeamChatThread"        component={TeamChatThreadScreen}        options={{ header: backHdr }} />
        <Stack.Screen name="LearnPage"              component={LearnPageScreen}             options={{ header: backHdr }} />
        <Stack.Screen name="SnookerSessionDetail"   component={SnookerSessionDetailScreen}   options={{ header: backHdr }} />
        <Stack.Screen name="ProjectDetail"          component={ProjectDetailScreen}          options={{ header: backHdr }} />
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
  { name: 'SAReports',       component: SAReportsScreen },
  { name: 'SASupport',       component: SASupportScreen },
  { name: 'SALegalPages',    component: SALegalPagesScreen },
  { name: 'SASettings',      component: SASettingsScreen },
  { name: 'SAVendors',       component: SAVendorsScreen },
  { name: 'SADemoRequests',  component: SADemoRequestsScreen },
  { name: 'SAPlatformTeam',  component: SAPlatformTeamScreen },
  { name: 'SADocuments',     component: SADocumentsScreen },
  { name: 'SAActivityLogs',       component: SAActivityLogsScreen },
  { name: 'SALearnGuides',        component: SALearnGuidesScreen },
  { name: 'SABusinessCategories', component: SABusinessCategoriesScreen },
  { name: 'SACustomPlans',        component: SACustomPlansScreen },
  { name: 'SAPaymentQueue',       component: SAPaymentQueueScreen },
  { name: 'SAErrorLogs',          component: SAErrorLogsScreen },
  { name: 'SASupportTickets',     component: SASupportTicketsScreen },
  { name: 'SARoles',              component: SARolesScreen },
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
        <Stack.Screen name="SABusinessDetail"   component={SABusinessDetailScreen}   options={{ header: backHdr }} />
        <Stack.Screen name="SABusinessTypeForm" component={SABusinessTypeFormScreen} options={{ header: backHdr }} />
        <Stack.Screen name="SAPackagePlanForm"  component={SAPackagePlanFormScreen}  options={{ header: backHdr }} />
        <Stack.Screen name="SACustomPlanForm"   component={SACustomPlanFormScreen}   options={{ header: backHdr }} />
        <Stack.Screen name="SABusinessForm"     component={SABusinessFormScreen}     options={{ header: backHdr }} />
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
  const { userRole, user } = useAuth();
  const { data: notifs } = useNotifications();
  const unreadCount = useMemo(
    () => Array.isArray(notifs) ? notifs.filter(n => !n.isRead).length : 0,
    [notifs],
  );

  // userRole is null briefly during logout — render nothing to avoid
  // flashing AdminNavigator before the navigation resets to Auth.
  if (!userRole) return null;

  if (userRole === ROLES.SUPER_ADMIN)   return <SuperAdminNavigator unreadCount={unreadCount} />;
  if (userRole === ROLES.SUPPORT_STAFF) return <SupportNavigator    unreadCount={unreadCount} />;
  return <AdminNavigator unreadCount={unreadCount} userRole={userRole} user={user} />;
}
