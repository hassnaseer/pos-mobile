import React, { useState } from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
// import Header from '../../../../components/Header/Header';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';
import CreateEditInventoryModal from '../../../../components/Modal/inventoryManagement/CreateEditInventoryModal';
import ConfirmDeleteInventoryModal from '../../../../components/Modal/inventoryManagement/ConfirmDeleteInventoryModal';
import {
  useAllUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from '../../../../services/api/clientApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import {
  MODULES,
  PERMISSIONS,
  getErrorMessage,
} from '../../../../utils/permissions';
import { useSearchStore } from '../../../../store/searchStore';

// Import icons from assets
import moreVertIcon from '../../../../assets/icons/dots-vertical.png';
import buildingIcon from '../../../../assets/icons/layers-01.png';
import apartmentIcon from '../../../../assets/icons/home-line.png';
import rulerIcon from '../../../../assets/icons/ruler.png';
import moneyIcon from '../../../../assets/icons/bank-note-02.png';
import editIcon from '../../../../assets/icons/edit-contained.png';
import deleteIcon from '../../../../assets/icons/trash-01.png';
import errorIcon from '../../../../assets/icons/cross-icon.png';
import inventoryIcon from '../../../../assets/icons/layers-three.png';
import ImageSwiper from '../../../../components/Swiper/Swiper';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

const InventoryCard = ({ item, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [swiperReady, setSwiperReady] = useState(false);
  const onViewVisuals = () => {
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSwiperReady(false);
  };

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#F0FEED';
      case 'reserved':
        return '#FEF9ED';
      case 'sold':
        return '#FEEDED';
      default:
        return '#757575';
    }
  };
  const getStatusColorText = status => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#259800';
      case 'reserved':
        return '#FFC830';
      case 'sold':
        return '#DC2626';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.inventoryCard}>
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.projectName}>{item.project_name}</Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadgeSmall,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColorText(item.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusTextSmall,
                  { color: getStatusColorText(item.status) },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Image source={moreVertIcon} style={styles.icon} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Image source={buildingIcon} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.unit_no}</Text>
          </View>
          <View style={styles.detailRow}>
            <Image source={apartmentIcon} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Image source={rulerIcon} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.size_sqft} sq. ft.</Text>
          </View>
          <View style={styles.detailRow}>
            <Image source={moneyIcon} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {item.price_aed?.toLocaleString()} AED per sq.ft
            </Text>
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.viewVisualsButton}
          onPress={onViewVisuals}
        >
          <Text style={styles.viewVisualsText}>View visuals</Text>
        </TouchableOpacity>

        {/* Modal with Swiper */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>

              {/* ✅ Check if visuals/images exist */}
              {(!item?.visuals || item.visuals.length === 0) &&
              (!item?.images || item.images.length === 0) ? (
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImageText}>No visuals available</Text>
                </View>
              ) : (
                <ImageSwiper
                  images={item.visuals || item.images || []}
                  autoplay={false}
                  style={styles.swiperWrapper}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Dropdown Menu */}
        {showMenu && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onEdit(item);
              }}
            >
              <Image
                source={editIcon}
                style={[styles.menuIcon, { tintColor: colors.primary }]}
              />
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onDelete(item);
              }}
            >
              <Image source={deleteIcon} style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: colors.warning }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const InventoryManagementScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchQuery = useSearchStore(state => state.searchQuery); // serach state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });
  const { hasPermission, getErrorMessage } = usePermissions();
  const { data: inventory, isPending, error, refetch } = useAllUnits();
  //Search global query
  const filteredInventory = inventory?.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.project_name?.toLowerCase().includes(q) ||
      item.unit_no?.toString().toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q)
    );
  });

  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();
  const deleteMutation = useDeleteUnit();
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  const handleCreateNew = () => {
    if (
      !hasPermission(
        MODULES.INVENTORY_MANAGEMENT,
        PERMISSIONS.INVENTORY_MANAGEMENT.CAN_CREATE_PROJECT,
      )
    ) {
      showToast("You don't have permission to create projects", 'error');
      return;
    }

    setEditMode(false);
    setSelectedItem(null);
    setShowCreateModal(true);
  };

  const handleEdit = item => {
    if (
      !hasPermission(
        MODULES.INVENTORY_MANAGEMENT,
        PERMISSIONS.INVENTORY_MANAGEMENT.CAN_EDIT_UNIT,
      )
    ) {
      showToast("You don't have permission to edit units", 'error');
      return;
    }

    setEditMode(true);
    // Transform API data to form data structure
    const formattedItem = {
      id: item.id,
      projectName: item.project_name,
      unitNo: item.unit_no,
      type: item.type,
      size: item.size_sqft,
      price: item.price_aed,
      bedroomType: item.type_of_bedroom,
      visuals: item.visuals || [],
    };
    setSelectedItem(formattedItem);
    setShowCreateModal(true);
  };

  const handleDelete = item => {
    if (
      !hasPermission(
        MODULES.INVENTORY_MANAGEMENT,
        PERMISSIONS.INVENTORY_MANAGEMENT.CAN_DELETE_UNIT,
      )
    ) {
      showToast("You don't have permission to delete units", 'error');
      return;
    }

    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  // const handleViewVisuals = (item) => {
  //   navigation.navigate('ProjectVisuals', { project: item });
  // };

  const handleSubmit = async formData => {
    if (createMutation.isPending || updateMutation.isPending) return; // Prevent multiple API calls

    try {
      // Create FormData for API
      const apiFormData = new FormData();
      apiFormData.append('project_name', formData.projectName);
      apiFormData.append('unit_no', formData.unitNo);
      apiFormData.append('type', formData.type);
      apiFormData.append('size_sqft', formData.size.toString());
      apiFormData.append('price_aed', formData.price.toString());
      apiFormData.append('type_of_bedroom', formData.bedroomType);

      // Append image files
      if (formData.visuals && formData.visuals.length > 0) {
        formData.visuals.forEach((imageUri, index) => {
          apiFormData.append('visuals', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${index}.jpg`,
          });
        });
      }

      if (editMode) {
        await updateMutation.mutateAsync({
          unitId: selectedItem.id,
          formData: apiFormData,
        });
        showToast('Unit updated successfully', 'success');
      } else {
        await createMutation.mutateAsync(apiFormData);
        showToast('Unit created successfully', 'success');
      }
      setShowCreateModal(false);
      setSelectedItem(null);
    } catch (error) {
      showToast(getErrorMessage(error, 'Operation failed'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteMutation.isPending) return; // Prevent multiple API calls

    try {
      await deleteMutation.mutateAsync(selectedItem.id);
      setShowDeleteModal(false);
      setSelectedItem(null);
      showToast('Unit deleted successfully', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to delete unit'), 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'success' });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* <Header
          title="Inventory Management"
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={handleNotificationPress}
        /> */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {/* <Header
          title="Inventory Management"
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={handleNotificationPress}
        /> */}
        <View style={styles.errorContainer}>
          <Image source={errorIcon} style={styles.errorIcon} />
          <Text style={styles.errorText}>Failed to load inventory</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const isLongNumber = String(inventory?.length || 0).length > 3;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Controls */}
      <View style={styles.headerWrapper}>
        <Text style={styles.pageTitle}>Inventory Management</Text>
        <View style={styles.headerControls}>
          <View
            style={[
              styles.totalLeadsCard,
              isLongNumber && styles.totalLeadsCardColumn, // switch layout
            ]}
          >
            <Image source={inventoryIcon} style={styles.iconSmall} />
            <Text style={styles.totalLeadsText}>Total Units</Text>
            <Text style={styles.totalLeadsCount}>{inventory?.length || 0}</Text>
          </View>
          {/* <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateNew}
          >
            <Text style={styles.createButtonText}>Create new project</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {filteredInventory && filteredInventory.length > 0 ? (
            filteredInventory.map(item => (
              <InventoryCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching inventory found'
                  : 'No inventory items available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* add button  */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.8}
      >
        <Text
          style={{ color: colors.defaultWhite, fontSize: 28, marginBottom: 2 }}
        >
          ＋
        </Text>
      </TouchableOpacity>
      <CreateEditInventoryModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit}
        editData={selectedItem}
        isEditing={editMode}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDeleteInventoryModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={selectedItem?.project_name || selectedItem?.projectName}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    // paddingBottom: 6,
    backgroundColor: colors.background,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  pageTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 24,
    color: colors.defaultBlack,
    // marginBottom: 16,
  },
  totalLeadsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Allow vertical stacking inside right container
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexShrink: 1,
    marginRight: 8,
    gap: 2,
  },

  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  totalLeadsCardColumn: {
    alignItems: 'flex-start',
  },

  totalLeadsTextContainer: {
    marginLeft: 8,
    flexShrink: 1,
  },

  totalLeadsText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Outfit-Medium',
  },

  totalLeadsCount: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    marginTop: 2,
  },
  totalProjects: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.defaultBlack,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.secondary,
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
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
    position: 'relative',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  projectName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',

    color: colors.primary,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusTextSmall: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeSmall: {
    flexDirection: 'row', // ✅ ensure dot and text are side by side
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  menuButton: {
    padding: 4,
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availabilityText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  soldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F44336',
  },
  soldText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  viewVisualsButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: colors.defaultWhite,
    width: '100%',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  viewVisualsText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: 450,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  swiperWrapper: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: { color: '#fff', fontSize: 18 },
  loadingView: { height: 400, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#999' },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noImageText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Outfit-Medium',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 16,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  detailIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  menuIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  errorIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
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

export default InventoryManagementScreen;
