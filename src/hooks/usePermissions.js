import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  hasModuleAccess,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAccessibleModules,
  getModulePermissions,
  canAccessFeature,
  isAdmin,
  getPermissionDeniedMessage,
  getErrorMessage,
} from '../utils/permissions';

/**
 * Custom hook to access user permissions throughout the app
 *
 * @returns {Object} - Object containing permission checking functions and user data
 *
 * @example
 * const { hasModule, hasPermission, canAccess, isAdmin } = usePermissions();
 *
 * if (hasModule(MODULES.LEAD_MANAGEMENT)) {
 *   // Show lead management module
 * }
 *
 * if (canAccess(MODULES.LEAD_MANAGEMENT, PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_LEAD)) {
 *   // Show delete button
 * }
 */
export const usePermissions = () => {
  const { user, userRole, userModules } = useAuth();

  // Check if user is client (clients bypass all permission checks)
  const isClient = useMemo(() => {
    return userRole?.toLowerCase() === 'client';
  }, [userRole]);

  // Memoize permission checking functions to avoid unnecessary re-calculations
  const permissionUtils = useMemo(() => {
    return {
      /**
       * Check if user has access to a module
       * @param {string} moduleName - Module name from MODULES constant
       * @returns {boolean}
       */
      hasModule: (moduleName) => {
        // Client has access to all client features
        if (isClient) return true;
        // Admin has access to all modules
        if (isAdmin(userRole)) return true;
        return hasModuleAccess(userModules, moduleName, userRole);
      },

      /**
       * Check if user has a specific permission
       * @param {string} moduleName - Module name
       * @param {string} permissionKey - Permission key
       * @returns {boolean}
       */
      hasPermission: (moduleName, permissionKey) => {
        // Client has all permissions for client features
        if (isClient) return true;
        // Admin has all permissions
        if (isAdmin(userRole)) return true;
        return hasPermission(userModules, moduleName, permissionKey, userRole);
      },

      /**
       * Check if user has any of the specified permissions (OR logic)
       * @param {string} moduleName - Module name
       * @param {Array<string>} permissionKeys - Array of permission keys
       * @returns {boolean}
       */
      hasAnyPermission: (moduleName, permissionKeys) => {
        // Client has all permissions
        if (isClient) return true;
        // Admin has all permissions
        if (isAdmin(userRole)) return true;
        return hasAnyPermission(userModules, moduleName, permissionKeys);
      },

      /**
       * Check if user has all of the specified permissions (AND logic)
       * @param {string} moduleName - Module name
       * @param {Array<string>} permissionKeys - Array of permission keys
       * @returns {boolean}
       */
      hasAllPermissions: (moduleName, permissionKeys) => {
        // Client has all permissions
        if (isClient) return true;
        // Admin has all permissions
        if (isAdmin(userRole)) return true;
        return hasAllPermissions(userModules, moduleName, permissionKeys);
      },

      /**
       * Check if user can access a feature (combines module and permission check)
       * @param {string} moduleName - Module name
       * @param {string|Array<string>} permissions - Permission key(s)
       * @param {string} logic - 'AND' or 'OR' for multiple permissions
       * @returns {boolean}
       */
      canAccess: (moduleName, permissions = null, logic = 'OR') => {
        // Client has access to all client features
        if (isClient) return true;
        // Admin has access to everything
        if (isAdmin(userRole)) return true;
        return canAccessFeature(userModules, moduleName, permissions, logic);
      },

      /**
       * Get all accessible modules for current user
       * @returns {Array<string>}
       */
      getAccessibleModules: () => {
        // Admin has access to all modules
        if (isAdmin(userRole)) {
          return [
            'lead_management',
            'inventory_management',
            'client_and_spa_management',
            'construction_updates',
            'upcoming_projects',
            'installment_management',
            'roles_and_permissions',
          ];
        }
        return getAccessibleModules(userModules);
      },

      /**
       * Get all permissions for a specific module
       * @param {string} moduleName - Module name
       * @returns {Object}
       */
      getModulePermissions: (moduleName) => {
        return getModulePermissions(userModules, moduleName);
      },

      /**
       * Check if current user is admin
       * @returns {boolean}
       */
      isAdmin: () => {
        return isAdmin(userRole);
      },

      /**
       * Check if current user is client
       * @returns {boolean}
       */
      isClient: () => {
        return isClient;
      },

      /**
       * Get permission denied message
       * @param {string} moduleName - Module name
       * @param {string} permissionKey - Permission key
       * @returns {string}
       */
      getPermissionDeniedMessage: (moduleName, permissionKey) => {
        return getPermissionDeniedMessage(moduleName, permissionKey);
      },

      /**
       * Extract user-friendly error message from API error
       * @param {Error|Object} error - Error object
       * @param {string} defaultMessage - Default message
       * @returns {string}
       */
      getErrorMessage: (error, defaultMessage = 'An error occurred') => {
        return getErrorMessage(error, defaultMessage);
      },

      /**
       * Get current user info
       */
      user,

      /**
       * Get current user role
       */
      userRole,

      /**
       * Get current user modules
       */
      userModules,
    };
  }, [user, userRole, userModules, isClient]);

  return permissionUtils;
};

export default usePermissions;
