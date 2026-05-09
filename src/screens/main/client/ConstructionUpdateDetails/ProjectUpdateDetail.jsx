import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CircularProgress from '../../../../components/Ui/CircularProgressBar';
import Header from '../../../../components/Header/Header';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';
import photo1 from '../../../../assets/images/visual1.png';
import photo2 from '../../../../assets/images/visual2.png';
import photo3 from '../../../../assets/images/visual3.png';
import photo4 from '../../../../assets/images/visual4.png';
import { useConstructionUpdatesByWeek } from '../../../../services/api/clientApi';
import { formatDate } from '../../../../utils/formatDate';
import LoadingScreen from '../../../../components/LoadingScreen';
const { width } = Dimensions.get('window');

const ProjectUpdateDetail = ({ navigation, route, updateData }) => {
  const { updateId, weekNo, projectName } = route.params;

  const {
    data: weeklyUpdatesData,
    isLoading,
    error,
  } = useConstructionUpdatesByWeek(updateId);

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  if (isLoading) {
    return <LoadingScreen message="Loading weekly update..." />;
  }
  if (error || !weeklyUpdatesData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.message}>No Data Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* <Header
        // onMenuPress={() => navigation.openDrawer()}
        onNotificationPress={handleNotificationPress}
      /> */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Project Title */}
        <Text style={styles.projectTitle}>{projectName}</Text>

        {/* Update Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update Name:</Text>
            <Text style={styles.infoValue}>
              {weeklyUpdatesData?.update_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {formatDate(weeklyUpdatesData?.created_at)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Progress:</Text>
            <Text style={styles.infoValue}>
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
          {weeklyUpdatesData?.update_info ? (
            <Text style={styles.detailsText}>
              {weeklyUpdatesData.update_info}
            </Text>
          ) : (
            <Text style={styles.noVisualText}>
              No details for this project
            </Text>
          )}
        </View>

        {/* Next Steps Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps:</Text>
          {nextSteps.map((step, index) => (
            <View key={index} style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View> */}

        {/* Visuals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visuals Attached:</Text>

          {weeklyUpdatesData?.uploads?.length > 0 ? (
            weeklyUpdatesData.uploads.map((visual, index) => (
              <View key={index} style={styles.visualItem}>
                <Image
                  source={{ uri: visual }}
                  style={styles.visualImage}
                  resizeMode="cover"
                />
              </View>
            ))
          ) : (
            <Text style={styles.noVisualText}>No visuals attached</Text>
          )}
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
    paddingTop: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // white background
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  projectTitle: {
    fontSize: 24,
    color: '#000000',
    fontFamily:'Outfit-SemiBold',
    marginBottom: 10,
  },
  infoSection: {
    // marginBottom: 20,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  infoLabel: {
    fontSize: 16,
    color: '#666666',
    width: 110, // ✅ Fixed width column for labels
    fontFamily: 'Outfit-Regular',
  },

  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Outfit-Regular',
    flex: 1, // ✅ Values take remaining space
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
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
    fontFamily: 'Outfit-Medium',
  },
  detailsText: {
    fontSize: 16,
    color: colors.secondary,
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
  },
 noVisualText: {
  fontSize: 14,
  color: '#888',
  fontFamily:'Outfit-Regular',
  marginTop: 6,
  textAlign: 'center',
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
  noVisualText: {
    textAlign: 'center',
    color: colors.textGray || '#888',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginVertical: 10,
  },

  visualImage: {
    width: width - 40,
    height: 346,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
});

export default ProjectUpdateDetail;
