import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialIcons';
import crossIcon from '../../../assets/icons/cross-icon.png';
import arrowDownIcon from '../../../assets/icons/arrow-down.png';

import uploadIcon from '../../../assets/icons/paperclip-01.png';
import { launchImageLibrary } from 'react-native-image-picker';
import colors from '../../../theme/colors';
import { useGetProjects } from '../../../services/api/adminApi';

const InventorySchema = Yup.object().shape({
  projectName: Yup.string().required('Project name is required'),
  unitNo: Yup.string()
    .matches(/^[0-9]*\.?[0-9]+$/, 'Unit number must be a valid number')
    .required('Unit number is required'),
  bedroomType: Yup.string().required('Please select bedroom type'),
  type: Yup.string().required('Please select property type'),
  size: Yup.number()
    .positive('Size must be positive')
    .required('Size is required'),
  price: Yup.number()
    .positive('Price must be positive')
    .required('Price is required'),
});

const CreateEditInventoryModal = ({
  visible,
  onClose,
  onSubmit,
  editData,
  isEditing,
  isPending,
}) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [showAddNewProject, setShowAddNewProject] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  // ✅ Fetch all projects from API
  const { data: projectsData, isLoading: isProjectsLoading } = useGetProjects();
  const projects = projectsData || [];
  useEffect(() => {
    if (!visible) {
      setSelectedProject('');
      setShowAddNewProject(false);
    }
  }, [visible]);

  // Load existing visuals when editing
  useEffect(() => {
    if (visible) {
      if (isEditing && editData?.visuals) {
        const existingImages = Array.isArray(editData.visuals)
          ? editData.visuals.map((url, index) => ({
              uri: url,
              fileName: `existing_image_${index + 1}.jpg`,
            }))
          : [];
        setSelectedImages(existingImages);
      } else {
        setSelectedImages([]);
      }
    }
  }, [visible, isEditing, editData]);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        if (apiLevel >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Permission to access gallery',
              message: 'App needs access to your photos',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Permission to access gallery',
              message: 'App needs access to your photos',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const handleImagePick = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access photos from settings',
      );
      return;
    }

    const options = {
      mediaType: 'photo',
      selectionLimit: 0,
      quality: 0.8,
      includeBase64: false,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick images');
      } else if (result.assets && result.assets.length > 0) {
        setSelectedImages(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const removeImage = index => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setSelectedImages([]);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Project' : 'Create new project'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Image source={crossIcon} style={styles.crossIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              enableReinitialize
              initialValues={{
                projectName: editData?.projectName || '',
                unitNo: editData?.unitNo || '',
                bedroomType: editData?.bedroomType || '',
                type: editData?.type || '',
                size: editData?.size?.toString() || '',
                price: editData?.price?.toString() || '',
                visuals: editData?.visuals || '',
              }}
              validationSchema={InventorySchema}
              onSubmit={(values, { setSubmitting }) => {
                if (isPending) {
                  setSubmitting(false);
                  return;
                }
                onSubmit({
                  ...values,
                  projectName: values.projectName,
                  visuals: selectedImages.map(visual => visual.uri),
                  size: parseInt(values.size),
                  price: parseInt(values.price),
                });
                setSubmitting(false);
              }}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                setFieldValue,
                isSubmitting,
              }) => (
                <View style={styles.form}>
                  {/* ✅ Project Name Section with API-based Dropdown */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Project Name<Text style={{ color: 'red' }}>*</Text>
                    </Text>

                    {/* Dropdown for existing projects */}
                    <TouchableOpacity
                      style={[
                        styles.dropdownContainer,
                        isEditing && {
                          opacity: 0.6,
                          backgroundColor: '#F5F5F5',
                        }, // subtle disabled style
                      ]}
                      onPress={() => {
                        if (!isEditing) setShowProjectDropdown(true); // prevent opening when editing
                      }}
                      activeOpacity={isEditing ? 1 : 0.7} // no visual feedback when disabled
                      disabled={isEditing} // block touches completely
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          isEditing && { color: '#000' },
                        ]}
                      >
                        {values?.projectName
                          ? values.projectName
                          : selectedProject
                          ? selectedProject
                          : 'Add existing project'}
                      </Text>
                      <Image
                        source={arrowDownIcon}
                        style={[
                          styles.crossIcon,
                          isEditing && { tintColor: '#aaa' },
                        ]}
                      />
                    </TouchableOpacity>
                    {/* + Add new project button */}
                    <TouchableOpacity
                      style={[
                        styles.addNewButton,
                        isEditing && { opacity: 0.5 },
                      ]}
                      onPress={() =>
                        !isEditing && setShowAddNewProject(!showAddNewProject)
                      }
                      disabled={isEditing}
                    >
                      {/* <Icon
                        name="add-circle-outline"
                        size={20}
                        color={colors.primary}
                      /> */}
                      <Text
                        style={[
                          styles.addNewText,
                          isEditing && { color: '#999' },
                        ]}
                      >
                        Add New Project
                      </Text>
                    </TouchableOpacity>

                    {/* Input for typing new project */}
                    {showAddNewProject && !isEditing && (
                      <TextInput
                        style={[
                          styles.input,
                          touched.projectName &&
                            errors.projectName &&
                            styles.inputError,
                        ]}
                        placeholder="Enter new project name"
                        placeholderTextColor="#999"
                        value={values.projectName}
                        onChangeText={text => {
                          if (!isEditing) handleChange('projectName')(text); // disable editing when in edit mode
                        }}
                        onBlur={handleBlur('projectName')}
                        disabled={!isEditing}
                      />
                    )}

                    {touched.projectName && errors.projectName && (
                      <Text style={styles.errorText}>{errors.projectName}</Text>
                    )}
                  </View>

                  {/* ✅ Modal for existing projects list */}
                  <Modal
                    visible={showProjectDropdown}
                    transparent
                    animationType="fade"
                  >
                    <View style={styles.projectsModal}>
                      <View style={styles.dropdownModalContainer}>
                        <Text style={styles.modalTitle}>
                          Select Existing Project
                        </Text>

                        {isProjectsLoading ? (
                          <Text
                            style={{ textAlign: 'center', marginVertical: 10 }}
                          >
                            Loading projects...
                          </Text>
                        ) : (
                          <FlatList
                            data={projectsData}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={styles.projectItem}
                                onPress={() => {
                                  setSelectedProject(item.project_name);
                                  setFieldValue(
                                    'projectName',
                                    item.project_name,
                                  );
                                  setShowProjectDropdown(false);
                                }}
                              >
                                <Text style={styles.projectText}>
                                  {item.project_name}
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        )}

                        <TouchableOpacity
                          onPress={() => setShowProjectDropdown(false)}
                          style={styles.closeButton}
                        >
                          <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>

                  {/* Unit No */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Unit no.<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.unitNo && errors.unitNo && styles.inputError,
                      ]}
                      placeholder="310"
                      placeholderTextColor="#999"
                      value={values.unitNo}
                      onChangeText={text => {
                        // Allow only numeric characters
                        const numericText = text.replace(/[^0-9]/g, '');
                        setFieldValue('unitNo', numericText);
                      }}
                      onBlur={handleBlur('unitNo')}
                      keyboardType="number-pad"
                      maxLength={6} // optional limit, adjust if needed
                    />

                    {touched.unitNo && errors.unitNo && (
                      <Text style={styles.errorText}>{errors.unitNo}</Text>
                    )}
                  </View>

                  {/* Bedroom Type */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Bedroom Type<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() => setFieldValue('bedroomType', 'Studio')}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.bedroomType === 'Studio' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.bedroomType === 'Studio' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>Studio</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() =>
                          setFieldValue('bedroomType', '1 Bedroom')
                        }
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.bedroomType === '1 Bedroom' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.bedroomType === '1 Bedroom' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>1 Bedroom</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() =>
                          setFieldValue('bedroomType', '2 Bedroom')
                        }
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.bedroomType === '2 Bedroom' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.bedroomType === '2 Bedroom' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>2 Bedroom</Text>
                      </TouchableOpacity>
                    </View>
                    {touched.bedroomType && errors.bedroomType && (
                      <Text style={styles.errorText}>{errors.bedroomType}</Text>
                    )}
                  </View>

                  {/* Property Type */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Property Type<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() => setFieldValue('type', 'Flat')}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.type === 'Flat' && styles.radioSelected,
                          ]}
                        >
                          {values.type === 'Flat' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>Flat</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() => setFieldValue('type', 'Apartment')}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.type === 'Apartment' && styles.radioSelected,
                          ]}
                        >
                          {values.type === 'Apartment' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>Apartment</Text>
                      </TouchableOpacity>
                    </View>
                    {touched.type && errors.type && (
                      <Text style={styles.errorText}>{errors.type}</Text>
                    )}
                  </View>

                  {/* Size and Price */}
                  <View style={styles.rowInputs}>
                    <View
                      style={[
                        styles.inputContainer,
                        { flex: 1, marginRight: 8 },
                      ]}
                    >
                      <Text style={styles.label}>
                        Size<Text style={{ color: 'red' }}>*</Text>
                      </Text>
                      <View style={styles.sizeInputContainer}>
                        <TextInput
                          style={[
                            styles.sizeInput,
                            touched.size && errors.size && styles.inputError,
                          ]}
                          placeholder="456"
                          placeholderTextColor="#999"
                          value={values.size}
                          onChangeText={handleChange('size')}
                          onBlur={handleBlur('size')}
                          keyboardType="numeric"
                        />
                        <Text style={styles.sizeUnit}>sq. ft.</Text>
                      </View>
                      {touched.size && errors.size && (
                        <Text style={styles.errorText}>{errors.size}</Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.inputContainer,
                        { flex: 1, marginLeft: 8 },
                      ]}
                    >
                      <Text style={styles.label}>Price*</Text>
                      <View style={styles.priceInputContainer}>
                        <TextInput
                          style={[
                            styles.priceInput,
                            touched.price && errors.price && styles.inputError,
                          ]}
                          placeholder="503750"
                          placeholderTextColor="#999"
                          value={values.price}
                          onChangeText={handleChange('price')}
                          onBlur={handleBlur('price')}
                          keyboardType="numeric"
                        />
                        <Text style={styles.priceUnit}>AED</Text>
                      </View>
                      {touched.price && errors.price && (
                        <Text style={styles.errorText}>{errors.price}</Text>
                      )}
                    </View>
                  </View>

                  {/* Upload Visuals */}
                  <View style={styles.uploadContainer}>
                    <Text style={styles.label}>Upload visuals</Text>
                    <TouchableOpacity
                      style={styles.uploadMainButton}
                      onPress={handleImagePick}
                    >
                      <Image source={uploadIcon} style={styles.crossIcon} />
                      <Text style={styles.uploadMainText}>
                        Upload media from your computer
                      </Text>
                    </TouchableOpacity>

                    {/* Selected Images Preview */}
                    {selectedImages.length > 0 && (
                      <View style={styles.selectedImagesContainer}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {selectedImages.map((image, index) => (
                            <View
                              key={index}
                              style={styles.imagePreviewContainer}
                            >
                              <Image
                                source={{ uri: image.uri }}
                                style={styles.imagePreview}
                              />
                              <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => removeImage(index)}
                              >
                                <Image
                                  source={crossIcon}
                                  style={styles.crossStyle}
                                />
                              </TouchableOpacity>
                              <Text style={styles.imageName} numberOfLines={1}>
                                {image.fileName || `Image ${index + 1}`}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Create Button */}
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (isPending || isSubmitting) && { opacity: 0.6 },
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={isPending || isSubmitting}
                  >
                    {isPending || isSubmitting ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.defaultWhite}
                      />
                    ) : (
                      <Text style={styles.createButtonText}>
                        {isEditing ? 'Update' : 'Create'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  projectsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    // paddingHorizontal:20,
  },
  createModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '100%',
  },
  crossIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  modalContent: {
    maxHeight: '100%',
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    // marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sizeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  sizeInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',

    color: colors.text,
  },
  sizeUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  priceUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  uploadContainer: {
    marginBottom: 14,
  },
  uploadMainButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    // borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadMainText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'Outfit-Medium',
  },
  selectedImagesContainer: {
    marginTop: 12,
  },
  crossStyle: {
    width: 10,
    height: 10,
    resizeMode: 'contain',
    tintColor: colors.defaultWhite,
  },
  imagePreviewContainer: {
    marginRight: 12,
    alignItems: 'center',
    width: 80,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: -6,
    backgroundColor: colors.warning,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageName: {
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  dropdownModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    maxHeight: '70%',
    padding: 16,
    // marginHorizontal:20,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E6EA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // backgroundColor: '#FAFAFA',
    marginTop: 6,
  },

  addNewButton: {
    borderWidth: 1,
    borderColor: '#E2E6EA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    marginVertical: 10,
  },

  addNewText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: 'Outfit-Medium',
    textAlign: 'center',
  },

  projectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  projectText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Outfit-Regular',
  },
  closeButton: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeButtonText: {
    color: colors.defaultWhite,
    fontFamily: 'Outfit-Medium',
  },
});

export default CreateEditInventoryModal;
