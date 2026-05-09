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
} from 'react-native';
import { Phone } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from '../../../../components/Toast/Toast';
import ConfirmDeleteModal from '../../../../components/Modal/ConfirmDeleteModal';
import {
  useAgencyBrokers,
  useDeleteAgencyBroker,
  useUpdateAgencyBroker,
  useCreateAgencyBroker,
  useIndividualBrokers,
  useDeleteIndividualBroker,
  useUpdateIndividualBroker,
  useCreateIndividualBroker,
} from '../../../../services/api/adminApi';
import colors from '../../../../theme/colors';
import EditAgencyBrokerModal from '../../../../components/Modal/Broker/EditAgencyBrokerModal';
import EditIndividualBrokerModal from '../../../../components/Modal/Broker/EditIndividualBrokerModal';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { useSearchStore } from '../../../../store/searchStore';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

// Import custom icons
const icons = {
  dotsVertical: require('../../../../assets/icons/dots-vertical.png'),
  email: require('../../../../assets/icons/email.png'),
  trash: require('../../../../assets/icons/trash-01.png'),
  phone: require('../../../../assets/icons/officePhone.png'),
  building: require('../../../../assets/icons/home-line.png'),
  user: require('../../../../assets/icons/users-01.png'),
  edit: require('../../../../assets/icons/edit-contained.png'),
};

const AgencyBrokerCard = ({ broker, onDelete, onEdit, onPress }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(broker)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {capitalizeWords(broker.company_name)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.contactInfo}>
          <Image source={icons.email} style={styles.iconTiny} />
          <Text style={styles.contactText}>{broker.email}</Text>
        </View>
        <View style={styles.contactInfo}>
          {/* <Image source={icons.phone} style={styles.iconTiny} /> */}
          <Phone size={16} color={colors.secondary} />
          <Text style={styles.contactText}>{broker.office_phone_number}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Image source={icons.building} style={styles.iconTiny} />
          <Text style={styles.contactText}>
            {broker.city}, {broker.country}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Image source={icons.user} style={styles.iconTiny} />
          <Text style={styles.contactText}>
            RM: {broker.relationship_manager}
          </Text>
        </View>
      </View>

      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onEdit(broker);
            }}
          >
            <Image
              source={icons.edit}
              style={[styles.iconTiny, { tintColor: colors.primary }]}
            />
            <Text style={[styles.menuItemText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onDelete(broker);
            }}
          >
            <Image
              source={icons.trash}
              style={[styles.iconTiny, { tintColor: colors.warning }]}
            />
            <Text style={[styles.menuItemText, { color: colors.warning }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const IndividualBrokerCard = ({ broker, onDelete, onEdit, onPress }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(broker)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {capitalizeWords(broker.full_name)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.contactInfo}>
          <Image source={icons.email} style={styles.iconTiny} />
          <Text style={styles.contactText}>{broker.email}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Phone size={16} color={colors.secondary} />
          <Text style={styles.contactText}>{broker.phone_number}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Image source={icons.user} style={styles.iconTiny} />
          <Text style={styles.contactText}>{broker.gender}</Text>
        </View>
        {broker.specialization && (
          <View style={styles.contactInfo}>
            <Image source={icons.building} style={styles.iconTiny} />
            <Text style={styles.contactText}>{broker.nationality}</Text>
          </View>
        )}
      </View>

      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onEdit(broker);
            }}
          >
            <Image
              source={icons.edit}
              style={[styles.iconTiny, { tintColor: colors.primary }]}
            />
            <Text style={[styles.menuItemText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onDelete(broker);
            }}
          >
            <Image
              source={icons.trash}
              style={[styles.iconTiny, { tintColor: colors.warning }]}
            />
            <Text style={[styles.menuItemText, { color: colors.warning }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const BrokersScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const [activeTab, setActiveTab] = useState('agencies');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchQuery = useSearchStore(state => state.searchQuery);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    data: agencyBrokers,
    isLoading: agenciesLoading,
    error: agenciesError,
    refetch: refetchAgencies,
  } = useAgencyBrokers();

  const {
    data: individualBrokers,
    isLoading: individualsLoading,
    error: individualsError,
    refetch: refetchIndividuals,
  } = useIndividualBrokers();

  const deleteAgencyMutation = useDeleteAgencyBroker();
  const deleteIndividualMutation = useDeleteIndividualBroker();
  const updateAgencyMutation = useUpdateAgencyBroker();
  const updateIndividualMutation = useUpdateIndividualBroker();
  const createAgencyMutation = useCreateAgencyBroker();
  const createIndividualMutation = useCreateIndividualBroker();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'agencies') {
      await refetchAgencies();
    } else {
      await refetchIndividuals();
    }
    setRefreshing(false);
  };

  const handleDelete = item => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleEdit = item => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleBrokerPress = broker => {
    navigation.navigate('BrokerDetail', {
      broker,
      type: activeTab === 'agencies' ? 'agency' : 'individual',
    });
  };

  const confirmDelete = async () => {
    if (deleteAgencyMutation.isPending || deleteIndividualMutation.isPending)
      return;

    try {
      if (activeTab === 'agencies') {
        await deleteAgencyMutation.mutateAsync(selectedItem.id);
        showToast('Agency broker deleted successfully', 'success');
      } else {
        await deleteIndividualMutation.mutateAsync(selectedItem.id);
        showToast('Individual broker deleted successfully', 'success');
      }

      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      showToast('Failed to delete broker', 'error');
    }
  };

  const handleUpdate = async formData => {
    if (updateAgencyMutation.isPending || updateIndividualMutation.isPending)
      return;

    try {
      if (activeTab === 'agencies') {
        await updateAgencyMutation.mutateAsync({
          id: selectedItem.id,
          data: formData,
        });
        showToast('Agency broker updated successfully', 'success');
      } else {
        await updateIndividualMutation.mutateAsync({
          id: selectedItem.id,
          data: formData,
        });
        showToast('Individual broker updated successfully', 'success');
      }

      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      showToast('Failed to update broker', 'error');
    }
  };

  const handleCreate = async formData => {
    if (createAgencyMutation.isPending || createIndividualMutation.isPending)
      return;

    try {
      if (activeTab === 'agencies') {
        await createAgencyMutation.mutateAsync(formData);
        showToast('Agency broker created successfully', 'success');
      } else {
        await createIndividualMutation.mutateAsync(formData);
        showToast('Individual broker created successfully', 'success');
      }

      setShowAddModal(false);
    } catch (error) {
      showToast('Failed to create broker', 'error');
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

  const isLoading =
    activeTab === 'agencies' ? agenciesLoading : individualsLoading;
  const error = activeTab === 'agencies' ? agenciesError : individualsError;
  const data = activeTab === 'agencies' ? agencyBrokers : individualBrokers;
  //Filter brokers based on global search query
  const q = searchQuery.toLowerCase();

  const filteredAgencies =
    agencyBrokers?.filter(
      broker =>
        broker.company_name?.toLowerCase().includes(q) ||
        broker.email?.toLowerCase().includes(q) ||
        broker.office_phone_number?.toLowerCase().includes(q) ||
        broker.relationship_manager?.toLowerCase().includes(q) ||
        broker.city?.toLowerCase().includes(q) ||
        broker.country?.toLowerCase().includes(q),
    ) || [];

  const filteredIndividuals =
    individualBrokers?.filter(
      broker =>
        broker.full_name?.toLowerCase().includes(q) ||
        broker.email?.toLowerCase().includes(q) ||
        broker.phone_number?.toLowerCase().includes(q) ||
        broker.gender?.toLowerCase().includes(q) ||
        broker.nationality?.toLowerCase().includes(q),
    ) || [];

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          {/* <Icon name="error-outline" size={48} color={colors.warning} /> */}
          <Text style={styles.errorText}>Failed to load data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <Text style={styles.pageTitle}>Broker Management</Text>
        {/* Tab Header */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'agencies' && styles.activeTab]}
            onPress={() => setActiveTab('agencies')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'agencies' && styles.activeTabText,
              ]}
            >
              Agencies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'individuals' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('individuals')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'individuals' && styles.activeTabText,
              ]}
            >
              Individuals
            </Text>
          </TouchableOpacity>
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
          {activeTab === 'agencies' ? (
            filteredAgencies && filteredAgencies.length > 0 ? (
              filteredAgencies.map(broker => (
                <AgencyBrokerCard
                  key={`agency-${broker.id}`}
                  broker={broker}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onPress={handleBrokerPress}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No matching agency brokers found'
                    : 'No agency brokers available'}
                </Text>
              </View>
            )
          ) : filteredIndividuals && filteredIndividuals.length > 0 ? (
            filteredIndividuals.map(broker => (
              <IndividualBrokerCard
                key={`individual-${broker.id}`}
                broker={broker}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPress={handleBrokerPress}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching individual brokers found'
                  : 'No individual brokers available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={
          selectedItem?.company_name || selectedItem?.full_name || 'this broker'
        }
        title="Delete Broker"
      />

      {activeTab === 'agencies' ? (
        <>
          <EditAgencyBrokerModal
            visible={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            broker={selectedItem}
            onSubmit={handleUpdate}
            isLoading={updateAgencyMutation.isPending}
            isEditMode={true}
          />
          <EditAgencyBrokerModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            broker={null}
            onSubmit={handleCreate}
            isLoading={createAgencyMutation.isPending}
            isEditMode={false}
          />
        </>
      ) : (
        <>
          <EditIndividualBrokerModal
            visible={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            broker={selectedItem}
            onSubmit={handleUpdate}
            isLoading={updateIndividualMutation.isPending}
            isEditMode={true}
          />
          <EditIndividualBrokerModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            broker={null}
            onSubmit={handleCreate}
            isLoading={createIndividualMutation.isPending}
            isEditMode={false}
          />
        </>
      )}

      {/* Floating Action Button */}
      {/* <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Image source={CrossIcon} style={styles.iconSmall} />
      </TouchableOpacity> */}

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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,

    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    // borderWidth:1,
    elevation: 2,
    // marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Medium',
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: 'Outfit-Medium',
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    // paddingBottom: 6,
    backgroundColor: colors.background,
  },
  pageTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 24,
    color: colors.defaultBlack,
    marginBottom: 16,
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
    fontFamily: 'Outfit-Medium',
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
    fontFamily: 'Outfit-Medium',
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
    fontFamily: 'Outfit-Medium',
  },
  card: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  cardDetails: {
    gap: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  dropdownMenu: {
    position: 'absolute',
    zIndex: 10,
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
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Medium',
  },
  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconTiny: {
    width: 16,
    height: 16,
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

export default BrokersScreen;
