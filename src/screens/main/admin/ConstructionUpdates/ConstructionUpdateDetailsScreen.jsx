import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSearchStore } from '../../../../store/searchStore';

import { SafeAreaView } from 'react-native-safe-area-context';
import CircularProgress from '../../../../components/Ui/CircularProgressBar'; // adjust the path to where your component is
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';
import layerIcon from '../../../../assets/icons/layers-three.png';
import calendarIcon from '../../../../assets/icons/calendar-check.png';
import downIcon from '../../../../assets/icons/arrow-down.png';
import colors from '../../../../theme/colors';
import {
  useConstructionClientDetails,
  useConstructionProjectUpdates,
} from '../../../../services/api/adminApi';
import { formatDate } from '../../../../utils/formatDate';
import LoadingScreen from '../../../../components/LoadingScreen';
import UploadConstructionUpdateModal from '../../../../components/Modal/constructionUpdates/UploadConstructionUpdateModal';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

const { width } = Dimensions.get('window');

const ConstructionUpdateDetailsScreen = ({ route, navigation }) => {
  useResetSearchOnFocus();
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const { clientId, clientName } = route.params || {};
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const clientDetailsQuery = useConstructionClientDetails(clientId);

  const { data: updateDetails, isLoading, refetch } = clientDetailsQuery;
  const searchQuery = useSearchStore(state => state.searchQuery);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUploadNewUpdate = project => {
    if (
      !hasPermission(
        MODULES.CONSTRUCTION_UPDATES,
        PERMISSIONS.CONSTRUCTION_UPDATES.CAN_UPLOAD_UPDATE,
      )
    ) {
      alert("You don't have permission to upload updates");
      return;
    }
    setSelectedProject(project);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    refetch();
  };

  const ProjectCard = ({ project }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
      data: weeklyUpdates,
      isLoading,
      refetch,
    } = useConstructionProjectUpdates(project.inprogress_id, {
      enabled: false, // Never auto-fetch
    });

    const handleExpand = () => {
      if (!isExpanded) {
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
              userRole === 'client' && { textAlign: 'center', flex: 1 }, // center only for client
            ]}
          >
            {project?.project_name}
          </Text>
          {userRole == 'admin' && (
            <View
              style={[
                styles.statusBadge,
                project.status === 'In progress'
                  ? { backgroundColor: '#FEF9ED' } // light yellow
                  : { backgroundColor: '#F0FEED' }, // light green
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  project.status === 'In progress'
                    ? { backgroundColor: '#FFC830' } // yellow
                    : { backgroundColor: '#259800' }, // green
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  project.status === 'In progress'
                    ? { color: '#FFC830' } // yellow text
                    : { color: '#259800' }, // green text
                ]}
              >
                {project.status}
              </Text>
            </View>
          )}
        </View>
        {/* <Text style={styles.projectName}>{project.name}</Text> */}

        <View style={styles.projectHeader}>
          <View style={styles.dateContainer}>
            {/* Date and Calendar */}
            <View style={styles.dateTextContainer}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.projectDate}>
                {project.last_update_date
                  ? formatDate(project.last_update_date)
                  : 'N/A'}
              </Text>
            </View>
            {/* Circular Progress */}
            <CircularProgress
              progress={project.last_percentage || 0} // your project progress value
              color="#336699" // or dynamic color
              size={40} // adjust size as needed
              strokeWidth={4}
            />
          </View>
        </View>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.updateContainer}
            onPress={() => handleExpand()} // toggle dropdown
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
                      key={update.id}
                      onPress={() => {
                        if (
                          !hasPermission(
                            MODULES.CONSTRUCTION_UPDATES,
                            PERMISSIONS.CONSTRUCTION_UPDATES
                              .CAN_VIEW_UPDATE_DETAILS,
                          )
                        ) {
                          alert(
                            "You don't have permission to view update details",
                          );
                          return;
                        }
                        navigation.navigate('AdminProjectUpdateScreen', {
                          updateId: update?.id,
                          weekNo: update?.week_no,
                          inprogressId: project?.inprogress_id,
                          projectName: project?.project_name,
                        });
                      }}
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

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text style={styles.heading}>Construction Updates</Text>
      </View>

      <View style={styles.content}>
        {/* Client Info Card */}
        <View style={styles.clientInfoCard}>
          <View style={styles.infoBlock}>
            <View style={styles.row}>
              <Text style={[styles.label, styles.labelCol]}>Client Name:</Text>
              <Text style={styles.valueCol}>
                {capitalizeWords(updateDetails?.client_name)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, styles.labelCol]}>Email:</Text>
              <Text style={styles.valueCol}>{updateDetails?.client_email}</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, styles.labelCol]}>Phone number:</Text>
              <Text style={styles.valueCol}>{updateDetails?.client_phone}</Text>
            </View>
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
            <TouchableOpacity
              style={styles.uploadNewUpdateButton}
              onPress={() => handleUploadNewUpdate(updateDetails?.units)}
            >
              <Text style={styles.uploadNewUpdateText}>Upload new update</Text>
            </TouchableOpacity>
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
        {(() => {
          const projects = updateDetails?.units || [];
          const filteredProjects = projects.filter(project =>
            (project.project_name || '')
              .toLowerCase()
              .includes((searchQuery || '').toLowerCase().trim()),
          );

          if (projects.length === 0) {
            return (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text
                  style={{
                    color: colors.secondary,
                    fontFamily: 'Outfit-Medium',
                  }}
                >
                  No projects available
                </Text>
              </View>
            );
          }

          if (filteredProjects.length === 0) {
            return (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text
                  style={{
                    color: colors.secondary,
                    fontFamily: 'Outfit-Medium',
                  }}
                >
                  No matching projects found
                </Text>
              </View>
            );
          }

          return filteredProjects.map(project => (
            <ProjectCard key={project.inprogress_id} project={project} />
          ));
        })()}
      </ScrollView>

      {/* Upload Construction Update Modal */}
      <UploadConstructionUpdateModal
        visible={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedProject(null);
        }}
        onSuccess={handleUploadSuccess}
        clientData={updateDetails}
        selectedProject={selectedProject}
      />
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
    // fontWeight: '600',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingVertical: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
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

    // padding: 16,
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // marginBottom: 12,
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
    // fontFamily: 'Outfit-Medium',
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
    color: colors.defaultWhite,
    fontSize: 10,
    fontWeight: '600',
  },
  infoBlock: { gap: 6 }, // or remove and use marginBottom on rows if RN < 0.71
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  label: {
    fontFamily: 'Outfit-Regular',
    color: colors.secondary, // light gray like your mock
  },
  labelCol: {
    width: 120, // << adjust to match your design
    marginRight: 8,
  },
  valueCol: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    color: '#000',
    flexWrap: 'wrap',
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
    // fontFamily: 'Outfit-Regular',
    fontWeight: '400',
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
  totalProjectsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  totalProjectsText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
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
  projectName: { fontSize: 18, fontWeight: 'bold' },
  dateContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // space between progress circle and date
  },
  calendarIcon: { width: 18, height: 18 },
  projectDate: { fontSize: 16, color: colors.secondary },
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
  // viewUpdatesButton: {
  //   // backgroundColor: colors.primary,
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 16,
  // },
  viewUpdatesText: {
    color: colors.defaultBlack,
    fontSize: 14,
    fontWeight: '600',
    // marginBottom:6,
  },
  arrownDown: {
    width: 18,
    height: 16,
    resizeMode: 'contain',
  },
  progressToggle: {
    alignItems: 'center',
    paddingVertical: 8,
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
    color: colors.defaultWhite,
    paddingVertical: 4,
    // paddingVertical: 10,
    borderRadius: 8,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.defaultWhite,
    // marginBottom: 4,
    textAlign: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    minWidth: 35,
    textAlign: 'right',
  },
  uploadUpdateButton: {
    backgroundColor: colors.defaultBlack,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadUpdateText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 8,
  },
});

export default ConstructionUpdateDetailsScreen;
