import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';

const { width } = Dimensions.get('window');

const ProjectVisualsScreen = ({ navigation, route }) => {
  const { project } = route.params;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Get images from project visuals array
  const projectImages = project.visuals || [];

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {projectImages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="image" size={48} color={colors.secondary} />
              <Text style={styles.emptyText}>No visuals available for this project</Text>
            </View>
          ) : (
            <>
              {/* Main Image Display */}
              <View style={styles.mainImageContainer}>
                <Image
                  source={{ uri: projectImages[selectedImageIndex] }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />

                {/* Image Counter */}
                <View style={styles.imageCounter}>
                  <Text style={styles.counterText}>
                    {selectedImageIndex + 1} / {projectImages.length}
                  </Text>
                </View>

                {/* Navigation Arrows */}
                {projectImages.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.navButton, styles.prevButton]}
                      onPress={() => setSelectedImageIndex(
                        selectedImageIndex > 0 ? selectedImageIndex - 1 : projectImages.length - 1
                      )}
                    >
                      <Icon name="keyboard-arrow-left" size={24} color={colors.defaultWhite} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.navButton, styles.nextButton]}
                      onPress={() => setSelectedImageIndex(
                        selectedImageIndex < projectImages.length - 1 ? selectedImageIndex + 1 : 0
                      )}
                    >
                      <Icon name="keyboard-arrow-right" size={24} color={colors.defaultWhite} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          {/* Project Info */}
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.project_name}</Text>
            <Text style={styles.projectDetails}>Unit: {project.unit_no} | {project.type}</Text>
            <Text style={styles.projectDetails}>{project.type_of_bedroom}</Text>
            <Text style={styles.projectDetails}>{project.size_sqft} sq. ft.</Text>
            <Text style={styles.projectPrice}>{project.price_aed?.toLocaleString()} AED</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{project.status}</Text>
            </View>
          </View>

          {/* Image Thumbnails */}
          {projectImages.length > 0 && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.sectionTitle}>All Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbnailList}>
                  {projectImages.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.thumbnail,
                        selectedImageIndex === index && styles.selectedThumbnail
                      ]}
                      onPress={() => setSelectedImageIndex(index)}
                    >
                      <Image
                        source={{ uri: image }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  mainImageContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: width * 0.7,
    backgroundColor: '#F5F5F5',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  counterText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontWeight: '500',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 12,
  },
  nextButton: {
    right: 12,
  },
  projectInfo: {
    backgroundColor: colors.defaultWhite,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  projectDetails: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 4,
  },
  projectPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  thumbnailContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  thumbnailList: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnail: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
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
  statusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProjectVisualsScreen;