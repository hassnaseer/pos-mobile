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
import colors from '../../theme/colors';
import crossIcon from '../../assets/icons/cross-icon.png';
import clipIcon from '../../assets/icons/paperclip-01.png';
import PDFPicker from '../PDFPicker/PDFPicker';
import { useCreateUpcomingProject } from '../../services/api/clientApi';

const CreateProjectByAdmin = ({ visible, onClose, onSuccess }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const createProjectMutation = useCreateUpcomingProject();

  const [formData, setFormData] = useState({
    projectName: '',
    expectedLaunchDate: '',
    uploadedVisuals: [],
    infoPdf: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setFormData({
        projectName: '',
        expectedLaunchDate: '',
        uploadedVisuals: [],
        infoPdf: null,
      });
      setErrors({});
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  // ✅ helper to auto-insert dashes in date
  const formatDateWithDashes = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)}`;
    }

    return formatted;
  };

  // ✅ image selection
  const handleSelectImages = () => {
    const options = { mediaType: 'photo', selectionLimit: 0, quality: 0.8 };
    launchImageLibrary(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick images');
      } else if (response.assets) {
        setFormData(prev => ({ ...prev, uploadedVisuals: response.assets }));
        setErrors(prev => ({ ...prev, uploadedVisuals: '' }));
      }
    });
  };

  const handlePdfSelected = pdfFile => {
    setFormData(prev => ({ ...prev, infoPdf: pdfFile }));
    setErrors(prev => ({ ...prev, infoPdf: '' }));
  };

  const handleRemovePdf = () => {
    setFormData(prev => ({ ...prev, infoPdf: null }));
  };

  const handleRemoveImage = index => {
    setFormData(prev => ({
      ...prev,
      uploadedVisuals: prev.uploadedVisuals.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.projectName.trim())
      newErrors.projectName = 'Project name is required';
    if (!formData.expectedLaunchDate.trim())
      newErrors.expectedLaunchDate = 'Expected launch date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data = new FormData();
      data.append('project_name', formData.projectName);
      data.append('launch_date', formData.expectedLaunchDate);

      formData.uploadedVisuals.forEach((image, index) => {
        data.append('images', {
          uri:
            Platform.OS === 'android'
              ? image.uri
              : image.uri.replace('file://', ''),
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        });
      });

      if (formData.infoPdf) {
        data.append('info_pdf', {
          uri:
            Platform.OS === 'android'
              ? formData.infoPdf.uri
              : formData.infoPdf.uri.replace('file://', ''),
          type: formData.infoPdf.type || 'application/pdf',
          name: formData.infoPdf.name || 'info.pdf',
        });
      }

      await createProjectMutation.mutateAsync(data);
      Alert.alert('Success', 'Project uploaded successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload project.');
    }
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.backdrop} />
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload upcoming project</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.crossIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {/* Project name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Project name<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.projectName && styles.inputError,
                  ]}
                  placeholder="City Corner Complex"
                  value={formData.projectName}
                  onChangeText={text =>
                    setFormData(prev => ({ ...prev, projectName: text }))
                  }
                />
                {errors.projectName && (
                  <Text style={styles.errorText}>{errors.projectName}</Text>
                )}
              </View>

              {/* Launch date with auto dashes */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Expected launch date<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.expectedLaunchDate && styles.inputError,
                  ]}
                  placeholder="DD-MM-YYYY"
                  keyboardType="numeric"
                  maxLength={10}
                  value={formData.expectedLaunchDate}
                  onChangeText={text => {
                    const formatted = formatDateWithDashes(text);
                    setFormData(prev => ({ ...prev, expectedLaunchDate: formatted }));
                  }}
                />
                {errors.expectedLaunchDate && (
                  <Text style={styles.errorText}>
                    {errors.expectedLaunchDate}
                  </Text>
                )}
              </View>

              {/* Upload visuals */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Upload visuals</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={handleSelectImages}
                >
                  <Image source={clipIcon} style={styles.clipIcon} />
                  <Text style={styles.uploadText}>
                    Upload media from your app
                  </Text>
                </TouchableOpacity>

                {formData.uploadedVisuals.length > 0 && (
                  <View style={styles.selectedImagesContainer}>
                    {formData.uploadedVisuals.map((image, index) => (
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
                        >
                          <Image source={crossIcon} style={styles.removeIcon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* PDF Picker */}
              <PDFPicker
                label="Upload info pdf"
                placeholder="Upload pdf"
                selectedPdf={formData.infoPdf}
                onPdfSelected={handlePdfSelected}
                onRemovePdf={handleRemovePdf}
              />

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  createProjectMutation.isPending && styles.uploadButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? (
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
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
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
    paddingVertical: 8,
  },
  form: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    // fontWeight: '500',
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
    // borderStyle: 'dashed',
    padding: 10,
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
  removeIcon:{
    width:20,
    height:20,
    resizeMode:'contain',
  },
  clipIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
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
  removeChipButton: {
    backgroundColor: '#666',
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
});

export default CreateProjectByAdmin;
