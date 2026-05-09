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

// Import custom icons
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

const GenerateOfferModal = ({ visible, onClose, onSubmit, isPending }) => {
  const calculateTotalPrice = (size, pricePerSqFt) => {
    if (size && pricePerSqFt) {
      return (parseFloat(size) * parseFloat(pricePerSqFt)).toFixed(0);
    }
    return '';
  };

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
              <Image source={icons.cross} style={styles.iconClose} />
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
                      Select units<Text style={{ color: 'red' }}>*</Text>
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

                  {/* Property/Unit Size */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Property/Unit size<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.sizeInputContainer}>
                      <TextInput
                        style={[
                          styles.sizeInput,
                          touched.propertySize &&
                            errors.propertySize &&
                            styles.inputError,
                        ]}
                        placeholder="500"
                        placeholderTextColor="#999"
                        value={values.propertySize}
                        onChangeText={value => {
                          handleChange('propertySize')(value);
                          const total = calculateTotalPrice(
                            value,
                            values.pricePerSqFt,
                          );
                          setFieldValue('totalPrice', total);
                        }}
                        onBlur={handleBlur('propertySize')}
                        keyboardType="numeric"
                      />
                      <Text style={styles.sizeUnit}>sq. ft.</Text>
                    </View>
                    {touched.propertySize && errors.propertySize && (
                      <Text style={styles.errorText}>
                        {errors.propertySize}
                      </Text>
                    )}
                  </View>

                  {/* Price per sq. ft. */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Price per sq. ft.<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          touched.pricePerSqFt &&
                            errors.pricePerSqFt &&
                            styles.inputError,
                        ]}
                        placeholder="1250"
                        placeholderTextColor="#999"
                        value={values.pricePerSqFt}
                        onChangeText={value => {
                          handleChange('pricePerSqFt')(value);
                          const total = calculateTotalPrice(
                            values.propertySize,
                            value,
                          );
                          setFieldValue('totalPrice', total);
                        }}
                        onBlur={handleBlur('pricePerSqFt')}
                        keyboardType="numeric"
                      />
                      <Text style={styles.priceUnit}>AED</Text>
                    </View>
                    {touched.pricePerSqFt && errors.pricePerSqFt && (
                      <Text style={styles.errorText}>
                        {errors.pricePerSqFt}
                      </Text>
                    )}
                  </View>

                  {/* Total Price */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Total price<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          touched.totalPrice &&
                            errors.totalPrice &&
                            styles.inputError,
                        ]}
                        placeholder="625,000"
                        placeholderTextColor="#999"
                        value={values.totalPrice}
                        onChangeText={handleChange('totalPrice')}
                        onBlur={handleBlur('totalPrice')}
                        keyboardType="numeric"
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
                    style={[
                      styles.generateButton,
                      isPending && styles.generateButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.defaultWhite}
                      />
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
    paddingHorizontal: 20,
    paddingTop: 14,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  modalContent: {
    maxHeight: '100%',
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 8,
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
    fontFamily: 'Outfit-Regular',
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
    marginLeft:10,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  sizeUnit: {
    paddingHorizontal: 12,
    fontSize: 14,
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
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
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
  iconClose: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});

export default GenerateOfferModal;
