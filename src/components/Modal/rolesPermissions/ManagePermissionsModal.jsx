import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import colors from '../../../theme/colors';

// Import icons
const closeIcon = require('../../../assets/icons/cross-icon.png');
const arrowDownIcon = require('../../../assets/icons/arrow-down.png');
const usersIcon = require('../../../assets/icons/users-01.png');
const layersIcon = require('../../../assets/icons/layers-01.png');
const salesOfferIcon = require('../../../assets/icons/file-02.png');
const constructionIcon = require('../../../assets/icons/git-branch-01.png');
const upcomingIcon = require('../../../assets/icons/calendar-check.png');
const installmentIcon = require('../../../assets/icons/bank-note-02.png');
const rolesIcon = require('../../../assets/icons/git-branch-01.png');

// Module mapping: API key to module ID and display name
const MODULE_MAPPING = {
  lead_management: { id: 1, name: 'Lead Management' },
  inventory_management: { id: 2, name: 'Inventory Management' },
  client_and_spa_management: { id: 3, name: 'Client & SPA Management' },
  construction_updates: { id: 4, name: 'Construction Updates' },
  upcoming_projects: { id: 5, name: 'Upcoming Projects' },
  installment_management: { id: 6, name: 'Installment Management' },
  roles_and_permissions: { id: 7, name: 'Roles & Permissions' },
};

const MODULE_ICONS = {
  'Lead Management': usersIcon,
  'Inventory Management': layersIcon,
  'Client & SPA Management': salesOfferIcon,
  'Construction Updates': constructionIcon,
  'Upcoming Projects': upcomingIcon,
  'Installment Management': installmentIcon,
  'Roles & Permissions': rolesIcon,
};

// Transform API response to internal format
const transformApiDataToInternal = (apiModules) => {
  if (!apiModules || !Array.isArray(apiModules)) return [];

  return apiModules.map((module) => ({
    module_id: MODULE_MAPPING[module.module]?.id || 0,
    module: MODULE_MAPPING[module.module]?.name || module.module,
    module_key: module.module, // Keep original key for reverse mapping
    allowed: module.allowed,
    permissions: module.permissions || {}
  }));
};

// Transform internal format back to API payload
const transformInternalToApiPayload = (internalModules, userId) => {
  return {
    user_id: userId,
    modules: internalModules.map((module) => ({
      module_id: module.module_id,
      allowed: module.allowed,
      permissions: module.permissions
    }))
  };
};

const ManagePermissionsModal = ({
  visible,
  onClose,
  onSubmit,
  member,
  initialPermissions,
  isLoading
}) => {
  const [expandedModules, setExpandedModules] = useState({});
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (initialPermissions && initialPermissions.length > 0) {
      // Transform API data to internal format
      const transformedData = transformApiDataToInternal(initialPermissions);
      setPermissions(transformedData);
    }
  }, [initialPermissions, visible]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const toggleModuleAllowed = (moduleId) => {
    setPermissions(prev =>
      prev.map(module =>
        module.module_id === moduleId
          ? { ...module, allowed: !module.allowed }
          : module
      )
    );
  };

  const togglePermission = (moduleId, permissionKey) => {
    setPermissions(prev =>
      prev.map(module =>
        module.module_id === moduleId
          ? {
              ...module,
              permissions: {
                ...module.permissions,
                [permissionKey]: !module.permissions[permissionKey]
              }
            }
          : module
      )
    );
  };

  const handleSave = () => {
    if (!member?.id) {
      console.error('No member ID found');
      return;
    }

    // Transform internal format back to API payload
    const payload = transformInternalToApiPayload(permissions, member.id);
    onSubmit(payload);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.permissionModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Can access to:
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={closeIcon} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading permissions...</Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {permissions?.map((module, index) => (
                  <View key={index} style={styles.moduleContainer}>
                    <TouchableOpacity
                      style={styles.moduleHeader}
                      onPress={() => toggleModule(index)}
                    >
                      <View style={styles.moduleHeaderLeft}>
                        <Image
                          source={MODULE_ICONS[module.module] || usersIcon}
                          style={styles.moduleIcon}
                        />
                        <Text style={styles.moduleName}>{module.module}</Text>
                      </View>
                      <View style={styles.moduleHeaderRight}>
                        <Switch
                          value={module.allowed}
                          onValueChange={() => toggleModuleAllowed(module.module_id)}
                          trackColor={{ false: '#E5E5E5', true: colors.primary }}
                          thumbColor={module.allowed ? colors.defaultWhite : '#f4f3f4'}
                        />
                        <Image
                          source={arrowDownIcon}
                          style={[
                            styles.arrowIcon,
                            expandedModules[index] && styles.arrowIconExpanded
                          ]}
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedModules[index] && module?.permissions && (
                      <View style={styles.permissionsContainer}>
                        {Object.entries(module.permissions || {}).map(([key, value]) => (
                          <View key={key} style={styles.permissionRow}>
                            <Text style={[
                              styles.permissionText,
                              !module.allowed && styles.permissionTextDisabled
                            ]}>
                              {key.replace(/_/g, ' ')}
                            </Text>
                            <Switch
                              value={value}
                              onValueChange={() => togglePermission(module.module_id, key)}
                              trackColor={{ false: '#E5E5E5', true: colors.primary }}
                              thumbColor={value ? colors.defaultWhite : '#f4f3f4'}
                              disabled={!module.allowed}
                            />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  permissionModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: colors.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  moduleContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIcon: {
    width: 20,
    height: 20,
    tintColor: colors.text,
    marginRight: 12,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  moduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: colors.text,
    transform: [{ rotate: '0deg' }],
  },
  arrowIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  permissionsContainer: {
    backgroundColor: colors.defaultWhite,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  permissionText: {
    fontSize: 14,
    color: colors.text,
    textTransform: 'capitalize',
  },
  permissionTextDisabled: {
    color: colors.secondary,
    opacity: 0.5,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManagePermissionsModal;
