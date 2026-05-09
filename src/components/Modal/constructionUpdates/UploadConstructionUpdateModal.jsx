import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../../theme/colors';
import crossIcon from '../../../assets/icons/cross-icon.png';
import uploadIcon from '../../../assets/icons/paperclip-01.png';
import { useUploadConstructionUpdate } from '../../../services/api/adminApi';
import { ChevronDown } from 'lucide-react-native';
const UploadConstructionUpdateModal = ({
  visible,
  onClose,
  onSuccess,
  clientData,
  selectedProject: initialProject,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const uploadUpdateMutation = useUploadConstructionUpdate();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    updateName: '',
    weekNo: '',
    approxPercentageCompletion: '',
    updateInfo: '',
    visualFiles: [],
    selectedProject: initialProject || null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Set initial project if provided
      if (initialProject) {
        setFormData(prev => ({ ...prev, selectedProject: initialProject }));
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Reset form when modal closes
      setTimeout(() => {
        setFormData({
          updateName: '',
          weekNo: '',
          approxPercentageCompletion: '',
          updateInfo: '',
          visualFiles: [],
          selectedProject: null,
        });
        setErrors({});
      }, 200);
    }
  }, [visible, slideAnim, initialProject]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  // Handle image selection
  const handleSelectImages = () => {
    const options = {
      mediaType: 'photo',
      selectionLimit: 0, // 0 means no limit
      quality: 0.8,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick images');
      } else if (response.assets) {
        setFormData(prev => ({
          ...prev,
          visualFiles: [...prev.visualFiles, ...response.assets],
        }));
        setErrors(prev => ({ ...prev, visualFiles: '' }));
      }
    });
  };

  // Remove selected image
  const handleRemoveImage = index => {
    setFormData(prev => ({
      ...prev,
      visualFiles: prev.visualFiles.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.updateName.trim()) {
      newErrors.updateName = 'Update name is required';
    }

    if (!formData.weekNo.trim()) {
      newErrors.weekNo = 'Week number is required';
    } else if (isNaN(formData.weekNo) || parseInt(formData.weekNo) <= 0) {
      newErrors.weekNo = 'Week number must be a positive number';
    }

    if (!formData.approxPercentageCompletion.trim()) {
      newErrors.approxPercentageCompletion =
        'Percentage completion is required';
    } else {
      const percentage = parseFloat(formData.approxPercentageCompletion);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.approxPercentageCompletion =
          'Percentage must be between 0 and 100';
      }
    }

    if (!formData.selectedProject?.inprogress_id) {
      newErrors.selectedProject = 'Please select a project';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Create FormData
      const data = new FormData();

      // Append required fields
      data.append('update_name', formData.updateName);
      data.append('week_no', parseInt(formData.weekNo));
      data.append(
        'approx_percentage_completion',
        parseFloat(formData.approxPercentageCompletion),
      );
      data.append('inprogress_id', formData.selectedProject.inprogress_id);

      // Append optional update info
      if (formData.updateInfo.trim()) {
        data.append('update_info', formData.updateInfo);
      }

      // Append images
      formData.visualFiles.forEach((image, index) => {
        const imageFile = {
          uri:
            Platform.OS === 'android'
              ? image.uri
              : image.uri.replace('file://', ''),
          type: image.type || 'image/jpeg',
          name: image.fileName || `visual_${index}.jpg`,
        };
        data.append('visual_files', imageFile);
      });

      // Make API call using mutation hook
      await uploadUpdateMutation.mutateAsync(data);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to upload update. Please try again.',
      );
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.backdrop} />
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY }] }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload new update</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.crossIcon} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {/* Select Project */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Select project<Text style={styles.star}>*</Text>
                </Text>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.dropdownInput,
                      errors.selectedProject && styles.inputError,
                    ]}
                    onPress={() => setShowProjectDropdown(!showProjectDropdown)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        !formData.selectedProject && styles.placeholderText,
                      ]}
                    >
                      {formData.selectedProject?.project_name ||
                        'Select Project'}
                    </Text>
                    <ChevronDown
                      name="arrow-drop-down"
                      size={24}
                      color={colors.secondary}
                    />
                  </TouchableOpacity>

                  {/* Custom Dropdown Menu */}
                  {showProjectDropdown && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView
                        nestedScrollEnabled
                        style={{ maxHeight: 150 }}
                      >
                        {clientData?.units?.map((project, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData(prev => ({
                                ...prev,
                                selectedProject: project,
                              }));
                              setErrors(prev => ({
                                ...prev,
                                selectedProject: '',
                              }));
                              setShowProjectDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>
                              {project.project_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                {errors.selectedProject && (
                  <Text style={styles.errorText}>{errors.selectedProject}</Text>
                )}
              </View>

              {/* Update Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Update name<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.updateName && styles.inputError]}
                  placeholder="Exterior Walls & Insulation Progress"
                  placeholderTextColor="#999"
                  value={formData.updateName}
                  onChangeText={text => {
                    setFormData(prev => ({ ...prev, updateName: text }));
                    setErrors(prev => ({ ...prev, updateName: '' }));
                  }}
                />
                {errors.updateName && (
                  <Text style={styles.errorText}>{errors.updateName}</Text>
                )}
              </View>

              {/* Week Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Week no.<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.weekNo && styles.inputError]}
                  placeholder="4"
                  placeholderTextColor="#999"
                  value={formData.weekNo}
                  onChangeText={text => {
                    setFormData(prev => ({ ...prev, weekNo: text }));
                    setErrors(prev => ({ ...prev, weekNo: '' }));
                  }}
                  keyboardType="numeric"
                />
                {errors.weekNo && (
                  <Text style={styles.errorText}>{errors.weekNo}</Text>
                )}
              </View>

              {/* Percentage Completion */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Approx. percentile completion
                  <Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.approxPercentageCompletion && styles.inputError,
                  ]}
                  placeholder="65%"
                  placeholderTextColor="#999"
                  value={formData.approxPercentageCompletion}
                  onChangeText={text => {
                    setFormData(prev => ({
                      ...prev,
                      approxPercentageCompletion: text,
                    }));
                    setErrors(prev => ({
                      ...prev,
                      approxPercentageCompletion: '',
                    }));
                  }}
                  keyboardType="numeric"
                />
                {errors.approxPercentageCompletion && (
                  <Text style={styles.errorText}>
                    {errors.approxPercentageCompletion}
                  </Text>
                )}
              </View>

              {/* Upload Visuals */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Upload visuals<Text style={styles.star}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={handleSelectImages}
                  activeOpacity={0.7}
                >
                  <Image source={uploadIcon} style={styles.crossIcon} />

                  <Text style={styles.uploadText}>Select Images</Text>
                </TouchableOpacity>

                {/* Display selected images */}
                {formData.visualFiles.length > 0 && (
                  <View style={styles.selectedImagesContainer}>
                    {formData.visualFiles.map((image, index) => (
                      <View key={index} style={styles.imageChip}>
                        <Image
                          source={{ uri: image.uri }}
                          style={styles.thumbnailImage}
                        />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {image.fileName || `Image ${index + 1}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveImage(index)}
                          style={styles.removeChipButton}
                        >
                          <Image source={crossIcon} style={styles.crossStyle} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {errors.visualFiles && (
                  <Text style={styles.errorText}>{errors.visualFiles}</Text>
                )}
              </View>

              {/* Update Info */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Update info<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    errors.updateInfo && styles.inputError,
                  ]}
                  placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                  placeholderTextColor="#999"
                  value={formData.updateInfo}
                  onChangeText={text => {
                    setFormData(prev => ({ ...prev, updateInfo: text }));
                    setErrors(prev => ({ ...prev, updateInfo: '' }));
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.updateInfo && (
                  <Text style={styles.errorText}>{errors.updateInfo}</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  uploadUpdateMutation.isPending && styles.uploadButtonDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={uploadUpdateMutation.isPending}
              >
                {uploadUpdateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  closeButton: {
    padding: 4,
  },
  crossIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  modalContent: {
    paddingHorizontal: 16,
    // paddingVertical: 8,
  },
  form: {
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
    minWidth: 110,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  star: {
    color: 'red',
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    minHeight: 100,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  selectedImagesContainer: {
    marginTop: 12,
    gap: 8,
  },
  imageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  thumbnailImage: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  chipText: {
    flex: 1,
    fontSize: 14,
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Regular',
  },
  crossStyle: {
    tintColor: 'red',
    width: 14,
    height: 14,
  },

  removeChipButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-Medium',
  },
  //dropdown
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.defaultWhite,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    elevation: 5,
    zIndex: 10,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
});

export default UploadConstructionUpdateModal;
