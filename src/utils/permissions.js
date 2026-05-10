// POS System RBAC — permission codes exactly match web frontend + backend

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  SUPER_ADMIN: 'super-admin',
  SUPPORT_STAFF: 'support-staff',
};

// These codes MUST match the values stored in the database (from web frontend Roles.tsx)
export const PERMISSIONS = {
  POS_SALES:              'pos_sales',
  VIEW_ORDERS:            'view_orders',
  PROCESS_REFUNDS:        'process_refunds',
  MANAGE_PRODUCTS:        'manage_products',
  VIEW_PRODUCTS:          'view_products',
  MANAGE_CATEGORIES:      'manage_categories',
  CREATE_TICKETS:         'create_tickets',
  UPDATE_TICKETS:         'update_tickets',
  MANAGE_CUSTOMERS:       'manage_customers',
  VIEW_REPORTS:           'view_reports',
  MANAGE_STAFF:           'manage_staff',
  MANAGE_SUPPLIERS:       'manage_suppliers',
  MANAGE_MANUFACTURERS:   'manage_manufacturers',
  MANAGE_CONDITIONS:      'manage_conditions',
  MANAGE_TAXES:           'manage_taxes',
  MANAGE_MISC:            'manage_misc',
  MANAGE_ECOMMERCE:       'manage_ecommerce_integrations',
  ACCESS_SOCIAL_MEDIA:    'access_social_media',
  ACCESS_MEDICAL:         'access_medical',
  ACCESS_RESTAURANT:      'access_restaurant',
  ACCESS_FACTORY:         'access_factory',
  ACCESS_PHARMACY:        'access_pharmacy',
};

export const isSuperAdmin = role => role === ROLES.SUPER_ADMIN;
export const isAdmin = role => role === ROLES.ADMIN;
export const isSupportStaff = role => role === ROLES.SUPPORT_STAFF;
export const isStaff = role => role === ROLES.STAFF;

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
