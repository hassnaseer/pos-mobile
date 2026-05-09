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
  Dimensions,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs'; //npm install react-native-fs
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';
import { useUpcomingProjects } from '../../../../services/api/clientApi';
import { useAuth } from '../../../../context/AuthContext';
import pdfIcon from '../../../../assets/icons/filetype-Icon.png';
import layerIcon from '../../../../assets/icons/layers-three.png';
import CreateProjectByAdmin from '../../../../components/Modal/CreateProjectByadminModal';
import Swiper from 'react-native-swiper';
import ImageSwiper from '../../../../components/Swiper/Swiper';
import { formatDate } from '../../../../utils/formatDate';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';
import { useSearchStore } from '../../../../store/searchStore';

const { width } = Dimensions.get('window');

const ProjectCard = ({ project, onDownloadPdf }) => (
  <View style={styles.projectCard}>
    {project.images.length > 0 ? (
      <ImageSwiper images={project?.images} />
    ) : (
      <Text style={styles.noVisualText}>No Visuals Attached</Text>
    )}

    <View style={styles.cardContent}>
      <View style={styles.launchButton}>
        <Text style={styles.projectTitle}>{project?.project_name}</Text>
      </View>
      <View style={styles.launchButton}>
        <Text style={styles.projectSubtitle}>
          Launch Expected by {formatDate(project?.launch_date)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        activeOpacity={0.7}
        onPress={() => onDownloadPdf(project.info_pdf, project.title)}
      >
        <Image source={pdfIcon} style={styles.pdfIcon} />
        <Text style={styles.downloadButtonText}>Download into pdf</Text>
      </TouchableOpacity>
    </View>
  </View>
);
const UpcomingProjectsScreen = ({ navigation }) => {
  const { userRole } = useAuth();
  const {
    data: upcomingProjects,
    isLoading,
    error,
    refetch,
  } = useUpcomingProjects();
  useResetSearchOnFocus();
  const searchQuery = useSearchStore(state => state.searchQuery);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleDownloadPdf = async (pdfUrl, projectTitle) => {
    if (!pdfUrl) {
      Alert.alert('Error', 'PDF not available for this project');
      return;
    }

    try {
      let hasPermission = true;

      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to download PDF',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;

        if (!hasPermission) {
          Alert.alert(
            'Permission Denied',
            'Cannot download without permission',
          );
          return;
        }
      }

      const baseFileName = (projectTitle || 'document').replace(
        /[^a-z0-9]/gi,
        '_',
      );
      let fileName = `${baseFileName}.pdf`;
      let downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      // Check if file exists and increment counter
      let counter = 1;
      while (await RNFS.exists(downloadDest)) {
        fileName = `${baseFileName}(${counter}).pdf`;
        downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        counter++;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: pdfUrl,
        toFile: downloadDest,
        background: true,
      }).promise;

      if (
        downloadResult.statusCode === 200 &&
        downloadResult.bytesWritten > 0
      ) {
        const fileStats = await RNFS.stat(downloadDest);
        Alert.alert(
          'Success',
          `PDF downloaded!\nSize: ${(fileStats.size / 1024).toFixed(
            2,
          )} KB\nSaved as: ${fileName}`,
        );
      } else {
        Alert.alert(
          'Error',
          `Download failed. Status: ${downloadResult.statusCode}`,
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', `Failed to download: ${error.message}`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRegisterInterest = project => {
    navigation.navigate('InquiryForm', { project });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleUploadSuccess = () => {
    refetch();
  };
  const q = searchQuery.toLowerCase();
  const filteredProjects =
    upcomingProjects?.filter(
      project =>
        project.project_name?.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        project.launch_date?.toLowerCase().includes(q),
    ) || [];

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading upcoming projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={colors.warning} />
          <Text style={styles.errorText}>Failed to load upcoming projects</Text>
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
        <Text style={styles.heading}>Upcoming Projects</Text>
      </View>

      <View style={styles.headerSection}>
        <View style={styles.statItem}>
          <View style={[styles.circle, { backgroundColor: '#336699' }]}>
            <Image source={layerIcon} style={styles.layerIcon} />
          </View>
          <Text style={styles.statLabel}>Total Upcoming projects</Text>
          <Text style={styles.statNumber}>
            {upcomingProjects?.length?.toString() || '0'}
          </Text>
        </View>

        {/* {(userRole === 'admin' || userRole === 'superadmin') && (
          <TouchableOpacity
            style={styles.uploadButton}
            activeOpacity={0.7}
            onPress={() => {
              setShowUploadModal(true);
            }}
          >
            <Icon name="upload" size={16} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        )} */}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {filteredProjects && filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDownloadPdf={handleDownloadPdf}
                userRole={userRole}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching upcoming projects found'
                  : 'No upcoming projects available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <CreateProjectByAdmin
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  noVisualText: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Outfit-Regular',
    marginTop: 6,
    textAlign: 'center',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
        backgroundColor: colors.background,

  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    // fontWeight: '600',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  projectTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Outfit-Regular',
    color: '#3083FF',
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',

    color: colors.text,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#101828',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 3,
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
    tintColor: colors.defaultWhite,
  },
  circle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  uploadButtonText: {
    fontSize: 14,
    color: colors.primary,
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
    fontFamily: 'Outfit-Medium',
  },
  projectCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    // height: 556,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, // 0F in hex ≈ 6% opacity
    shadowRadius: 2,
    elevation: 0.5,
    overflow: 'hidden',
  },
  projectImage: {
    width: '100%',
    height: 370,
    borderRadius: 8,
  },
  cardContent: {
    width: '100%',
    // gap: 10,
    // height: 550,
  },

  launchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#EDF5FE',
    // gap: 8,
  },

  projectSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#3083FF',
  },
  registerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 32,
    alignItems: 'center',
  },
  registerButtonText: {
    color: colors.defaultWhite,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop:10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    // gap: 8,
  },
  downloadButtonText: {
    color: colors.defaultBlack,
    fontSize: 14,
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
  },
  pdfIcon: {
    height: 20,
    width: 20,
    resizeMode: 'contain',
  },
  swiperContainer: {
    width: '100%',
    height: 370,
    borderRadius: 8,
    overflow: 'hidden',
  },
  swiperInner: {
    borderRadius: 8,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationStyle: {
    bottom: 10,
  },
});

export default UpcomingProjectsScreen;
