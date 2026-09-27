import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ROLES, PERMISSIONS, SOCIAL_PERMISSIONS, HRMS_PERMISSIONS, FINANCE_PERMISSIONS, GAMING_PERMISSIONS,
  REAL_ESTATE_PERMISSIONS,
  isSuperAdmin, isAdmin, isAdminOrSuperAdmin, isStaff,
  hasPermission, hasAnyPermission,
} from '../utils/permissions';

const EMPTY_CODES = [];

export const usePermissions = () => {
  const { user, userRole } = useAuth();
  const permissionCodesKey = user?.permissionCodes?.join(',') ?? '';

  const utils = useMemo(() => {
    const permissionCodes = permissionCodesKey ? permissionCodesKey.split(',') : EMPTY_CODES;
    const isStaffRole = isStaff(userRole);

    // Mirrors web's sidebarItems.ts hasPermission(): an unpopulated permissionCodes
    // array means "not yet restricted" for an admin/owner (graceful full access),
    // but stays restricted (nothing granted) for a staff/employee account.
    const check = code => {
      if (isSuperAdmin(userRole)) return true;
      if (!code) return true;
      if (permissionCodes.length === 0) return !isStaffRole;
      return hasPermission(permissionCodes, code);
    };
    const checkAny = codes => {
      if (isSuperAdmin(userRole)) return true;
      if (!codes || codes.length === 0) return true;
      if (permissionCodes.length === 0) return !isStaffRole;
      return hasAnyPermission(permissionCodes, codes);
    };

    return {
      role: userRole,
      permissionCodes,
      isSuperAdmin:        isSuperAdmin(userRole),
      isAdmin:             isAdmin(userRole),
      isAdminOrSuperAdmin: isAdminOrSuperAdmin(userRole),
      isSupportStaff:      userRole === ROLES.SUPPORT_STAFF,
      isStaff:             isStaffRole,

      can: check,
      canAny: (...codes) => checkAny(codes.flat()),

      canUsePOS:           () => check(PERMISSIONS.POS_SALES),
      canViewOrders:       () => check(PERMISSIONS.VIEW_ORDERS),
      canProcessRefunds:   () => check(PERMISSIONS.PROCESS_REFUNDS),
      canManageProducts:   () => check(PERMISSIONS.MANAGE_PRODUCTS),
      canManageCategories: () => check(PERMISSIONS.MANAGE_CATEGORIES),
      canManageMisc:       () => check(PERMISSIONS.MANAGE_MISC),
      canManageCustomers:  () => check(PERMISSIONS.MANAGE_CUSTOMERS),
      canCreateTickets:    () => check(PERMISSIONS.CREATE_TICKETS),
      canManageStaff:      () => check(PERMISSIONS.MANAGE_STAFF),
      canManageBusinesses: () => check(PERMISSIONS.MANAGE_BUSINESSES),
      canViewReports:      () => check(PERMISSIONS.VIEW_REPORTS),
      canViewActivityLogs: () => check(PERMISSIONS.VIEW_ACTIVITY_LOGS),
      canManageEcommerce:  () => check(PERMISSIONS.MANAGE_ECOMMERCE),
      canAccessVendorBuyer:  () => check(PERMISSIONS.ACCESS_VENDOR_BUYER),
      canAccessVendorSeller: () => check(PERMISSIONS.ACCESS_VENDOR_SELLER),
      canAccessVendor:       () => check(PERMISSIONS.ACCESS_VENDOR_BUYER) || check(PERMISSIONS.ACCESS_VENDOR_SELLER),
      canManageAttendance: () => check(PERMISSIONS.MANAGE_ATTENDANCE),
      hasAnyHRMS:          () => checkAny(HRMS_PERMISSIONS),
      hasAnySocial:        () => checkAny(SOCIAL_PERMISSIONS),
      canAccessMedical:       () => check(PERMISSIONS.ACCESS_MEDICAL),
      canManagePrescriptions: () => check(PERMISSIONS.MANAGE_PRESCRIPTIONS),
      canAccessRestaurant:    () => check(PERMISSIONS.ACCESS_RESTAURANT),
      canAccessFactory:       () => check(PERMISSIONS.ACCESS_FACTORY),
      canAccessPharmacy:      () => check(PERMISSIONS.ACCESS_PHARMACY),
      canManageBudgets:         () => check(PERMISSIONS.MANAGE_BUDGETS),
      canManageExpenses:        () => check(PERMISSIONS.MANAGE_EXPENSES),
      canManageSupplierBills:   () => check(PERMISSIONS.MANAGE_SUPPLIER_BILLS),
      canManagePaymentAccounts: () => check(PERMISSIONS.MANAGE_PAYMENT_ACCOUNTS),
      canManageProjects:        () => check(PERMISSIONS.MANAGE_PROJECTS),
      canViewFinanceReports:    () => check(PERMISSIONS.VIEW_FINANCE_REPORTS),
      hasAnyFinance:            () => checkAny(FINANCE_PERMISSIONS),
      canManageGamingSessions:  () => check(PERMISSIONS.MANAGE_GAMING_SESSIONS),
      canManageGamingStations:  () => check(PERMISSIONS.MANAGE_GAMING_STATIONS),
      hasAnyGaming:             () => checkAny(GAMING_PERMISSIONS),
      canManageGamingTickets:   () => check(PERMISSIONS.MANAGE_GAMING_TICKETS),
      canManageREProperties:    () => check(PERMISSIONS.MANAGE_RE_PROPERTIES),
      canManageRELeads:         () => check(PERMISSIONS.MANAGE_RE_LEADS),
      canManageREDeals:         () => check(PERMISSIONS.MANAGE_RE_DEALS),
      canManageRELeases:        () => check(PERMISSIONS.MANAGE_RE_LEASES),
      canManageRERent:          () => check(PERMISSIONS.MANAGE_RE_RENT),
      canManageREMaintenance:   () => check(PERMISSIONS.MANAGE_RE_MAINTENANCE),
      canManageREViewings:      () => check(PERMISSIONS.MANAGE_RE_VIEWINGS),
      hasAnyRealEstate:         () => checkAny(REAL_ESTATE_PERMISSIONS),
    };
  }, [userRole, permissionCodesKey]);

  return utils;
};

export default usePermissions;
