// Mirrors frontend/src/app/pages/learn/learnGuideKeys.ts — same key/label/group/gating data.
// Guide body content is DB-backed (authored via the Super Admin Learn Guides manager) rather
// than the large hardcoded fallback library on web, since that's static prose, not a UI gap.
export const GUIDE_KEY_DEFS = [
  { key: 'dashboard', label: 'Dashboard', group: 'Core' },
  { key: 'pos', label: 'Point of Sale (POS)', group: 'Core' },
  { key: 'products', label: 'Products & Inventory', group: 'Core' },
  { key: 'categories', label: 'Categories', group: 'Core' },
  { key: 'customers', label: 'Customers', group: 'Core' },
  { key: 'orders', label: 'Invoices & Orders', group: 'Core' },
  { key: 'reports', label: 'Reports & Analytics', group: 'Core' },
  { key: 'tickets', label: 'Ticket System', group: 'Core', requiredAnyPerm: ['create_tickets', 'manage_tickets'] },
  { key: 'marketplace', label: 'Wholesale Marketplace', group: 'Core', requiredAnyPerm: ['access_vendor_buyer'] },
  { key: 'wholesale-orders', label: 'Wholesale Orders', group: 'Core', requiredAnyPerm: ['access_vendor_buyer'] },
  { key: 'vendor-profile', label: 'Vendor Profile & Listings', group: 'Core', requiredAnyPerm: ['access_vendor_seller'] },
  { key: 'billing', label: 'Billing & Plans', group: 'Core' },
  { key: 'my-businesses', label: 'My Businesses & Branches', group: 'Core' },
  { key: 'activity-logs', label: 'Activity Logs', group: 'Core' },

  { key: 'staff', label: 'Staff Management', group: 'Staff & Roles' },
  { key: 'roles', label: 'Roles & Permissions', group: 'Staff & Roles' },

  { key: 'hrms-dashboard', label: 'HRMS Dashboard', group: 'HRMS', requiredAnyPerm: ['manage_attendance', 'manage_leave', 'manage_claims', 'manage_payroll', 'manage_announcements', 'manage_departments', 'manage_reviews', 'manage_internal_jobs', 'manage_documents', 'manage_trainings'] },
  { key: 'attendance', label: 'Attendance Tracking', group: 'HRMS', requiredAnyPerm: ['manage_attendance'] },
  { key: 'leave', label: 'Leave Management', group: 'HRMS', requiredAnyPerm: ['manage_leave'] },
  { key: 'payroll', label: 'Payroll & Salary Slips', group: 'HRMS', requiredAnyPerm: ['manage_payroll'] },
  { key: 'claims', label: 'Expense Claims', group: 'HRMS', requiredAnyPerm: ['manage_claims'] },
  { key: 'claim-categories', label: 'Claim Categories', group: 'HRMS', requiredAnyPerm: ['manage_claims'] },
  { key: 'departments', label: 'Departments', group: 'HRMS', requiredAnyPerm: ['manage_departments'] },
  { key: 'announcements', label: 'Announcements', group: 'HRMS', requiredAnyPerm: ['manage_announcements'] },
  { key: 'tasks', label: 'Tasks', group: 'HRMS', requiredAnyPerm: ['manage_tasks'] },
  { key: 'reviews', label: 'Annual Reviews', group: 'HRMS', requiredAnyPerm: ['manage_reviews'] },
  { key: 'internal-jobs', label: 'Internal Jobs', group: 'HRMS', requiredAnyPerm: ['manage_internal_jobs'] },
  { key: 'hr-documents', label: 'HR Documents', group: 'HRMS', requiredAnyPerm: ['manage_documents'] },
  { key: 'trainings', label: 'Trainings', group: 'HRMS', requiredAnyPerm: ['manage_trainings'] },
  { key: 'fingerprint-devices', label: 'Fingerprint Devices', group: 'HRMS', requiredAnyPerm: ['manage_attendance'] },

  { key: 'restaurant-dashboard', label: 'Restaurant Dashboard', group: 'Restaurant', requiredAnyPerm: ['access_restaurant'] },
  { key: 'restaurant-menu', label: 'Menu Management', group: 'Restaurant', requiredAnyPerm: ['access_restaurant'] },
  { key: 'restaurant-orders', label: 'Restaurant Orders', group: 'Restaurant', requiredAnyPerm: ['access_restaurant'] },
  { key: 'restaurant-tables', label: 'Table Management', group: 'Restaurant', requiredAnyPerm: ['access_restaurant'] },

  { key: 'medical-dashboard', label: 'Medical Dashboard', group: 'Medical', requiredAnyPerm: ['access_medical'] },
  { key: 'medical-appointments', label: 'Appointments', group: 'Medical', requiredAnyPerm: ['access_medical'] },
  { key: 'medical-patients', label: 'Patients', group: 'Medical', requiredAnyPerm: ['access_medical'] },
  { key: 'medical-doctors', label: 'Doctors', group: 'Medical', requiredAnyPerm: ['access_medical'] },
  { key: 'medical-appointment-types', label: 'Appointment Types', group: 'Medical', requiredAnyPerm: ['access_medical'] },
  { key: 'medical-reminders', label: 'Reminders', group: 'Medical', requiredAnyPerm: ['access_medical_reminders'] },
  { key: 'medical-patient-tracking', label: 'Patient Tracking', group: 'Medical', requiredAnyPerm: ['access_medical_patient_tracking'] },
  { key: 'medical-insurance', label: 'Insurance', group: 'Medical', requiredAnyPerm: ['access_medical_insurance'] },

  { key: 'social-platforms', label: 'Connected Accounts', group: 'Social Media', requiredAnyPerm: ['access_facebook', 'access_instagram', 'access_whatsapp'] },
  { key: 'social-posts', label: 'Posts', group: 'Social Media', requiredAnyPerm: ['access_facebook', 'access_instagram', 'access_whatsapp'] },
  { key: 'social-messages', label: 'Messages', group: 'Social Media', requiredAnyPerm: ['access_facebook', 'access_instagram', 'access_whatsapp'] },

  { key: 'factory-medicines', label: 'Factory — Medicines', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_factory'] },
  { key: 'factory-orders', label: 'Factory — Order Inbox', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_factory'] },
  { key: 'factory-connections', label: 'Factory — Connections', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_factory'] },
  { key: 'pharmacy-factories', label: 'Pharmacy — Browse Factories', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_pharmacy'] },
  { key: 'pharmacy-orders', label: 'Pharmacy — My Orders', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_pharmacy'] },
  { key: 'pharmacy-connections', label: 'Pharmacy — Connections', group: 'Factory & Pharmacy', requiredAnyPerm: ['access_pharmacy'] },

  { key: 'projects', label: 'Projects & P&L', group: 'Finance & Projects', requiredAnyPerm: ['manage_projects'] },
  { key: 'budgets', label: 'Budgets', group: 'Finance & Projects', requiredAnyPerm: ['manage_budgets'] },
  { key: 'expenses', label: 'Expenses & Approvals', group: 'Finance & Projects', requiredAnyPerm: ['manage_budgets'] },
  { key: 'expense-categories', label: 'Expense Categories', group: 'Finance & Projects', requiredAnyPerm: ['manage_budgets'] },
  { key: 'supplier-bills', label: 'Supplier Bills (AP)', group: 'Finance & Projects', requiredAnyPerm: ['manage_supplier_bills'] },
  { key: 'finance-reports', label: 'Finance Reports & Team Overview', group: 'Finance & Projects', requiredAnyPerm: ['manage_budgets', 'manage_projects', 'manage_supplier_bills', 'view_finance_reports'] },

  { key: 'suppliers', label: 'Suppliers', group: 'Settings' },
  { key: 'manufacturers', label: 'Manufacturers', group: 'Settings' },
  { key: 'taxes', label: 'Taxes', group: 'Settings' },
  { key: 'device-conditions', label: 'Device Conditions', group: 'Settings' },
  { key: 'misc-charges', label: 'Misc Charges', group: 'Settings' },
  { key: 'ecommerce-integrations', label: 'E-commerce Integrations', group: 'Settings' },
  { key: 'ticket-statuses', label: 'Ticket Statuses', group: 'Settings', requiredAnyPerm: ['create_tickets', 'manage_tickets'] },
];

export const ADMIN_GUIDE_GROUPS = [
  'Core', 'Finance & Projects', 'Staff & Roles', 'HRMS', 'Restaurant',
  'Medical', 'Social Media', 'Factory & Pharmacy', 'Settings',
];
