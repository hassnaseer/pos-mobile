import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ROLES, PERMISSIONS, SOCIAL_PERMISSIONS, HRMS_PERMISSIONS, FINANCE_PERMISSIONS, SNOOKER_PERMISSIONS,
  isSuperAdmin, isAdmin, isAdminOrSuperAdmin,
  hasPermission, hasAnyPermission,
} from '../utils/permissions';

export const usePermissions = () => {
  const { user, userRole } = useAuth();
  const permissionCodes = user?.permissionCodes ?? [];

  const utils = useMemo(() => ({
    role: userRole,
    permissionCodes,
    isSuperAdmin:        isSuperAdmin(userRole),
    isAdmin:             isAdmin(userRole),
    isAdminOrSuperAdmin: isAdminOrSuperAdmin(userRole),
    isSupportStaff:      userRole === ROLES.SUPPORT_STAFF,
    isStaff:             userRole === ROLES.STAFF,

    can: permCode => {
      if (isSuperAdmin(userRole)) return true;
      return hasPermission(permissionCodes, permCode);
    },
    canAny: (...codes) => {
      if (isSuperAdmin(userRole)) return true;
      return hasAnyPermission(permissionCodes, codes.flat());
    },

    canUsePOS:           () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.POS_SALES),
    canViewOrders:       () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_ORDERS),
    canProcessRefunds:   () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.PROCESS_REFUNDS),
    canManageProducts:   () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_PRODUCTS),
    canManageCategories: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_CATEGORIES),
    canManageMisc:       () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_MISC),
    canManageCustomers:  () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_CUSTOMERS),
    canCreateTickets:    () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.CREATE_TICKETS),
    canManageStaff:      () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_STAFF),
    canManageBusinesses: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_BUSINESSES),
    canViewReports:      () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_REPORTS),
    canViewActivityLogs: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_ACTIVITY_LOGS),
    canManageEcommerce:  () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_ECOMMERCE),
    canAccessVendorBuyer:  () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_VENDOR_BUYER),
    canAccessVendorSeller: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_VENDOR_SELLER),
    canAccessVendor:       () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_VENDOR_BUYER) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_VENDOR_SELLER),
    canManageAttendance: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_ATTENDANCE),
    hasAnyHRMS:          () => isSuperAdmin(userRole) || hasAnyPermission(permissionCodes, HRMS_PERMISSIONS),
    hasAnySocial:        () => isSuperAdmin(userRole) || hasAnyPermission(permissionCodes, SOCIAL_PERMISSIONS),
    canAccessMedical:       () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_MEDICAL),
    canManagePrescriptions: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_PRESCRIPTIONS),
    canAccessRestaurant:    () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_RESTAURANT),
    canAccessFactory:       () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_FACTORY),
    canAccessPharmacy:      () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.ACCESS_PHARMACY),
    canManageBudgets:         () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_BUDGETS),
    canManageExpenses:        () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_EXPENSES),
    canManageSupplierBills:   () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_SUPPLIER_BILLS),
    canManagePaymentAccounts: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_PAYMENT_ACCOUNTS),
    canManageProjects:        () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_PROJECTS),
    canViewFinanceReports:    () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.VIEW_FINANCE_REPORTS),
    hasAnyFinance:            () => isSuperAdmin(userRole) || hasAnyPermission(permissionCodes, FINANCE_PERMISSIONS),
    canManageSnookerSessions: () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_SNOOKER_SESSIONS),
    canManageSnookerTables:   () => isSuperAdmin(userRole) || hasPermission(permissionCodes, PERMISSIONS.MANAGE_SNOOKER_TABLES),
    hasAnySnooker:            () => isSuperAdmin(userRole) || hasAnyPermission(permissionCodes, SNOOKER_PERMISSIONS),
  }), [user, userRole, permissionCodes.join(',')]);

  return utils;
};

export default usePermissions;
