import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import ProjectDropdown from '../../Dropdown/ProjectDropdown';
import UnitDropdown from '../../Dropdown/UnitDropdown';
import colors from '../../../theme/colors';

const icons = {
  cross: require('../../../assets/icons/cross-icon.png'),
};

const OfferSchema = Yup.object().shape({
  project: Yup.string().required('Project is required'),
  unit: Yup.string().required('Unit is required'),
  propertySize: Yup.number()
    .positive('Property size must be positive')
    .required('Property size is required'),
  pricePerSqFt: Yup.number()
    .positive('Price per sq. ft. must be positive')
    .required('Price per sq. ft. is required'),
  totalPrice: Yup.number()
    .positive('Total price must be positive')
    .required('Total price is required'),
});

const SendOfferModal = ({ visible, onClose, onSubmit, isPending }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Offer</Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={icons.cross} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              initialValues={{
                project: '',
                unit: '',
                propertySize: '',
                pricePerSqFt: '',
                totalPrice: '',
              }}
              validationSchema={OfferSchema}
              onSubmit={onSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                setFieldValue,
              }) => (
                <View style={styles.form}>
                  {/* Select Project */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Select project<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <ProjectDropdown
                      value={values.project}
                      onSelect={project => {
                        // Store project ID for filtering units
                        setFieldValue('project', project.id);
                        // Clear unit selection when project changes
                        setFieldValue('unit', '');
                        setFieldValue('propertySize', '');
                        setFieldValue('pricePerSqFt', '');
                        setFieldValue('totalPrice', '');
                      }}
                      placeholder="Aizel Tower"
                      error={errors.project}
                      touched={touched.project}
                    />
                  </View>

                  {/* Select Unit */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Select unit<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <UnitDropdown
                      value={values.unit}
                      selectedProjectId={values.project}
                      onSelect={unit => {
                        // Set unit ID
                        setFieldValue('unit', unit.id);
                        // Auto-populate size and price from unit
                        if (unit.size_sqft) {
                          setFieldValue(
                            'propertySize',
                            unit.size_sqft.toString(),
                          );
                        }
                        if (unit.price_aed) {
                          const pricePerSqFt = unit.size_sqft
                            ? (unit.price_aed / unit.size_sqft).toFixed(2)
                            : '';
                          setFieldValue('pricePerSqFt', pricePerSqFt);
                          setFieldValue(
                            'totalPrice',
                            unit.price_aed.toString(),
                          );
                        }
                      }}
                      placeholder="Flat 109"
                      error={errors.unit}
                      touched={touched.unit}
                    />
                  </View>

                  {/* Property/Unit Size - Read Only */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Property/Unit size
                    </Text>
                    <View style={[styles.sizeInputContainer, styles.readOnlyContainer]}>
                      <TextInput
                        style={[
                          styles.sizeInput,
                          styles.readOnlyInput,
                          touched.propertySize &&
                            errors.propertySize &&
                            styles.inputError,
                        ]}
                        placeholder="Auto-filled from unit"
                        placeholderTextColor="#999"
                        value={values.propertySize}
                        editable={false}
                      />
                      <Text style={styles.sizeUnit}>sq. ft.</Text>
                    </View>
                    {touched.propertySize && errors.propertySize && (
                      <Text style={styles.errorText}>
                        {errors.propertySize}
                      </Text>
                    )}
                  </View>

                  {/* Price per sq. ft. - Read Only */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Price per sq. ft.
                    </Text>
                    <View style={[styles.priceInputContainer, styles.readOnlyContainer]}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          styles.readOnlyInput,
                          touched.pricePerSqFt &&
                            errors.pricePerSqFt &&
                            styles.inputError,
                        ]}
                        placeholder="Auto-filled from unit"
                        placeholderTextColor="#999"
                        value={values.pricePerSqFt}
                        editable={false}
                      />
                      <Text style={styles.priceUnit}>AED</Text>
                    </View>
                    {touched.pricePerSqFt && errors.pricePerSqFt && (
                      <Text style={styles.errorText}>
                        {errors.pricePerSqFt}
                      </Text>
                    )}
                  </View>

                  {/* Total Price - Read Only */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Total price
                    </Text>
                    <View style={[styles.priceInputContainer, styles.readOnlyContainer]}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          styles.readOnlyInput,
                          touched.totalPrice &&
                            errors.totalPrice &&
                            styles.inputError,
                        ]}
                        placeholder="Auto-filled from unit"
                        placeholderTextColor="#999"
                        value={values.totalPrice}
                        editable={false}
                      />
                      <Text style={styles.priceUnit}>AED</Text>
                    </View>
                    {touched.totalPrice && errors.totalPrice && (
                      <Text style={styles.errorText}>{errors.totalPrice}</Text>
                    )}
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity
                    style={[styles.generateButton, isPending && styles.generateButtonDisabled]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <ActivityIndicator size="small" color={colors.defaultWhite} />
                    ) : (
                      <Text style={styles.generateButtonText}>
                        Generate sales offer
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
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  closeIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
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
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
    color: colors.text,
  },
  sizeUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  priceUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
  },
  readOnlyContainer: {
    backgroundColor: '#F5F5F5',
    // borderColor: '#D0D0D0',
  },
  readOnlyInput: {
    // backgroundColor: '#F5F5F5',
    color: '#666',
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
});

export default SendOfferModal;