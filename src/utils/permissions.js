export const MODULES = {
  LEAD_MANAGEMENT: 'lead_management',
  INVENTORY_MANAGEMENT: 'inventory_management',
  CLIENT_AND_SPA_MANAGEMENT: 'client_and_spa_management',
  CONSTRUCTION_UPDATES: 'construction_updates',
  UPCOMING_PROJECTS: 'upcoming_projects',
  INSTALLMENT_MANAGEMENT: 'installment_management',
  ROLES_AND_PERMISSIONS: 'roles_and_permissions',
};

export const PERMISSIONS = {
  // Lead Management
  LEAD_MANAGEMENT: {
    CAN_DELETE_LEAD: 'can_delete_lead',
    CAN_SEND_OFFER: 'can_send_offer',
    CAN_VIEW_OFFER: 'can_view_offer',
    CAN_UPDATE_STATUS: 'can_update_status',
    CAN_SEND_SPA: 'can_send_spa',
    CAN_DELETE_OFFER: 'can_delete_offer',
    CAN_VIEW_OFFER_PDF: 'can_view_offer_pdf',
    CAN_CONVERT_TO_CLIENT: 'can_convert_to_client',
    CAN_DOWNLOAD_SPA: 'can_download_spa',
  },
  // Inventory Management
  INVENTORY_MANAGEMENT: {
    CAN_EDIT_UNIT: 'can_edit_unit',
    CAN_DELETE_UNIT: 'can_delete_unit',
    CAN_CREATE_PROJECT: 'can_create_project',
  },
  // Client and SPA Management
  CLIENT_AND_SPA_MANAGEMENT: {
    CAN_SEND_OFFER: 'can_send_offer',
    CAN_UPDATE_STATUS: 'can_update_status',
    CAN_SEND_SPA: 'can_send_spa',
    CAN_DELETE_OFFER: 'can_delete_offer',
    CAN_VIEW_OFFER_PDF: 'can_view_offer_pdf',
    CAN_EDIT_CLIENT: 'can_edit_client',
    CAN_DELETE_CLIENT: 'can_delete_client',
    CAN_CREATE_CLIENT: 'can_create_client',
    CAN_VIEW_SALES_OFFER: 'can_view_sales_offer',
    CAN_ASSIGN_PROJECT: 'can_assign_project',
    CAN_DOWNLOAD_SPA: 'can_download_spa',
  },
  // Construction Updates
  CONSTRUCTION_UPDATES: {
    CAN_VIEW_UPDATE_DETAILS: 'can_view_update_details',
    CAN_UPLOAD_UPDATE: 'can_upload_update',
    CAN_DELETE_UPDATE: 'can_delete_update',
    CAN_EDIT_UPDATE: 'can_edit_update',
    CAN_DOWNLOAD_PDF: 'can_download_pdf',
  },
  // Upcoming Projects
  UPCOMING_PROJECTS: {
    CAN_UPLOAD_PROJECT: 'can_upload_project',
    CAN_DELETE_PROJECT: 'can_delete_project',
    CAN_DOWNLOAD_PDF: 'can_download_pdf',
  },
  // Installment Management
  INSTALLMENT_MANAGEMENT: {
    CAN_VIEW_INSTALLMENT_DETAILS: 'can_view_installment_details',
    CAN_GENERATE_INVOICE: 'can_generate_invoice',
    CAN_VIEW_INVOICE: 'can_view_invoice',
    CAN_DELETE_INVOICE: 'can_delete_invoice',
    CAN_SEND_INVOICE: 'can_send_invoice',
  },
  // Roles and Permissions
  ROLES_AND_PERMISSIONS: {
    CAN_EDIT_ACCESS: 'can_edit_access',
    CAN_VIEW_PERMISSIONS: 'can_view_permissions',
    CAN_EDIT_USER: 'can_edit_user',
    CAN_DELETE_USER: 'can_delete_user',
    CAN_ADD_USER: 'can_add_user',
    CAN_EDIT_PERMISSIONS: 'can_edit_permissions',
  },
};

export const hasModuleAccess = (userModules, moduleName, userRole = null) => {
  // Client role has full access to all client features, no permission checks needed
  if (userRole && userRole.toLowerCase() === 'client') {
    return true;
  }

  if (!userModules || !Array.isArray(userModules)) {
    return false;
  }

  const module = userModules.find(m => m.module === moduleName);
  return module ? module.allowed : false;
};

export const hasPermission = (userModules, moduleName, permissionKey, userRole = null) => {
  // Client role has full access to all client features, no permission checks needed
  if (userRole && userRole.toLowerCase() === 'client') {
    return true;
  }

  if (!userModules || !Array.isArray(userModules)) {
    return false;
  }

  const module = userModules.find(m => m.module === moduleName);

  if (!module || !module.allowed) {
    return false;
  }

  return module.permissions?.[permissionKey] === true;
};

export const hasAnyPermission = (userModules, moduleName, permissionKeys) => {
  if (!permissionKeys || permissionKeys.length === 0) {
    return false;
  }

  return permissionKeys.some(permissionKey =>
    hasPermission(userModules, moduleName, permissionKey)
  );
};

export const hasAllPermissions = (userModules, moduleName, permissionKeys) => {
  if (!permissionKeys || permissionKeys.length === 0) {
    return false;
  }

  return permissionKeys.every(permissionKey =>
    hasPermission(userModules, moduleName, permissionKey)
  );
};

export const getAccessibleModules = (userModules) => {
  if (!userModules || !Array.isArray(userModules)) {
    return [];
  }

  return userModules
    .filter(module => module.allowed)
    .map(module => module.module);
};

export const getModulePermissions = (userModules, moduleName) => {
  if (!userModules || !Array.isArray(userModules)) {
    return {};
  }

  const module = userModules.find(m => m.module === moduleName);
  return module?.permissions || {};
};
export const isAdmin = (userRole) => {
  if (!userRole) return false;
  const role = userRole.toLowerCase();
  return role === 'superadmin';
};

export const filterMenuByModules = (menuItems, userModules) => {
  if (!menuItems || !Array.isArray(menuItems)) {
    return [];
  }

  if (!userModules || !Array.isArray(userModules)) {
    return [];
  }

  return menuItems.filter(item => {
    // If no module is specified, show the item
    if (!item.module) {
      return true;
    }

    // Check if user has access to the module
    return hasModuleAccess(userModules, item.module);
  });
};

export const canAccessFeature = (userModules, moduleName, permissions, logic = 'OR') => {
  // Check module access first
  if (!hasModuleAccess(userModules, moduleName)) {
    return false;
  }

  // If no specific permissions required, module access is enough
  if (!permissions) {
    return true;
  }

  // Handle single permission
  if (typeof permissions === 'string') {
    return hasPermission(userModules, moduleName, permissions);
  }

  // Handle multiple permissions
  if (Array.isArray(permissions)) {
    return logic === 'AND'
      ? hasAllPermissions(userModules, moduleName, permissions)
      : hasAnyPermission(userModules, moduleName, permissions);
  }

  return false;
};

export const getPermissionDeniedMessage = (moduleName, permissionKey) => {
  const moduleLabels = {
    [MODULES.LEAD_MANAGEMENT]: 'Lead Management',
    [MODULES.INVENTORY_MANAGEMENT]: 'Inventory Management',
    [MODULES.CLIENT_AND_SPA_MANAGEMENT]: 'Client & SPA Management',
    [MODULES.CONSTRUCTION_UPDATES]: 'Construction Updates',
    [MODULES.UPCOMING_PROJECTS]: 'Upcoming Projects',
    [MODULES.INSTALLMENT_MANAGEMENT]: 'Installment Management',
    [MODULES.ROLES_AND_PERMISSIONS]: 'Roles & Permissions',
  };

  const moduleLabel = moduleLabels[moduleName] || moduleName;
  const action = permissionKey?.replace('can_', '').replace(/_/g, ' ') || 'perform this action';

  return `You don't have permission to ${action} in ${moduleLabel}. Please contact your administrator.`;
};
export const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (!error) return defaultMessage;

  // Check for various error message formats
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.detail) return error.detail;
  if (error.error) return error.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.detail) return error.response.data.detail;
  if (error.response?.data?.error) return error.response.data.error;

  return defaultMessage;
};

export const getModuleDisplayName = (moduleName) => {
  const moduleLabels = {
    [MODULES.LEAD_MANAGEMENT]: 'Lead Management',
    [MODULES.INVENTORY_MANAGEMENT]: 'Inventory Management',
    [MODULES.CLIENT_AND_SPA_MANAGEMENT]: 'Client & SPA Management',
    [MODULES.CONSTRUCTION_UPDATES]: 'Construction Updates',
    [MODULES.UPCOMING_PROJECTS]: 'Upcoming Projects',
    [MODULES.INSTALLMENT_MANAGEMENT]: 'Installment Management',
    [MODULES.ROLES_AND_PERMISSIONS]: 'Roles & Permissions',
  };

  return moduleLabels[moduleName] || moduleName;
};
