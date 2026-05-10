import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ROLES, PERMISSIONS,
  isSuperAdmin, isAdmin, isAdminOrSuperAdmin,
  hasPermission, hasAnyPermission,
} from '../utils/permissions';

export const usePermissions = () => {
  const { user, userRole } = useAuth();
  const permissionCodes = user?.permissionCodes ?? [];

  const utils = useMemo(() => ({
    role: userRole,
    permissionCodes,
    isSuperAdmin: isSuperAdmin(userRole),
    isAdmin: isAdmin(userRole),
    isAdminOrSuperAdmin: isAdminOrSuperAdmin(userRole),
    isSupportStaff: userRole === ROLES.SUPPORT_STAFF,
    isStaff: userRole === ROLES.STAFF,

    can: permCode => {
      if (isSuperAdmin(userRole)) return true;
      return hasPermission(permissionCodes, permCode);
    },

    canAny: (...codes) => {
      if (isSuperAdmin(userRole)) return true;
      return hasAnyPermission(permissionCodes, codes.flat());
    },

    canUsePOS:          () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.POS_SALES),
    canManageProducts:  () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_PRODUCTS),
    canManageCategories:() => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_CATEGORIES),
    canManageCustomers: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_CUSTOMERS),
    canViewOrders:      () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_ORDERS),
    canManageStaff:     () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_STAFF),
    canViewReports:     () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_REPORTS),
    canCreateTickets:   () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.CREATE_TICKETS),
  }), [user, userRole, permissionCodes.join(',')]);

  return utils;
};

export default usePermissions;
