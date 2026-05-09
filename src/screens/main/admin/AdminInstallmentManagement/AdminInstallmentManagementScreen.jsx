import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import colors from '../../../../theme/colors';
import { useAllInstallments } from '../../../../services/api/installmentApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';
import NoAccessScreen from '../../../../components/NoAccessScreen/NoAccessScreen';
import layerIcon from '../../../../assets/icons/layers-three.png';
import locationIcon from '../../../../assets/icons/home-line.png';
import emailIcon from '../../../../assets/icons/email.png';
import clockIcon from '../../../../assets/icons/clock-01.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import phoneIcon from '../../../../assets/icons/Component.png';
import { useSearchStore } from '../../../../store/searchStore';
import {useResetSearchOnFocus} from '../../../../utils/resetSearch';
const FilterButton = ({ label, count, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.filterCount, isActive && styles.filterCountActive]}>
        {count}
      </Text>
    </TouchableOpacity>
  );
};

const ClientCard = ({ client, onPress }) => {
  const getStatusBadgeColor = status => {
    if (!status) return '#F3F4F6';
    switch (status.toLowerCase()) {
      case 'in_progress':
      case 'progress':
        return '#FEF9ED';
      case 'completed':
        return '#F0FEED';
        return '#F3F4F6';
    }
  };

  const getStatusDotColor = status => {
    if (!status) return '#9CA3AF';
    switch (status.toLowerCase()) {
      case 'in_progress':
      case 'progress':
        return '#FFC830'; // yellow dot/text
      case 'completed':
        return '#259800'; // green dot/text
      default:
        return '#9CA3AF';
    }
  };

  const formatStatusLabel = status => {
    if (!status) return 'N/A';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress}>
      <View style={styles.clientHeader}>
        <Text style={styles.clientName}>
          {client.client_name
            ?.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </Text>
      </View>

      <View style={styles.clientInfo}>
        {/*  Project Name + Status */}
        {client.projects?.map((project, index) => (
          <View key={index} style={styles.infoRow}>
            <Image source={locationIcon} style={styles.smallIcon} />
            <Text style={styles.infoText}>{project.project_name}</Text>

            {/*  Colored status badge */}
            {project.status && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadgeColor(project.status) },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusDotColor(project.status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusDotColor(project.status) },
                  ]}
                >
                  {formatStatusLabel(project.status)}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/*  Email */}
        <View style={styles.infoRow}>
          <Image source={emailIcon} style={styles.smallIcon} />
          <Text style={styles.infoText}>{client.client_email || 'N/A'}</Text>
        </View>

        {/*  Phone */}
        <View style={styles.infoRow}>
          <Image source={phoneIcon} style={styles.smallIcon} />
          <Text style={styles.infoText}>{client.client_phone || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const AdminInstallmentManagementScreen = ({ navigation }) => {
  //reset the search globally
  useResetSearchOnFocus(); 
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const searchQuery = useSearchStore(state => state.searchQuery);

  const { canAccess } = usePermissions();

  // Permission check - need specific permission to view installment details
  const canViewInstallments = canAccess(
    MODULES.INSTALLMENT_MANAGEMENT,
    PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_VIEW_INSTALLMENT_DETAILS,
  );

  const {
    data: installments,
    isLoading,
    error,
    refetch,
  } = useAllInstallments({}, { enabled: canViewInstallments });

  const allInstallments = Array.isArray(installments) ? installments : [];

  const allProjects =
    allInstallments?.flatMap(client => client.projects || []) || [];
  const totalProjects = allInstallments.length;
  const inProgressCount = allInstallments.filter(
    p =>
      p.overall_status?.toLowerCase() === 'in progress' ||
      p.overall_status?.toLowerCase() === 'in_progress',
  ).length;
  const completedCount = allProjects.filter(
    p => p.status?.toLowerCase() === 'completed',
  ).length;

  // Filter installments
  // const filteredInstallments =
  //   selectedFilter === 'all'
  //     ? allInstallments
  //     : allInstallments.filter(item => item.status === selectedFilter);

  const handleClientPress = client => {
    navigation.navigate('InstallmentDetails', { client });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // 🔍 Filter all installments based on the search query (client + projects + email + phone)
  const filteredInstallments = allInstallments.filter(client => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const matchesClient =
      client.client_name?.toLowerCase().includes(q) ||
      client.client_email?.toLowerCase().includes(q) ||
      client.client_phone?.toLowerCase().includes(q);

    const matchesProjects = (client.projects || []).some(
      project =>
        project.project_name?.toLowerCase().includes(q) ||
        project.status?.toLowerCase().includes(q),
    );

    return matchesClient || matchesProjects;
  });

  // Show no access screen if user doesn't have permission
  if (!canViewInstallments) {
    return (
      <NoAccessScreen message="You don't have permission to view installment details." />
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading installments...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to Installment Management</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Installment Management</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.circle, { backgroundColor: '#EDF5FE' }]}>
            <Image source={layerIcon} style={styles.layerIcon} />
          </View>
          <Text style={styles.statLabel}>Total Clients</Text>
          <Text style={styles.statNumber}>{totalProjects}</Text>
        </View>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View style={[styles.circle, { backgroundColor: '#FEF9ED' , }]}>
            {/* <View style={[styles.statusDot, { backgroundColor: '#FFA500' }]} /> */}
            <Image source={clockIcon} style={styles.statusIcon} />
          </View>
          <Text style={styles.statusLabel}>In progress</Text>
          <Text style={styles.statusNumber}>
            {inProgressCount.toString().padStart(2)}
          </Text>
        </View>
        <View style={styles.statusItem}>
          {/* <View style={[styles.statusDot, { backgroundColor: '#259800' }]} /> */}
          <View style={[styles.circle, { backgroundColor: '#F0FEED' }]}>
            <Image source={checkIcon} style={styles.statusIcon} />
          </View>
          <Text style={styles.statusLabel}>Completed</Text>
          <Text style={styles.statusNumber}>
            {' '}
            {completedCount.toString().padStart(2)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Client Cards */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : filteredInstallments.length > 0 ? (
          filteredInstallments.map((client, index) => (
            <ClientCard
              key={index}
              client={client}
              onPress={() => handleClientPress(client)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No matching results found'
              : 'No installments found'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
        backgroundColor: colors.background,

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
    fontFamily: 'Outfit-Regular',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  circle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  
},
  layerIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
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

    gap: 6,
  },
  statusIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  statusItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap:4,
    paddingHorizontal: 10,
    paddingVertical: 6,
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

  clientCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  clientName: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    textTransform: 'capitalize',
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
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
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  clientInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  dotsIconStyle: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
});

export default AdminInstallmentManagementScreen;
