// Mirror of frontend/src/app/pages/learn/learnGuideKeys.ts (key/label/group only —
// allowedDashboards/requiredAnyPerm only matter for the business-facing Learn page,
// not the super-admin guide manager).
export const GUIDE_KEY_DEFS = [
  // Core
  { key: 'dashboard', label: 'Dashboard', group: 'Core' },
  { key: 'pos', label: 'Point of Sale (POS)', group: 'Core' },
  { key: 'products', label: 'Products & Inventory', group: 'Core' },
  { key: 'categories', label: 'Categories', group: 'Core' },
  { key: 'customers', label: 'Customers', group: 'Core' },
  { key: 'orders', label: 'Invoices & Orders', group: 'Core' },
  { key: 'reports', label: 'Reports & Analytics', group: 'Core' },
  { key: 'tickets', label: 'Ticket System', group: 'Core' },
  { key: 'marketplace', label: 'Wholesale Marketplace', group: 'Core' },
  { key: 'wholesale-orders', label: 'Wholesale Orders', group: 'Core' },
  { key: 'vendor-profile', label: 'Vendor Profile & Listings', group: 'Core' },
  { key: 'billing', label: 'Billing & Plans', group: 'Core' },
  { key: 'my-businesses', label: 'My Businesses & Branches', group: 'Core' },
  { key: 'activity-logs', label: 'Activity Logs', group: 'Core' },

  // Staff & Roles
  { key: 'staff', label: 'Staff Management', group: 'Staff & Roles' },
  { key: 'roles', label: 'Roles & Permissions', group: 'Staff & Roles' },

  // HRMS
  { key: 'hrms-dashboard', label: 'HRMS Dashboard', group: 'HRMS' },
  { key: 'attendance', label: 'Attendance Tracking', group: 'HRMS' },
  { key: 'leave', label: 'Leave Management', group: 'HRMS' },
  { key: 'payroll', label: 'Payroll & Salary Slips', group: 'HRMS' },
  { key: 'claims', label: 'Expense Claims', group: 'HRMS' },
  { key: 'claim-categories', label: 'Claim Categories', group: 'HRMS' },
  { key: 'departments', label: 'Departments', group: 'HRMS' },
  { key: 'announcements', label: 'Announcements', group: 'HRMS' },
  { key: 'tasks', label: 'Tasks', group: 'HRMS' },
  { key: 'reviews', label: 'Annual Reviews', group: 'HRMS' },
  { key: 'internal-jobs', label: 'Internal Jobs', group: 'HRMS' },
  { key: 'hr-documents', label: 'HR Documents', group: 'HRMS' },
  { key: 'trainings', label: 'Trainings', group: 'HRMS' },
  { key: 'fingerprint-devices', label: 'Fingerprint Devices', group: 'HRMS' },
  { key: 'hrms-settings', label: 'HRMS Settings', group: 'HRMS' },

  // Restaurant
  { key: 'restaurant-dashboard', label: 'Restaurant Dashboard', group: 'Restaurant' },
  { key: 'restaurant-menu', label: 'Menu Management', group: 'Restaurant' },
  { key: 'restaurant-orders', label: 'Restaurant Orders', group: 'Restaurant' },
  { key: 'restaurant-tables', label: 'Table Management', group: 'Restaurant' },

  // Medical
  { key: 'medical-dashboard', label: 'Medical Dashboard', group: 'Medical' },
  { key: 'medical-appointments', label: 'Appointments', group: 'Medical' },
  { key: 'medical-patients', label: 'Patients', group: 'Medical' },
  { key: 'medical-doctors', label: 'Doctors', group: 'Medical' },
  { key: 'medical-appointment-types', label: 'Appointment Types', group: 'Medical' },
  { key: 'medical-reminders', label: 'Reminders', group: 'Medical' },
  { key: 'medical-patient-tracking', label: 'Patient Tracking', group: 'Medical' },
  { key: 'medical-insurance', label: 'Insurance', group: 'Medical' },

  // Social Media
  { key: 'social-platforms', label: 'Connected Accounts', group: 'Social Media' },
  { key: 'social-posts', label: 'Posts', group: 'Social Media' },
  { key: 'social-messages', label: 'Messages', group: 'Social Media' },

  // Factory & Pharmacy
  { key: 'factory-medicines', label: 'Factory — Medicines', group: 'Factory & Pharmacy' },
  { key: 'factory-orders', label: 'Factory — Order Inbox', group: 'Factory & Pharmacy' },
  { key: 'factory-connections', label: 'Factory — Connections', group: 'Factory & Pharmacy' },
  { key: 'pharmacy-factories', label: 'Pharmacy — Browse Factories', group: 'Factory & Pharmacy' },
  { key: 'pharmacy-orders', label: 'Pharmacy — My Orders', group: 'Factory & Pharmacy' },
  { key: 'pharmacy-connections', label: 'Pharmacy — Connections', group: 'Factory & Pharmacy' },

  // Finance & Projects
  { key: 'finance-dashboard', label: 'Finance Dashboard', group: 'Finance & Projects' },
  { key: 'projects', label: 'Projects & P&L', group: 'Finance & Projects' },
  { key: 'budgets', label: 'Budgets', group: 'Finance & Projects' },
  { key: 'expenses', label: 'Expenses & Approvals', group: 'Finance & Projects' },
  { key: 'expense-categories', label: 'Expense Categories', group: 'Finance & Projects' },
  { key: 'supplier-bills', label: 'Supplier Bills (AP)', group: 'Finance & Projects' },
  { key: 'finance-reports', label: 'Finance Reports & Team Overview', group: 'Finance & Projects' },

  // Settings
  { key: 'suppliers', label: 'Suppliers', group: 'Settings' },
  { key: 'manufacturers', label: 'Manufacturers', group: 'Settings' },
  { key: 'taxes', label: 'Taxes', group: 'Settings' },
  { key: 'device-conditions', label: 'Device Conditions', group: 'Settings' },
  { key: 'misc-charges', label: 'Misc Charges', group: 'Settings' },
  { key: 'ecommerce-integrations', label: 'E-commerce Integrations', group: 'Settings' },
  { key: 'ticket-statuses', label: 'Ticket Statuses', group: 'Settings' },

  // Super Admin
  { key: 'sa-dashboard', label: 'Platform Dashboard', group: 'Super Admin' },
  { key: 'sa-businesses', label: 'Business Management', group: 'Super Admin' },
  { key: 'sa-package-plans', label: 'Package Plans', group: 'Super Admin' },
  { key: 'sa-business-types', label: 'Business Types', group: 'Super Admin' },
  { key: 'sa-platform-settings', label: 'Platform Settings', group: 'Super Admin' },
  { key: 'sa-revenue-reports', label: 'Revenue Reports', group: 'Super Admin' },
  { key: 'sa-vendors', label: 'Vendors', group: 'Super Admin' },
  { key: 'sa-legal-pages', label: 'Legal Pages', group: 'Super Admin' },
  { key: 'sa-documents', label: 'Documents', group: 'Super Admin' },
  { key: 'sa-team', label: 'Platform Team', group: 'Super Admin' },
  { key: 'sa-activity-logs', label: 'Activity Logs', group: 'Super Admin' },
  { key: 'sa-demo-requests', label: 'Demo Requests', group: 'Super Admin' },
  { key: 'sa-customer-support', label: 'Customer Support', group: 'Super Admin' },
  { key: 'sa-support-tickets', label: 'Support Tickets', group: 'Super Admin' },
  { key: 'sa-payment-requests', label: 'Payment Requests', group: 'Super Admin' },
  { key: 'sa-permissions', label: 'Permissions', group: 'Super Admin' },
  { key: 'sa-roles', label: 'Role Management', group: 'Super Admin' },
  { key: 'sa-error-logs', label: 'Error Logs / Monitoring', group: 'Super Admin' },
  { key: 'sa-business-categories', label: 'Business Categories', group: 'Super Admin' },
];

export const GUIDE_GROUPS = [...new Set(GUIDE_KEY_DEFS.map(d => d.group))];

export const PERMISSION_OPTIONS = [
  { code: 'manage_products', label: 'Products' },
  { code: 'manage_customers', label: 'Customers' },
  { code: 'manage_orders', label: 'Orders / Invoices' },
  { code: 'manage_tickets', label: 'Repair Tickets' },
  { code: 'manage_staff', label: 'Staff' },
  { code: 'manage_reports', label: 'Reports' },
  { code: 'manage_settings', label: 'Settings' },
  { code: 'process_refunds', label: 'Refunds' },
  { code: 'manage_attendance', label: 'Attendance' },
  { code: 'manage_leave', label: 'Leave' },
  { code: 'manage_payroll', label: 'Payroll' },
  { code: 'access_vendor_buyer', label: 'Wholesale / Vendor' },
];
