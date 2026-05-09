import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Switch,
} from 'react-native';
import colors from '../../../../theme/colors';
import Toast from '../../../../components/Toast/Toast';
import AddEditMemberModal from '../../../../components/Modal/rolesPermissions/AddEditMemberModal';
import ManagePermissionsModal from '../../../../components/Modal/rolesPermissions/ManagePermissionsModal';
import ConfirmDeleteModal from '../../../../components/Modal/ConfirmDeleteModal';
import { useSearchStore } from '../../../../store/searchStore';

import {
  useUsers,
  useUserById,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useUserPermissions,
  useAssignPermissions,
} from '../../../../services/api/adminApi';
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

// Import icons
const usersIcon = require('../../../../assets/icons/users-01.png');
const addIcon = require('../../../../assets/icons/user-icon.png');
const editIcon = require('../../../../assets/icons/edit-contained.png');
const deleteIcon = require('../../../../assets/icons/trash-01.png');
const emailIcon = require('../../../../assets/icons/email.png');
const dotsIcon = require('../../../../assets/icons/dots-vertical.png');
const eyeIcon = require('../../../../assets/icons/eye-open.png');

// Member Card Component
const MemberCard = ({
  member,
  onEdit,
  onDelete,
  onViewPermissions,
  onToggleAccess,
  canEdit,
  canDelete,
  canViewPermissions,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{capitalizeWords(member.name)}</Text>
        </View>
        <View style={styles.memberActions}>
          <Switch
            value={member.enable_access}
            onValueChange={() => onToggleAccess(member)}
            trackColor={{ false: '#E5E5E5', true: colors.primary }}
            ios_backgroundColor="#3e3e3e"
            thumbColor={member.enable_access ? colors.defaultWhite : '#f4f3f4'}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              style={styles.actionButton}
            >
              <Image source={dotsIcon} style={styles.dotsIcon} />
            </TouchableOpacity>
            {showMenu && (
              <>
                {canViewPermissions || canEdit || canDelete ? (
                  <View style={styles.menuDropdown}>
                    {canViewPermissions && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          onViewPermissions(member);
                        }}
                      >
                        <Image source={eyeIcon} style={styles.menuIcon} />
                        <Text style={styles.menuText}>View permissions</Text>
                      </TouchableOpacity>
                    )}

                    {canEdit && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          onEdit(member);
                        }}
                      >
                        <Image source={editIcon} style={styles.menuIcon} />
                        <Text style={styles.menuText}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    {canDelete && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          onDelete(member);
                        }}
                      >
                        <Image
                          source={deleteIcon}
                          style={styles.menuIconDelete}
                        />
                        <Text style={styles.menuTextDelete}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.menuDropdown,
                      {
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 50,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.menuText, { color: colors.secondary }]}
                    >
                      No actions available
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.memberDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role Title</Text>
          <Text style={styles.detailValue}>
            {member.role?.charAt(0).toUpperCase() + member.role?.slice(1) ||
              'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{member.email}</Text>
        </View>
      </View>
    </View>
  );
};

// Main Screen Component
const RolesPermissionsScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberForPermissions, setSelectedMemberForPermissions] =
    useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const context = useAuth();
  const { getErrorMessage, hasPermission, canAccess } = usePermissions();
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });

  // Permission checks
  const canViewUsers = canAccess(MODULES.ROLES_AND_PERMISSIONS);
  const canViewPermissions = canAccess(
    MODULES.ROLES_AND_PERMISSIONS,
    PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_VIEW_PERMISSIONS,
  );

  // React Query hooks
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useUsers({ enabled: canViewUsers });
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();
  const assignPermissionsMutation = useAssignPermissions();

  const { data: userData, isLoading: userLoading } = useUserById(
    selectedMemberForPermissions?.id,
    { enabled: !!selectedMemberForPermissions?.id && canViewPermissions },
  );

  const { data: permissionsData, isLoading: permissionsLoading } =
    useUserPermissions(selectedMemberForPermissions?.id, {
      enabled: !!selectedMemberForPermissions?.id && canViewPermissions,
    });
  const members = Array.isArray(usersData) ? usersData : [];
  const [refreshing, setRefreshing] = React.useState(false);
  const searchQuery = useSearchStore(state => state.searchQuery);
  const [fieldErrors, setFieldErrors] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddMember = () => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_ADD_USER,
      )
    ) {
      showToast("You don't have permission to add users", 'error');
      return;
    }
    setSelectedMember(null);
    setIsEditMode(false);
    setShowAddModal(true);
  };

  const handleEditMember = member => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_EDIT_USER,
      )
    ) {
      showToast("You don't have permission to edit users", 'error');
      return;
    }
    setSelectedMember(member);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const handleDeleteMember = member => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_DELETE_USER,
      )
    ) {
      showToast("You don't have permission to delete users", 'error');
      return;
    }
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const confirmDeleteMember = async () => {
    try {
      await deleteMemberMutation.mutateAsync(selectedMember.id);
      showToast('Member deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedMember(null);
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to delete member'), 'error');
      setShowDeleteModal(false);
    }
  };

  const handleViewPermissions = member => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_VIEW_PERMISSIONS,
      )
    ) {
      showToast("You don't have permission to view permissions", 'error');
      return;
    }
    setSelectedMemberForPermissions(member);
    setShowPermissionsModal(true);
  };

  const handleToggleAccess = async member => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_EDIT_ACCESS,
      )
    ) {
      showToast("You don't have permission to edit access", 'error');
      return;
    }

    try {
      await updateMemberMutation.mutateAsync({
        id: member.id,
        data: {
          name: member.name,
          email: member.email,
          role: member.role,
          enable_access: !member.enable_access,
        },
      });
      showToast(
        `Access ${!member.enable_access ? 'enabled' : 'disabled'} for ${
          member.name
        }`,
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to update access'), 'error');
    }
  };

  const handlePermissionsSubmit = async payload => {
    if (
      !hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_EDIT_PERMISSIONS,
      )
    ) {
      showToast("You don't have permission to edit permissions", 'error');
      return;
    }

    try {
      // Payload is already formatted correctly from ManagePermissionsModal
      await assignPermissionsMutation.mutateAsync(payload);
      showToast('Permissions updated successfully', 'success');
      setShowPermissionsModal(false);
      setSelectedMemberForPermissions(null);
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Failed to update permissions'),
        'error',
      );
    }
  };

  const handleMemberSubmit = async formData => {
    console.log('Form data add member', formData);

    try {
      // Check permissions first
      if (
        isEditMode &&
        !hasPermission(
          MODULES.ROLES_AND_PERMISSIONS,
          PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_EDIT_USER,
        )
      ) {
        showToast("You don't have permission to edit users", 'error');
        return;
      }

      if (
        !isEditMode &&
        !hasPermission(
          MODULES.ROLES_AND_PERMISSIONS,
          PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_ADD_USER,
        )
      ) {
        showToast("You don't have permission to add users", 'error');
        return;
      }

      // Prepare payload according to API spec
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }

      if (isEditMode) {
        await updateMemberMutation.mutateAsync({
          id: selectedMember.id,
          data: payload,
        });
        showToast('Member updated successfully', 'success');
      } else {
        // Password is required for creation
        if (!formData.password || formData.password.trim() === '') {
          showToast('Password is required for new members', 'error');
          return;
        }
        await createMemberMutation.mutateAsync(payload);

        showToast('Member added successfully', 'success');
      }

      setShowAddModal(false);
      setSelectedMember(null);
    } catch (error) {
      setFieldErrors(error);
      showToast(
        getErrorMessage(
          error,
          `Failed to ${isEditMode ? 'update' : 'create'} member`,
        ),
        'error',
      );
    }
  };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'success' });
  };

  const getRoleStats = () => {
    if (!Array.isArray(members) || members.length === 0) {
      return {};
    }
    const roleCount = members.reduce((acc, member) => {
      const role = member?.role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    return roleCount;
  };

  const roleStats = getRoleStats();
  // Filter members by name, email, or role
  const filteredMembers = members.filter(
    member =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  // Show no access screen if user doesn't have permission
  if (!canViewUsers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noAccessContainer}>
          <Image
            source={require('../../../../assets/icons/cross-icon.png')}
            style={styles.lockIcon}
          />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have permission to view users and manage roles.
          </Text>
          <Text style={styles.noAccessSubtext}>
            Please contact your administrator for access.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load members</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Roles & Permissions</Text>
      </View>

      {/* Stats Container */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statLeft}>
            <Image source={usersIcon} style={styles.statIcon} />
            <Text style={styles.statLabel}>Total members</Text>
          </View>
          <Text style={styles.statValue}>
            {String(members.length).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching members found' : 'No members found'}
              </Text>
              {!searchQuery && (
                <Text style={styles.emptySubText}>
                  Add your first member to get started
                </Text>
              )}
            </View>
          ) : (
            filteredMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
                onViewPermissions={handleViewPermissions}
                onToggleAccess={handleToggleAccess}
                canEdit={hasPermission(
                  MODULES.ROLES_AND_PERMISSIONS,
                  PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_EDIT_USER,
                )}
                canDelete={hasPermission(
                  MODULES.ROLES_AND_PERMISSIONS,
                  PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_DELETE_USER,
                )}
                canViewPermissions={hasPermission(
                  MODULES.ROLES_AND_PERMISSIONS,
                  PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_VIEW_PERMISSIONS,
                )}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddEditMemberModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedMember(null);
          setFieldErrors('');
        }}
        onSubmit={handleMemberSubmit}
        member={selectedMember}
        isEdit={isEditMode}
        fieldErrors={fieldErrors}
      />

      <ManagePermissionsModal
        visible={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedMemberForPermissions(null);
        }}
        onSubmit={handlePermissionsSubmit}
        member={selectedMemberForPermissions}
        initialPermissions={permissionsData?.modules}
        isLoading={permissionsLoading}
      />

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedMember(null);
        }}
        onConfirm={confirmDeleteMember}
        itemName={selectedMember?.name}
        title="Delete Member"
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      {/* add member button  */}
      {hasPermission(
        MODULES.ROLES_AND_PERMISSIONS,
        PERMISSIONS.ROLES_AND_PERMISSIONS.CAN_ADD_USER,
      ) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddMember}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: colors.defaultWhite,
              fontSize: 28,
              marginBottom: 2,
            }}
          >
            ＋
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    width: 60,
    height: 60,
    tintColor: colors.warning,
  },
  noAccessTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginTop: 20,
    textAlign: 'center',
  },
  noAccessText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  noAccessSubtext: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.warning,
    marginBottom: 16,
    fontFamily: 'Outfit-Regular',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  scrollView: {
    flex: 1,
    position: 'relative',
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    backgroundColor: colors.background,

    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  statsContainer: {
    backgroundColor: colors.background,

    paddingHorizontal: 16,
    // paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },

  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 8,
  },

  statIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: colors.text, // same as your text color
  },

  statLabel: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Medium',
  },

  statValue: {
    fontSize: 20,
    color: colors.primary, // use your brand blue
    fontFamily: 'Outfit-SemiBold',
  },

  addMemberButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addMemberText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  memberCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'visible',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    overflow: 'visible',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
    bottom: 4,
  },
  memberName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    overflow: 'visible',
    bottom: 4,
  },
  menuContainer: {
    position: 'relative',
    overflow: 'visible',
  },
  actionButton: {
    padding: 4,
  },
  dotsIcon: {
    width: 20,
    height: 20,
    tintColor: colors.text,
  },
  menuDropdown: {
    position: 'absolute',
    zIndex: 1000,
    top: 30,
    right: 0,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    width: 18,
    height: 18,
    tintColor: colors.text,
    marginRight: 10,
  },
  menuIconDelete: {
    width: 18,
    height: 18,
    tintColor: colors.warning,
    marginRight: 10,
  },
  menuText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  menuTextDelete: {
    fontSize: 14,
    color: colors.warning,
    fontFamily: 'Outfit-Regular',
  },
  memberDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },

  detailLabel: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Medium',
    width: 90, // fixed width to align labels
  },

  detailValue: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    textAlign: 'left',
    flexShrink: 1,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    tintColor: colors.secondary,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Medium',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default RolesPermissionsScreen;
