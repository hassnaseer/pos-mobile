import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CircularProgress from '../../../../components/Ui/CircularProgressBar';
import { useConstructionUpdatesByWeek } from '../../../../services/api/adminApi';
import { formatDate } from '../../../../utils/formatDate';
import LoadingScreen from '../../../../components/LoadingScreen';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';
import NoAccessScreen from '../../../../components/NoAccessScreen/NoAccessScreen';
import colors from '../../../../theme/colors';

const { width } = Dimensions.get('window');

const ProjectUpdateScreen = ({ navigation, route }) => {
  const { updateId, projectName } = route.params;
  const { hasPermission } = usePermissions();

  const {
    data: weeklyUpdatesData,
    isLoading,
    error,
  } = useConstructionUpdatesByWeek(updateId);

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  // Check permission to view update details
  const canViewUpdateDetails = hasPermission(
    MODULES.CONSTRUCTION_UPDATES,
    PERMISSIONS.CONSTRUCTION_UPDATES.CAN_VIEW_UPDATE_DETAILS,
  );

  if (!canViewUpdateDetails) {
    return (
      <NoAccessScreen message="You don't have permission to view construction update details" />
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading weekly update..." />;
  }
  if (error || !weeklyUpdatesData) {
    return <Text>No Data Found.</Text>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Project Title */}
        <Text style={styles.projectTitle}>{projectName}</Text>

        {/* Update Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.labelCol]}>
              Update Name:
            </Text>
            <Text style={styles.valueCol}>
              {weeklyUpdatesData?.update_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.labelCol]}>Date:</Text>
            <Text style={styles.valueCol}>
              {formatDate(weeklyUpdatesData?.created_at)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.labelCol]}>Progress:</Text>
            <Text style={styles.valueCol}>
              {weeklyUpdatesData?.approx_percentage_completion}% Complete
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <CircularProgress
            progress={weeklyUpdatesData?.approx_percentage_completion} // your project progress value
            color="#336699" // or dynamic color
            size={40} // adjust size as needed
            strokeWidth={4}
          />
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.detailsText}>
            {weeklyUpdatesData?.update_info}
          </Text>
        </View>

        {/* Visuals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visuals Attached:</Text>
          {weeklyUpdatesData?.uploads?.map((visual, index) => (
            <View key={index} style={styles.visualItem}>
              <Image
                source={{ uri: visual }}
                style={styles.visualImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
        backgroundColor: colors.background,

    paddingHorizontal: 20,
    // paddingVertical: 20,
  },
  projectTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: '#000000',
    marginBottom: 6,
  },
  infoSection: {
    // marginBottom: 20,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },

  infoLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Outfit-Regular',
  },

  labelCol: {
    width: 120, //ensures consistent left column width
    marginRight: 8,
  },

  valueCol: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Outfit-Regular',
    flexWrap: 'wrap',
  },

  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
    borderColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    // marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: '#000000',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 10,
  },
  bullet: {
    fontSize: 14,
    color: '#333333',
    marginRight: 8,
    marginTop: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    lineHeight: 18,
  },
  visualItem: {
    marginBottom: 17,
  },
  visualDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  visualImage: {
    width: width - 40,
    height: 346,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
});

export default ProjectUpdateScreen;
