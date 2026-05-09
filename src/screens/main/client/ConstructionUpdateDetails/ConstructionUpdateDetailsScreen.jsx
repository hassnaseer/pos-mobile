import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CircularProgress from '../../../../components/Ui/CircularProgressBar'; // adjust the path to where your component is
import { useAuth } from '../../../../context/AuthContext';
import ProjectUpdateDetail from '../../client/ConstructionUpdateDetails/ProjectUpdateDetail';
import layerIcon from '../../../../assets/icons/layers-three.png';
import calendarIcon from '../../../../assets/icons/calendar-check.png';
import downIcon from '../../../../assets/icons/arrow-down.png';
import colors from '../../../../theme/colors';
import {
  useConstructionUpdates,
  useConstructionUpdatesById,
} from '../../../../services/api/clientApi';
import { formatDate } from '../../../../utils/formatDate';
import LoadingScreen from '../../../../components/LoadingScreen';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';
import { useSearchStore } from '../../../../store/searchStore';

const { width } = Dimensions.get('window');

const ConstructionUpdateDetailsScreen = ({ route, navigation }) => {
  useResetSearchOnFocus();
  const searchQuery = useSearchStore(state => state.searchQuery);
  const { userRole, isAuthenticated } = useAuth();
  const { projectId, projectName, clientName } = route.params || {};
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: updateDetails,
    isLoading,
    refetch,
  } = useConstructionUpdates({
    enabled: !!userRole && isAuthenticated,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleImagePress = image => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const ProjectCard = ({ project }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
      data: weeklyUpdates,
      isLoading,
      refetch,
    } = useConstructionUpdatesById(project.inprogress_id, {
      enabled: false,
    });

    const handleExpand = () => {
      if (!isExpanded && !weeklyUpdates) {
        refetch();
      }
      setIsExpanded(!isExpanded);
    };

    return (
      <View style={styles.projectCard}>
        {/* Project Header */}
        <View style={styles.clientHeader}>
          <Text
            style={[
              styles.clientName,
              userRole === 'client' && { textAlign: 'center', flex: 1 },
            ]}
          >
            {project?.project_name}
          </Text>
        </View>

        <View style={styles.projectHeader}>
          <View style={styles.dateContainer}>
            <View style={styles.dateTextContainer}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.projectDate}>
                {formatDate(project.last_update_date)}
              </Text>
            </View>
            <CircularProgress
              progress={project.last_percentage}
              color="#336699"
              size={40}
              strokeWidth={4}
            />
          </View>
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.updateContainer}
            onPress={handleExpand}
          >
            <Text style={styles.viewUpdatesText}>View updates</Text>
            <Image source={downIcon} style={styles.arrownDown} />
          </TouchableOpacity>

          {/* Weekly Progress Dropdown */}
          {isExpanded && (
            <View style={styles.weeklyProgressContainer}>
              {isLoading && (
                <LoadingScreen message="Loading client details..." />
              )}

              {weeklyUpdates &&
              Array.isArray(weeklyUpdates) &&
              weeklyUpdates.length > 0
                ? weeklyUpdates.map(update => (
                    <TouchableOpacity
                      key={
                        update.id?.toString() ||
                        `${project.id}-${update.week_no}`
                      }
                      onPress={() =>
                        navigation.navigate('ProjectUpdateDetail', {
                          updateId: update?.id,
                          weekNo: update?.week_no,
                          projectId: project?.id,
                          projectName: project?.project_name,
                        })
                      }
                    >
                      <View style={styles.weeklyProgressItem}>
                        <Text style={styles.weekLabel}>
                          Week {update.week_no}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                : !isLoading && <Text>No updates available</Text>}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading client details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  const q = searchQuery.toLowerCase();
  const filteredProjects =
    updateDetails?.units?.filter(
      project =>
        project.project_name?.toLowerCase().includes(q) ||
        updateDetails?.client_name?.toLowerCase().includes(q),
    ) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text style={styles.heading}>Construction Updates</Text>
      </View>

      <View style={styles.content}>
        {/* Client Info Card */}
        <View style={styles.clientInfoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client Name:</Text>
            <Text style={styles.infoValue}>{updateDetails?.client_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{updateDetails?.client_email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone number:</Text>
            <Text style={styles.infoValue}>{updateDetails?.client_phone}</Text>
          </View>

          <View style={styles.totalProjectsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.circle, { backgroundColor: '#EDF5FE' }]}>
                <Image source={layerIcon} style={styles.layerIcon} />
              </View>
              <Text style={styles.statLabel}>Total projects</Text>
              <Text style={styles.statNumber}>
                {updateDetails?.units?.length?.toString() || '0'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Projects List */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <ProjectCard
              key={project.id?.toString() || project.project_name}
              project={project}
            />
          ))
        ) : (
          <Text
            style={{
              textAlign: 'center',
              marginTop: 20,
              fontFamily: 'Outfit-Medium',
              color: colors.secondary,
            }}
          >
            {searchQuery
              ? 'No matching projects found'
              : 'No projects available'}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 20,
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
  clientInfoCard: {
        backgroundColor: colors.background,

    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    width: 110,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.secondary,
  },
  infoValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.defaultBlack,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clientName: {
    fontSize: 20,
    fontWeight: '500',
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
    fontSize: 10,
    fontFamily: 'Outfit-Regular',
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
  layerIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  totalProjectsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  uploadNewUpdateButton: {
    backgroundColor: colors.defaultBlack,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadNewUpdateText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit-Regular',
  },
  projectCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dateContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIcon: { width: 18, height: 18 },
  projectDate: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
  },
  updateContainer: {
    height: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewUpdatesText: {
    color: colors.defaultBlack,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  arrownDown: {
    width: 18,
    height: 16,
    resizeMode: 'contain',
  },
  weeklyProgressContainer: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 10,
    bottom: 10,
  },
  weeklyProgressItem: {
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultWhite,
    textAlign: 'center',
  },
});

export default ConstructionUpdateDetailsScreen;
