// Vendixs RBAC — permission codes exactly match web frontend + backend

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  SUPER_ADMIN: 'super-admin',
  SUPPORT_STAFF: 'support-staff',
};

// These codes MUST match the values stored in the database (from web frontend sidebarItems.ts)
export const PERMISSIONS = {
  // ── POS / Sales ──────────────────────────────────────────────────────────────
  POS_SALES:              'pos_sales',
  VIEW_ORDERS:            'view_orders',
  PROCESS_REFUNDS:        'process_refunds',

  // ── Inventory ────────────────────────────────────────────────────────────────
  MANAGE_PRODUCTS:        'manage_products',
  VIEW_PRODUCTS:          'view_products',
  MANAGE_CATEGORIES:      'manage_categories',
  MANAGE_MISC:            'manage_misc',

  // ── Customers / Tickets ──────────────────────────────────────────────────────
  MANAGE_CUSTOMERS:       'manage_customers',
  CREATE_TICKETS:         'create_tickets',
  UPDATE_TICKETS:         'update_tickets',

  // ── Staff / Roles ────────────────────────────────────────────────────────────
  MANAGE_STAFF:           'manage_staff',
  MANAGE_BUSINESSES:      'manage_businesses',
  SYSTEM_SETTINGS:        'system_settings',

  // ── Configuration ────────────────────────────────────────────────────────────
  MANAGE_SUPPLIERS:       'manage_suppliers',
  MANAGE_MANUFACTURERS:   'manage_manufacturers',
  MANAGE_CONDITIONS:      'manage_conditions',
  MANAGE_TAXES:           'manage_taxes',
  MANAGE_DEPARTMENTS:     'manage_departments',

  // ── Reports / Logs ───────────────────────────────────────────────────────────
  VIEW_REPORTS:           'view_reports',
  VIEW_ACTIVITY_LOGS:     'view_activity_logs',

  // ── Integrations ─────────────────────────────────────────────────────────────
  MANAGE_ECOMMERCE:       'manage_ecommerce_integrations',

  // ── HRMS ─────────────────────────────────────────────────────────────────────
  MANAGE_ATTENDANCE:      'manage_attendance',
  MANAGE_LEAVE:           'manage_leave',
  MANAGE_CLAIMS:          'manage_claims',
  MANAGE_PAYROLL:         'manage_payroll',
  MANAGE_ANNOUNCEMENTS:   'manage_announcements',
  MANAGE_TASKS:           'manage_tasks',
  MANAGE_REVIEWS:         'manage_reviews',
  MANAGE_INTERNAL_JOBS:   'manage_internal_jobs',
  MANAGE_DOCUMENTS:       'manage_documents',
  MANAGE_TRAININGS:       'manage_trainings',

  // ── Social Media ─────────────────────────────────────────────────────────────
  // Each platform has its own permission code (matches web frontend exactly)
  ACCESS_FACEBOOK:        'access_facebook',
  ACCESS_INSTAGRAM:       'access_instagram',
  ACCESS_WHATSAPP:        'access_whatsapp',

  // ── Specialty modules ────────────────────────────────────────────────────────
  ACCESS_MEDICAL:         'access_medical',
  ACCESS_RESTAURANT:      'access_restaurant',
  ACCESS_FACTORY:         'access_factory',
  ACCESS_PHARMACY:        'access_pharmacy',
  ACCESS_VENDOR_BUYER:    'access_vendor_buyer',
  ACCESS_VENDOR_SELLER:   'access_vendor_seller',

  // ── Devices ──────────────────────────────────────────────────────────────────
  DEVICE_ATTENDANCE:      'device_attendance',
};

export const isSuperAdmin    = role => role === ROLES.SUPER_ADMIN;
export const isAdmin         = role => role === ROLES.ADMIN;
export const isSupportStaff  = role => role === ROLES.SUPPORT_STAFF;
export const isStaff         = role => role === ROLES.STAFF;

export const isAdminOrSuperAdmin = role =>
  role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

export const hasPermission = (permissionCodes, code) => {
  if (!Array.isArray(permissionCodes)) return false;
  return permissionCodes.includes(code);
};

export const hasAnyPermission = (permissionCodes, codes) => {
  if (!Array.isArray(permissionCodes)) return false;
  return codes.some(c => permissionCodes.includes(c));
};

export const canAccess = (role, permissionCodes, permCode) => {
  if (isSuperAdmin(role)) return true;
  return hasPermission(permissionCodes, permCode);
};

// Convenience: check if user has any social-media access
export const SOCIAL_PERMISSIONS = [
  PERMISSIONS.ACCESS_FACEBOOK,
  PERMISSIONS.ACCESS_INSTAGRAM,
  PERMISSIONS.ACCESS_WHATSAPP,
];

// HRMS management permission codes (any one grants HRMS Dashboard access)
export const HRMS_PERMISSIONS = [
  PERMISSIONS.MANAGE_ATTENDANCE,
  PERMISSIONS.MANAGE_LEAVE,
  PERMISSIONS.MANAGE_CLAIMS,
  PERMISSIONS.MANAGE_PAYROLL,
  PERMISSIONS.MANAGE_ANNOUNCEMENTS,
  PERMISSIONS.MANAGE_DEPARTMENTS,
  PERMISSIONS.MANAGE_TASKS,
  PERMISSIONS.MANAGE_REVIEWS,
  PERMISSIONS.MANAGE_INTERNAL_JOBS,
  PERMISSIONS.MANAGE_DOCUMENTS,
  PERMISSIONS.MANAGE_TRAININGS,
];
