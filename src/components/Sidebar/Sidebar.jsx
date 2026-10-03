import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
  Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupportChatUnreadCount } from '../../hooks/useSupportChatUnreadCount';
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
  // Matches web's hrmsPersonalItem gating exactly (sidebarItems.ts: "/staff" Dashboard
  // entry) — only shown when the business itself is HRMS-type (has manage_attendance).
  // A non-HRMS staff member (e.g. this Finance-type business) still lands on
  // StaffDashboard as their initial route after login; they just get no sidebar link
  // back to it, same as web.
  { id: 'staff-dashboard', title: 'Dashboard', route: 'StaffDashboard', icon: dashIcon, staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_ATTENDANCE },
  // Web repoints this same link to /admin/hrms for HRMS-primary businesses instead of
  // hiding it (adminDashboardPath) — mobile doesn't have that dynamic re-pointing, so
  // hiding the generic retail Dashboard and relying on the dedicated HRMS Dashboard
  // entry below is the correct mobile equivalent, not a bug to remove.
  { id: 'dashboard',  title: 'Dashboard', route: 'Dashboard', icon: dashIcon, adminOnly: true,
    hideFor: [PERMISSIONS.ACCESS_MEDICAL, PERMISSIONS.ACCESS_RESTAURANT, PERMISSIONS.MANAGE_ATTENDANCE] },
  { id: 'my-biz',     title: 'My Businesses',  route: 'MyBusinesses', icon: suppliersIcon, permission: PERMISSIONS.MANAGE_BUSINESSES },

  // ── Doctor portal (role: doctor) — mirrors the web doctor portal exactly ──────
  { id: 'doctor-dashboard',    title: 'Dashboard',    route: 'DoctorDashboard',    icon: dashIcon,      doctorOnly: true },
  { id: 'doctor-appointments', title: 'Appointments', route: 'DoctorAppointments', icon: ordersIcon,    doctorOnly: true },
  { id: 'doctor-patients',     title: 'My Patients',  route: 'DoctorPatients',     icon: customersIcon, doctorOnly: true },
  { id: 'doctor-attendance',   title: 'Attendance',   route: 'DoctorAttendance',   icon: reportsIcon,   doctorOnly: true },
  { id: 'pos',        title: 'POS',            route: 'POS',          icon: posIcon,       permission: PERMISSIONS.POS_SALES },

  // ── Inventory (expandable group) ──────────────────────────────────────────────
  {
    id: 'inventory', title: 'Inventory', icon: productsIcon, isGroup: true,
    subItems: [
      { id: 'products',     title: 'Products',     route: 'Products',    icon: productsIcon, permission: PERMISSIONS.MANAGE_PRODUCTS },
      { id: 'misc-charges', title: 'Misc Charges', route: 'MiscCharges', icon: productsIcon, permission: PERMISSIONS.MANAGE_MISC },
      { id: 'categories',   title: 'Categories',   route: 'Categories',  icon: productsIcon, permission: PERMISSIONS.MANAGE_CATEGORIES },
    ],
  },

  // ── CRM ──────────────────────────────────────────────────────────────────────
  { id: 'customers', title: 'Customers', route: 'Customers', icon: customersIcon, permission: PERMISSIONS.MANAGE_CUSTOMERS },
  { id: 'orders',    title: 'Invoices',  route: 'Orders',    icon: ordersIcon,    permission: PERMISSIONS.VIEW_ORDERS },
  { id: 'tickets',   title: 'Tickets',   route: 'Tickets',   icon: ticketsIcon,   permission: PERMISSIONS.CREATE_TICKETS },

  // ── Config (admin-only) ───────────────────────────────────────────────────────
  { id: 'staff', title: 'Employee', route: 'Staff', icon: staffIcon, permission: PERMISSIONS.MANAGE_STAFF },

  // ── Reports & Logs ────────────────────────────────────────────────────────────
  { id: 'reports',       title: 'Reports',       route: 'Reports',      icon: reportsIcon, canShow: p => p.canAny(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_FINANCE_REPORTS) },
  { id: 'multi-branch-view', title: 'Multi-Branch View', route: 'MultiBranchView', icon: reportsIcon, permission: PERMISSIONS.ACCESS_MULTI_BRANCH_VIEW },
  { id: 'advanced-analytics', title: 'Advanced Analytics', route: 'AdvancedAnalytics', icon: reportsIcon, permission: PERMISSIONS.ACCESS_ADVANCED_ANALYTICS, adminOnly: true },
  { id: 'bulk-operations', title: 'Bulk Operations', route: 'BulkOperations', icon: reportsIcon, permission: PERMISSIONS.ACCESS_BULK_OPERATIONS, adminOnly: true },
  { id: 'activity-logs', title: 'Activity Logs', route: 'ActivityLogs', icon: reportsIcon, permission: PERMISSIONS.VIEW_ACTIVITY_LOGS },

  // ── Integrations ─────────────────────────────────────────────────────────────
  // No shared master permission — web gates this by having ANY one platform's code
  // (sidebarItems.ts). manage_ecommerce_integrations isn't granted by any real flow.
  {
    id: 'integrations', title: 'Integrations', route: 'Integrations', icon: rolesIcon, adminOnly: true,
    canShow: p => p.canAny(
      'ecommerce_shopify', 'ecommerce_bigcommerce', 'ecommerce_wix', 'ecommerce_woocommerce',
      'ecommerce_squarespace', 'ecommerce_magento', 'ecommerce_opencart', 'ecommerce_prestashop',
      'ecommerce_amazon', 'ecommerce_ebay', 'ecommerce_tiktokshop', 'ecommerce_etsy', 'ecommerce_walmart',
      'ecommerce_metashops', 'ecommerce_googleshopping', 'ecommerce_daraz', 'ecommerce_lazada', 'ecommerce_shopee',
    ),
  },

  // ── Projects — flat top-level links, matching web exactly (no dropdown group) ──
  { id: 'projects',        title: 'Projects', route: 'Projects',       icon: productsIcon,  permission: PERMISSIONS.MANAGE_PROJECTS },
  { id: 'project-kanban',  title: 'Board',    route: 'ProjectKanban',  icon: productsIcon,  permission: PERMISSIONS.MANAGE_KANBAN },
  { id: 'project-clients', title: 'Clients',  route: 'ProjectClients', icon: customersIcon, permission: PERMISSIONS.MANAGE_CLIENTS },

  // ── Finance (expandable group — trimmed to match web's 3-item dropdown; Finance
  // Dashboard is reached via the top-level Dashboard for finance-type businesses,
  // Expense Categories/Payment Accounts live in Settings, matching web's IA) ──────
  {
    id: 'finance', title: 'Finance', icon: reportsIcon, isGroup: true,
    canShow: p => p.hasAnyFinance(),
    subItems: [
      { id: 'budgets',          title: 'Budgets',          route: 'Budgets',         icon: reportsIcon,   permission: PERMISSIONS.MANAGE_BUDGETS },
      { id: 'expenses',         title: 'Expenses',         route: 'Expenses',        icon: ordersIcon,    permission: PERMISSIONS.MANAGE_EXPENSES },
      { id: 'supplier-bills',   title: 'Supplier Bills',   route: 'SupplierBills',   icon: reportsIcon,   permission: PERMISSIONS.MANAGE_SUPPLIER_BILLS },
      // Not a sidebar item on web either — the top-level "Reports" link points here
      // instead for finance-type businesses. Kept reachable here since mobile's
      // "Reports" link doesn't do that same primaryDashboard-based redirect yet.
      { id: 'finance-reports', title: 'Finance Reports', route: 'FinanceReports', icon: reportsIcon, canShow: p => p.canAny(PERMISSIONS.MANAGE_BUDGETS, PERMISSIONS.MANAGE_PROJECTS, PERMISSIONS.MANAGE_SUPPLIER_BILLS, PERMISSIONS.VIEW_FINANCE_REPORTS, PERMISSIONS.VIEW_REPORTS) },
    ],
  },

  // ── HRMS ──────────────────────────────────────────────────────────────────────
  // Matches web's exact HRMS Dashboard permission array (frontend/src/app/layouts/sidebarItems.ts) —
  // deliberately narrower than the shared hasAnyHRMS()/HRMS_PERMISSIONS used elsewhere (e.g.
  // Settings' HRMS tab), which also includes manage_tasks/manage_transport.
  {
    id: 'hrms-dash', title: 'HRMS Dashboard', route: 'HRMSDashboard', icon: dashIcon, adminOnly: true,
    canShow: p => p.canAny(
      PERMISSIONS.MANAGE_ATTENDANCE, PERMISSIONS.MANAGE_LEAVE, PERMISSIONS.MANAGE_CLAIMS,
      PERMISSIONS.MANAGE_PAYROLL, PERMISSIONS.MANAGE_ANNOUNCEMENTS, PERMISSIONS.MANAGE_DEPARTMENTS,
      PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_INTERNAL_JOBS, PERMISSIONS.MANAGE_DOCUMENTS,
      PERMISSIONS.MANAGE_TRAININGS,
    ),
  },
  { id: 'attendance',     title: 'Attendance',    route: 'HRMSAttendance',    icon: ordersIcon,  permission: PERMISSIONS.MANAGE_ATTENDANCE },
  { id: 'hrms-leave',     title: 'Leave',         route: 'HRMSLeave',         icon: ordersIcon,  permission: PERMISSIONS.MANAGE_LEAVE },
  { id: 'hrms-claims',    title: 'Claims',        route: 'HRMSClaims',        icon: reportsIcon, permission: PERMISSIONS.MANAGE_CLAIMS },
  { id: 'hrms-announce',  title: 'Announcements', route: 'HRMSAnnouncements', icon: chatIcon,    permission: PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { id: 'hrms-payroll',   title: 'Payroll',       route: 'HRMSPayroll',       icon: reportsIcon, permission: PERMISSIONS.MANAGE_PAYROLL },
  { id: 'hrms-salary-advances', title: 'Salary Advances', route: 'HRMSSalaryAdvances', icon: reportsIcon, permission: PERMISSIONS.MANAGE_PAYROLL },
  { id: 'hrms-fines',     title: 'Fines',         route: 'HRMSFines',         icon: reportsIcon, permission: PERMISSIONS.MANAGE_PAYROLL },
  { id: 'hrms-tasks',     title: 'Tasks',         route: 'HRMSTasks',         icon: ticketsIcon, permission: PERMISSIONS.MANAGE_TASKS },
  { id: 'hrms-reviews',   title: 'Annual Reviews',route: 'HRMSReviews',       icon: reportsIcon, permission: PERMISSIONS.MANAGE_REVIEWS },
  { id: 'hrms-jobs',      title: 'Job Board',     route: 'HRMSJobBoard',      icon: staffIcon,   permission: PERMISSIONS.MANAGE_INTERNAL_JOBS },
  { id: 'hrms-docs',      title: 'Documents',     route: 'HRMSDocuments',     icon: ordersIcon,  permission: PERMISSIONS.MANAGE_DOCUMENTS },
  { id: 'hrms-trainings', title: 'Trainings',     route: 'HRMSTrainings',     icon: productsIcon,permission: PERMISSIONS.MANAGE_TRAININGS },
  { id: 'departments',    title: 'Departments',   route: 'Departments',       icon: rolesIcon,   permission: PERMISSIONS.MANAGE_DEPARTMENTS },
  { id: 'org-chart',      title: 'Org. Chart',    route: 'OrgChart',          icon: staffIcon,   permission: PERMISSIONS.MANAGE_STAFF },
  { id: 'team-chat',      title: 'Team Chat',     route: 'TeamChat',         icon: chatIcon,    permission: PERMISSIONS.INTERNAL_CHAT },

  // ── Vendor / Marketplace ──────────────────────────────────────────────────────
  { id: 'marketplace',     title: 'Marketplace',     route: 'Marketplace',    icon: productsIcon,  permission: PERMISSIONS.ACCESS_VENDOR_BUYER },
  { id: 'vendor-orders',   title: 'My Orders',       route: 'VendorOrders',   icon: ordersIcon,    permission: PERMISSIONS.ACCESS_VENDOR_BUYER },
  { id: 'vendor-dashboard', title: 'Vendor Dashboard', route: 'VendorDashboard', icon: dashIcon,     permission: PERMISSIONS.ACCESS_VENDOR_SELLER },
  { id: 'vendor-profile',  title: 'Vendor Profile',  route: 'VendorProfile',  icon: suppliersIcon, permission: PERMISSIONS.ACCESS_VENDOR_SELLER },
  { id: 'vendor-listings', title: 'My Listings',     route: 'VendorListings', icon: productsIcon,  permission: PERMISSIONS.ACCESS_VENDOR_SELLER },
  { id: 'incoming-orders', title: 'Incoming Orders', route: 'IncomingOrders', icon: ordersIcon,    permission: PERMISSIONS.ACCESS_VENDOR_SELLER },

  // ── Specialty: Medical ────────────────────────────────────────────────────────
  { id: 'medical-dash',    title: 'Medical Dashboard',  route: 'MedicalDashboard',    icon: dashIcon,      permission: PERMISSIONS.ACCESS_MEDICAL },
  { id: 'appointments',    title: 'Appointments',       route: 'Appointments',        icon: ordersIcon,    permission: PERMISSIONS.MANAGE_APPOINTMENTS },
  { id: 'patients',        title: 'Patients',           route: 'Patients',            icon: customersIcon, permission: PERMISSIONS.MANAGE_PATIENTS },
  { id: 'doctors',         title: 'Doctors',            route: 'Doctors',             icon: staffIcon,     permission: PERMISSIONS.MANAGE_DOCTORS },
  // Staff-only on web — business owners don't get a dedicated Appointment Types link.
  { id: 'appt-types',      title: 'Appointment Types',  route: 'AppointmentTypes',    icon: rolesIcon,     permission: PERMISSIONS.ACCESS_MEDICAL, staffOnly: true },
  { id: 'medical-reminders', title: 'Reminders',        route: 'MedicalReminders',    icon: ticketsIcon,   permission: PERMISSIONS.ACCESS_MEDICAL_REMINDERS },
  { id: 'medical-insurance', title: 'Insurance',        route: 'MedicalInsurance',    icon: reportsIcon,   permission: PERMISSIONS.ACCESS_MEDICAL_INSURANCE },
  { id: 'patient-tracking',  title: 'Patient Tracking', route: 'PatientTracking',     icon: customersIcon, permission: PERMISSIONS.ACCESS_MEDICAL_PATIENT_TRACKING },

  // ── Specialty: Restaurant ─────────────────────────────────────────────────────
  { id: 'restaurant-dash',   title: 'Restaurant Dashboard', route: 'RestaurantDashboard', icon: dashIcon,     permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-menu',   title: 'Menu',                 route: 'RestaurantMenu',      icon: productsIcon, permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-tables', title: 'Tables',               route: 'RestaurantTables',    icon: rolesIcon,    permission: PERMISSIONS.ACCESS_RESTAURANT },
  { id: 'restaurant-orders', title: 'Orders',    route: 'RestaurantOrders',    icon: ordersIcon,   permission: PERMISSIONS.ACCESS_RESTAURANT },

  // ── Specialty: Factory ────────────────────────────────────────────────────────
  { id: 'factory-medicines',   title: 'Medicines',   route: 'FactoryMedicines',   icon: productsIcon, permission: PERMISSIONS.ACCESS_FACTORY },
  { id: 'factory-orders',      title: 'Order Inbox', route: 'FactoryOrderInbox',  icon: ordersIcon,   permission: PERMISSIONS.ACCESS_FACTORY },
  { id: 'factory-connections', title: 'Connections', route: 'FactoryConnections', icon: rolesIcon,    permission: PERMISSIONS.ACCESS_FACTORY },

  // ── Specialty: Pharmacy ───────────────────────────────────────────────────────
  { id: 'pharmacy-factories',   title: 'Browse Factories', route: 'PharmacyFactories',   icon: suppliersIcon, permission: PERMISSIONS.ACCESS_PHARMACY },
  { id: 'pharmacy-orders',      title: 'My Orders',    route: 'PharmacyOrders',      icon: ordersIcon,    permission: PERMISSIONS.ACCESS_PHARMACY },
  { id: 'pharmacy-connections', title: 'Connections',      route: 'PharmacyConnections', icon: rolesIcon,     permission: PERMISSIONS.ACCESS_PHARMACY },

  // ── Specialty: Snooker — flat links, matching web (no dropdown group); Session
  // Types has no sidebar entry on web either, still reachable via Settings. gamingModule
  // keeps this mutually exclusive with Arcade below since both share the same permission
  // codes — filterItem only shows it when user.primaryDashboard === 'snooker' ──────
  { id: 'snooker-dashboard', title: 'Snooker Dashboard', route: 'SnookerDashboard', icon: dashIcon,  permission: PERMISSIONS.MANAGE_GAMING_SESSIONS, adminOnly: true, gamingModule: 'snooker' },
  { id: 'snooker-sessions',  title: 'Sessions',          route: 'SnookerSessions',  icon: ordersIcon, permission: PERMISSIONS.MANAGE_GAMING_SESSIONS, adminOnly: true, gamingModule: 'snooker' },
  { id: 'snooker-tables',    title: 'Tables',             route: 'SnookerTables',   icon: rolesIcon,  permission: PERMISSIONS.MANAGE_GAMING_STATIONS, adminOnly: true, gamingModule: 'snooker' },

  // ── Specialty: Arcade — shares the same gaming-stations/sessions permissions as Snooker
  { id: 'arcade-dashboard', title: 'Arcade Dashboard', route: 'ArcadeDashboard', icon: dashIcon,  permission: PERMISSIONS.MANAGE_GAMING_SESSIONS, adminOnly: true, gamingModule: 'arcade' },
  { id: 'arcade-sessions',  title: 'Sessions',         route: 'ArcadeSessions',  icon: ordersIcon, permission: PERMISSIONS.MANAGE_GAMING_SESSIONS, adminOnly: true, gamingModule: 'arcade' },
  { id: 'arcade-stations',  title: 'Stations',         route: 'ArcadeStations',  icon: rolesIcon, permission: PERMISSIONS.MANAGE_GAMING_STATIONS, adminOnly: true, gamingModule: 'arcade' },

  // ── Specialty: Gaming Tickets — prepaid time-based session tickets ───────────
  { id: 'gaming-tickets', title: 'Gaming Tickets', route: 'GamingTickets', icon: ticketsIcon, permission: PERMISSIONS.MANAGE_GAMING_TICKETS, adminOnly: true },

  // ── Lead Management (standalone CRM business — leads without the real-estate module) ──
  {
    id: 'lead-management', title: 'Lead Management', icon: customersIcon, isGroup: true,
    canShow: p => p.can(PERMISSIONS.MANAGE_RE_LEADS) && !p.can(PERMISSIONS.MANAGE_RE_PROPERTIES),
    subItems: [
      { id: 'leads-dashboard', title: 'Dashboard',  route: 'LeadsDashboard', icon: dashIcon,      permission: PERMISSIONS.MANAGE_RE_LEADS, adminOnly: true },
      { id: 'leads-crm',       title: 'Leads / CRM', route: 'RELeads',        icon: customersIcon, permission: PERMISSIONS.MANAGE_RE_LEADS, adminOnly: true },
      { id: 'leads-inbox',     title: 'Inbox',       route: 'EmailInbox',     icon: chatIcon,      permission: PERMISSIONS.MANAGE_RE_LEADS, adminOnly: true },
    ],
  },

  // ── Real Estate (expandable group) — 7 permission-gated sub-modules ──────────
  {
    id: 'real-estate', title: 'Real Estate', icon: suppliersIcon, isGroup: true,
    // Only for actual real-estate businesses (have the Properties module); a leads-only
    // business shows the neutral "Lead Management" group above instead.
    canShow: p => p.hasAnyRealEstate() && p.can(PERMISSIONS.MANAGE_RE_PROPERTIES),
    subItems: [
      { id: 're-dashboard',    title: 'Dashboard',            route: 'REDashboard',     icon: dashIcon,      permission: PERMISSIONS.MANAGE_RE_PROPERTIES, adminOnly: true },
      { id: 're-properties',   title: 'Properties & Units',   route: 'REProperties',    icon: suppliersIcon, permission: PERMISSIONS.MANAGE_RE_PROPERTIES, adminOnly: true },
      { id: 're-leads',        title: 'Leads / CRM',           route: 'RELeads',         icon: customersIcon, permission: PERMISSIONS.MANAGE_RE_LEADS,      adminOnly: true },
      { id: 're-inbox',        title: 'Inbox',                 route: 'EmailInbox',      icon: chatIcon,      permission: PERMISSIONS.MANAGE_RE_LEADS,      adminOnly: true },
      { id: 're-deals',        title: 'Deals & Pipeline',      route: 'REDeals',         icon: rolesIcon,     permission: PERMISSIONS.MANAGE_RE_DEALS,      adminOnly: true },
      { id: 're-leases',       title: 'Leases',                route: 'RELeases',        icon: ordersIcon,    permission: PERMISSIONS.MANAGE_RE_LEASES,     adminOnly: true },
      { id: 're-rent',         title: 'Rent Collection',       route: 'RERentInvoices',  icon: reportsIcon,   permission: PERMISSIONS.MANAGE_RE_RENT,       adminOnly: true },
      { id: 're-maintenance',  title: 'Maintenance Requests',  route: 'REMaintenance',   icon: ticketsIcon,   permission: PERMISSIONS.MANAGE_RE_MAINTENANCE, adminOnly: true },
      { id: 're-viewings',     title: 'Property Viewings',     route: 'REViewings',      icon: dashIcon,      permission: PERMISSIONS.MANAGE_RE_VIEWINGS,   adminOnly: true },
    ],
  },

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
  { id: 'my-announce',    title: 'My Announcements', route: 'MyAnnouncements', icon: chatIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { id: 'my-tasks',       title: 'My Tasks',       route: 'MyTasks',      icon: ticketsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_TASKS },
  { id: 'my-reviews',     title: 'My Reviews',     route: 'MyReviews',    icon: reportsIcon,   staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_REVIEWS },
  { id: 'staff-jobs',     title: 'Job Board',      route: 'StaffJobBoard', icon: staffIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_INTERNAL_JOBS },
  { id: 'my-documents',   title: 'Documents',   route: 'MyDocuments',  icon: ordersIcon,    staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_DOCUMENTS },
  { id: 'my-trainings',   title: 'My Trainings',   route: 'MyTrainings',  icon: productsIcon,  staffOnly: true, ownerPerm: PERMISSIONS.MANAGE_TRAININGS },

  // ── Help ──────────────────────────────────────────────────────────────────────
  { id: 'learn-hub', title: 'Learn & Guides', route: 'LearnHub', icon: chatIcon, adminOnly: true },

  // ── Rider (Delivery) ──────────────────────────────────────────────────────────
  { id: 'rider-dashboard',  title: 'My Dashboard',   route: 'RiderDashboard',  icon: dashIcon,   staffOnly: true, permission: PERMISSIONS.RIDER_ACCESS },
  { id: 'rider-deliveries', title: 'My Deliveries',  route: 'RiderDeliveries', icon: ordersIcon, staffOnly: true, permission: PERMISSIONS.RIDER_ACCESS },
];

// Shared by both super-admin (sees everything, unfiltered) and support-staff (filtered
// by their granted sa_* permission codes) — mirrors web's single allItems array in
// sidebarItems.ts, where super-admin and support-staff share the same item list.
const SUPER_ADMIN_MENU = [
  { id: 'sa-dashboard',      title: 'Dashboard',         route: 'SADashboard',     icon: dashIcon,     permission: 'sa_dashboard' },
  { id: 'sa-businesses',     title: 'Businesses',        route: 'SABusinesses',    icon: productsIcon, permission: 'sa_manage_businesses' },
  { id: 'sa-business-types', title: 'Business Types',    route: 'SABusinessTypes', icon: ordersIcon,   permission: 'sa_manage_business_types' },
  { id: 'sa-business-categories',  title: 'Business Categories', route: 'SABusinessCategories', icon: productsIcon, permission: 'sa_manage_business_categories' },
  { id: 'sa-packages',       title: 'Package Plans',     route: 'SAPackagePlans',  icon: rolesIcon,    permission: 'sa_manage_package_plans' },
  { id: 'sa-custom-plans',         title: 'Custom Plans',        route: 'SACustomPlans',        icon: rolesIcon, permission: 'manage_plans' },
  { id: 'sa-reports',        title: 'Revenue Reports',   route: 'SAReports',       icon: reportsIcon,  permission: 'sa_view_revenue_reports' },
  { id: 'sa-settings',       title: 'Platform Settings', route: 'SASettings',      icon: rolesIcon,    permission: 'sa_manage_settings' },
  { id: 'sa-legal',          title: 'Legal Pages',       route: 'SALegalPages',    icon: ordersIcon,   permission: 'sa_manage_legal_pages' },
  { id: 'sa-documents',      title: 'Documents',         route: 'SADocuments',     icon: reportsIcon,  permission: 'sa_manage_documents' },
  { id: 'sa-vendors',        title: 'Vendors',           route: 'SAVendors',       icon: productsIcon, permission: 'sa_manage_vendors' },
  { id: 'sa-demo-requests',  title: 'Demo Requests',     route: 'SADemoRequests',  icon: ordersIcon,   canShow: p => p.canAny('sa_dashboard', 'sa_manage_demo_requests') },
  { id: 'sa-payment-queue',        title: 'Payment Queue',       route: 'SAPaymentQueue',       icon: ordersIcon, permission: 'sa_manage_payment_queue' },
  { id: 'sa-support',         title: 'Chat Support',  route: 'SASupport',         icon: chatIcon,    canShow: p => p.canAny('chat_support', 'view_customers') },
  { id: 'sa-support-tickets', title: 'Support Tickets',   route: 'SASupportTickets',  icon: ticketsIcon, canShow: p => p.canAny('manage_support_tickets', 'chat_support') },
  { id: 'sa-error-logs',           title: 'Error Logs',          route: 'SAErrorLogs',          icon: reportsIcon, permission: 'monitor_error_logs' },
  { id: 'sa-platform-team',  title: 'Team',     route: 'SAPlatformTeam',  icon: staffIcon,   permission: 'sa_manage_team' },
  { id: 'sa-activity-logs',        title: 'Activity Logs',       route: 'SAActivityLogs',       icon: reportsIcon, permission: 'sa_view_activity_logs' },
  { id: 'sa-learn-guides',         title: 'Manage Guides',        route: 'SALearnGuides',        icon: dashIcon, permission: 'sa_manage_guides' },
  // { id: 'sa-roles',               title: 'SA Roles',            route: 'SARoles',              icon: rolesIcon },
];

const SUPPORT_STAFF_MENU = SUPER_ADMIN_MENU;

// Client portal (role: project-client) — a minimal, fixed menu (matches web client layout).
const CLIENT_MENU = [
  { id: 'client-dashboard', title: 'Dashboard',   route: 'ClientDashboard', icon: dashIcon },
  { id: 'client-projects',  title: 'My Projects',  route: 'ClientProjects',  icon: suppliersIcon },
  { id: 'client-invoices',  title: 'Invoices',     route: 'ClientInvoices',  icon: reportsIcon },
];

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const Sidebar = ({ onClose }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userRole, user } = useAuth();
  const perms = usePermissions();
  const [activeRoute, setActiveRoute] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const supportUnread = useSupportChatUnreadCount(user);

  const toggleGroup = id => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const isDoctorRole = userRole === ROLES.DOCTOR;

  const filterItem = (item, isStaff, isAdmin, permCodes, bizPermCodes) => {
    // A doctor sees ONLY the doctor-portal items; everyone else never sees them.
    if (isDoctorRole) return !!item.doctorOnly;
    if (item.doctorOnly) return false;
    if (isStaff && item.adminOnly)   return false;
    if (isAdmin && item.staffOnly)   return false;
    if (item.canShow && !item.canShow(perms)) return false;
    if (item.gamingModule && item.gamingModule !== user?.primaryDashboard) return false;
    if (item.permission && !perms.can(item.permission)) return false;
    if (item.hideFor && item.hideFor.some(p => permCodes.includes(p))) return false;
    if (item.ownerPerm && bizPermCodes && !bizPermCodes.includes(item.ownerPerm)) return false;
    return true;
  };

  const getMenuItems = () => {
    // True super-admins see everything, unfiltered — matches web (a real super-admin
    // account isn't restricted by sa_* permission codes). Support-staff share the same
    // item list but only see what their granted sa_* permission codes allow.
    if (userRole === ROLES.SUPER_ADMIN) return SUPER_ADMIN_MENU;
    if (userRole === ROLES.PROJECT_CLIENT) return CLIENT_MENU;
    if (userRole === ROLES.SUPPORT_STAFF) {
      return SUPPORT_STAFF_MENU.filter(item => filterItem(item, false, false, user?.permissionCodes ?? [], undefined));
    }

    const isStaff      = perms.isStaff;
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

  const businessInitial = (user?.businessName ?? user?.name ?? 'B')[0].toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, STATUS_BAR_HEIGHT) }]}>
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
            // Expandable section (matches web's AppSidebar): header toggles, subItems
            // only render while expanded, chevron rotates to indicate state.
            const isExpanded = !!expandedGroups[item.id];
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => toggleGroup(item.id)}
                  activeOpacity={0.7}
                >
                  <Image source={item.icon} style={[styles.menuIcon, { tintColor: '#666' }]} />
                  <Text style={styles.menuText}>{item.title}</Text>
                  <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
                </TouchableOpacity>
                {isExpanded && item.subItems.map(sub => {
                  const subActive = activeRoute === sub.route;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.menuItem, styles.subItem, subActive && styles.menuItemActive]}
                      onPress={() => handlePress(sub.route)}
                      activeOpacity={0.7}
                    >
                      <Image source={sub.icon} style={[styles.menuIcon, { tintColor: subActive ? colors.primary : '#666' }]} />
                      <Text style={[styles.menuText, subActive && styles.menuTextActive]}>{sub.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }

          const active = activeRoute === item.route;
          const isSupportItem = item.id === 'sa-support' || item.id === 'support-chat';
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.7}
            >
              <Image source={item.icon} style={[styles.menuIcon, { tintColor: active ? colors.primary : '#666' }]} />
              <Text style={[styles.menuText, active && styles.menuTextActive]}>{item.title}</Text>
              {isSupportItem && supportUnread > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{supportUnread > 99 ? '99+' : supportUnread}</Text>
                </View>
              )}
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
  sectionLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 4, marginHorizontal: 22 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginHorizontal: 10, marginVertical: 1, paddingVertical: 12, borderRadius: 8, gap: 12 },
  menuItemActive: { backgroundColor: colors.primary + '15' },
  menuBadge: { backgroundColor: colors.warning, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  menuBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },
  menuIcon: { width: 20, height: 20, resizeMode: 'contain' },
  menuText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#333', flex: 1 },
  menuTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  chevron: { fontSize: 18, color: '#999', transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  subItem: { marginLeft: 16, paddingLeft: 8 },
  subItemText: { fontSize: 13, color: '#555' },
});

export default Sidebar;
