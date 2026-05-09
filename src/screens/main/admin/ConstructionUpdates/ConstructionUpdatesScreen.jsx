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

import clockIcon from '../../../../assets/icons/clock-01.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import emailIcon from '../../../../assets/icons/email.png';
import componentIcon from '../../../../assets/icons/Component.png';
import locationIcon from '../../../../assets/icons/home-line.png';
import { useSearchStore } from '../../../../store/searchStore';

import dotsIcon from '../../../../assets/icons/dots-vertical.png';
import Icon from 'react-native-vector-icons/MaterialIcons';
import layerIcon from '../../../../assets/icons/layers-three.png';
import colors from '../../../../theme/colors';
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';

import NoAccessScreen from '../../../../components/NoAccessScreen/NoAccessScreen';
import { useAdminConstructionUpdates } from '../../../../services/api/adminApi';
import { MODULES } from '../../../../utils/permissions';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

const ProjectCard = ({ clientData, onClientPress }) => {
  const { canAccess } = usePermissions();
  // Permission check
  const canViewUpdates = canAccess(MODULES.CONSTRUCTION_UPDATES);
  if (!canViewUpdates) {
    return (
      <NoAccessScreen message="You don't have permission to view construction updates." />
    );
  }
  const handleClientPress = () => {
    // Only allow press if user has permission to view updates
    if (canViewUpdates) {
      onClientPress(clientData);
    }
  };
  return (
    <View style={styles.projectCard}>
      {/* Client Info Header */}
      <TouchableOpacity onPress={handleClientPress} activeOpacity={0.7}>
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>
            {capitalizeWords(clientData.client_name)}
          </Text>
          <View style={styles.clientInfo}>
            <View
              style={[
                styles.statusBadge,
                clientData.overall_status === 'in_progress'
                  ? { backgroundColor: '#FEF9ED' } // light yellow
                  : { backgroundColor: '#F0FEED' }, // light green
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  clientData.overall_status === 'in_progress'
                    ? { backgroundColor: '#FFC830' } // yellow
                    : { backgroundColor: '#259800' }, // green
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  clientData.overall_status === 'in_progress'
                    ? { color: '#FFC830' } // yellow text
                    : { color: '#259800' }, // green text
                ]}
              >
                {clientData.overall_status}
              </Text>
            </View>
            {/* <Image source={dotsIcon} style={styles.layerIcon} /> */}
          </View>
        </View>
        {/* Client Details */}
        <View style={styles.projectDetails}>
          <View style={styles.projectNameContainer}>
            <Image source={locationIcon} style={styles.layerIcon} />
            <Text style={styles.projectName}>
              {[...new Set(clientData.projects?.map(p => p.project_name))].join(
                ', ',
              )}
            </Text>
          </View>
          <View style={styles.projectNameContainer}>
            <Image source={emailIcon} style={styles.layerIcon} />
            <Text style={styles.projectName}>{clientData.client_email}</Text>
          </View>
          <View style={styles.projectNameContainer}>
            <Image source={componentIcon} style={styles.layerIcon} />
            <Text style={styles.projectName}>{clientData.client_phone}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Main Screen Component
const ConstructionUpdatesScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const { userRole } = useAuth();
  const { canAccess } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);
  const searchQuery = useSearchStore(state => state.searchQuery);

  // Permission check
  const canViewUpdates = canAccess(MODULES.CONSTRUCTION_UPDATES);

  const {
    data: constructionUpdates,
    isLoading,
    error,
    refetch,
  } = useAdminConstructionUpdates();
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  console.log('Data of CU', constructionUpdates);

  const handleClientPress = clientData => {
    // Navigate to client details
    navigation.navigate('AdminConstructionUpdateDetails', {
      clientId: clientData.client_id,
      clientName: clientData.client_name,
    });
  };

  // Show no access screen if user doesn't have permission
  // if (!canViewUpdates) {
  //   return (
  //     <NoAccessScreen message="You don't have permission to view construction updates." />
  //   );
  // }

  const allProjects =
    constructionUpdates?.flatMap(client => client.projects || []) || [];
  const totalProjects = constructionUpdates?.length;
  const inProgressProjects = constructionUpdates?.filter(
    p => p.overall_status?.toLowerCase() === 'in_progress',
  ).length;
  const completedProjects = constructionUpdates?.filter(
    p => p.status?.toLowerCase() === 'completed',
  ).length;
  // Lowercase search text for comparison
  const q = searchQuery.toLowerCase();

  //Filter construction updates by client name, email, or project name
  const filteredUpdates =
    constructionUpdates?.filter(
      client =>
        (client.client_name || '').toLowerCase().includes(q) ||
        (client.client_email || '').toLowerCase().includes(q) ||
        (client.client_phone || '').toLowerCase().includes(q) ||
        client.projects?.some(p =>
          (p.project_name || '').toLowerCase().includes(q),
        ),
    ) || [];

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            Loading construction updates...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          {/* <Icon name="error-outline" size={48} color={colors.warning} /> */}
          <Text style={styles.errorText}>
            Failed to load construction updates
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text style={styles.heading}>Construction Updates</Text>
      </View>

      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.circle, { backgroundColor: '#EDF5FE' }]}>
            <Image source={layerIcon} style={styles.layerIcon} />
          </View>
          <Text style={styles.statLabel}>Total projects</Text>
          <Text style={styles.statNumber}>{totalProjects}</Text>
        </View>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View style={[styles.circle, { backgroundColor: '#FEF9ED' }]}>
            {/* <View style={[styles.statusDot, { backgroundColor: '#FFA500' }]} /> */}
            <Image source={clockIcon} style={styles.statusIcon} />
          </View>
          <Text style={styles.statusLabel}>In progress</Text>
          <Text style={styles.statusNumber}> {inProgressProjects}</Text>
        </View>
        <View style={styles.statusItem}>
          {/* <View style={[styles.statusDot, { backgroundColor: '#259800' }]} /> */}
          <View style={[styles.circle, { backgroundColor: '#F0FEED' }]}>
            <Image source={checkIcon} style={styles.statusIcon} />
          </View>
          <Text style={styles.statusLabel}>Completed</Text>
          <Text style={styles.statusNumber}>{completedProjects}</Text>
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
          {filteredUpdates && filteredUpdates.length > 0 ? (
            filteredUpdates.map((clientData, index) => (
              <ProjectCard
                key={clientData.client_id || index}
                clientData={clientData}
                onClientPress={handleClientPress}
                userRole={userRole}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching construction projects found'
                  : 'No construction projects available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    fontFamily: 'Outfit',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    // fontWeight:'500',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  layerIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  circle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },

  /**  Circular Progress Bar */
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 10,
  },
  circularText: {
    position: 'absolute',
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },

  /**  Loading & Error */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Outfit-Regular',
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
    color: 'red', // updated
    fontSize: 12, // updated
    marginTop: 4, // updated
  },

  /**  Retry Button */
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },

  /**  Stats */
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
        backgroundColor: colors.background,

    gap: 4,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#101828',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Regular',
  },
  addProjectButton: {
    backgroundColor: colors.defaultBlack,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addProjectText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  /**  Status Row */
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
        backgroundColor: colors.background,

    gap: 20,
  },
  statusIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  statusItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#101828',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  statusNumber: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: 'Outfit-Medium',
  },

  /**  Project Card */
  projectCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',

    // iOS shadow
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // ~10% opacity (#1A)
    shadowRadius: 3, // blur

    // Android shadow
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    color: colors.defaultWhite,
    fontSize: 10,
    fontWeight: '600',
  },
  projectDetails: {
    marginBottom: 12,
  },
  projectName: {
    fontSize: 18,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginBottom: 4,
  },
  projectNameContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  projectDate: {
    fontSize: 14,
    color: colors.secondary,
  },

  /**  Progress Section */
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    marginBottom: 8,
  },
  progressHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  /**  Empty State */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Medium',
    marginTop: 12,
    textAlign: 'center',
  },

  /**  Modal + Bottom Sheet (updated) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // updated
    justifyContent: 'flex-end', // updated
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    padding: 16, // updated
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    color: colors.defaultBlack,
  },
  modalContent: {
    paddingHorizontal: 16, // updated
    paddingVertical: 8, // updated
  },

  /**  Form (updated) */
  form: {
    marginTop: 10, // updated
  },
  inputContainer: {
    marginBottom: 15, // updated
  },
  label: {
    fontSize: 18, // updated
    fontFamily: 'Outfit-Medium',
    fontWeight: 500,
    color: colors.text,
    marginBottom: 6, // updated
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary, // updated
    borderRadius: 8,
    padding: 12, // updated
    fontSize: 14, // updated
    color: colors.secondary,
  },
  inputError: {
    borderColor: 'red', // updated
    fontFamily: 'Outfit-Medium',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14, // updated
    borderRadius: 8,
    marginTop: 10, // updated
  },
  addButtonText: {
    textAlign: 'center', // updated
    color: '#fff',
    fontWeight: '600', // updated
    fontFamily: 'Outfit-Medium',
  },
  projectsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.primary,
  },
});

export default ConstructionUpdatesScreen;
