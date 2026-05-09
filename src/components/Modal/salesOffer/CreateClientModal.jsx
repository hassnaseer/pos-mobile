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
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../../theme/colors';

// Import custom icons
const icons = {
  cross: require('../../../assets/icons/cross-icon.png'),
};

const ClientSchema = Yup.object().shape({
  full_name: Yup.string().required('Full name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone_number: Yup.string().required('Phone number is required'),
  interested_in: Yup.string().required('Please select bedroom type'),
});

const CreateClientModal = ({
  visible,
  onClose,
  onSubmit,
  editData,
  isEditing,
}) => {
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
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Client' : 'Create a client'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={icons.cross} style={styles.iconClose} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              enableReinitialize={true}
              initialValues={{
                full_name: editData?.full_name || '',
                email: editData?.email || '',
                phone_number: editData?.phone_number || '',
                interested_in: editData?.interested_in || '',
              }}
              validationSchema={ClientSchema}
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
                  {/* Full Name */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Full name<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.full_name &&
                          errors.full_name &&
                          styles.inputError,
                      ]}
                      placeholder="Jaxon Saris"
                      placeholderTextColor="#999"
                      value={values.full_name}
                      onChangeText={handleChange('full_name')}
                      onBlur={handleBlur('full_name')}
                    />
                    {touched.full_name && errors.full_name && (
                      <Text style={styles.errorText}>{errors.full_name}</Text>
                    )}
                  </View>

                  {/* Email */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Email<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.email && errors.email && styles.inputError,
                      ]}
                      placeholder="jaxonsaris@gmail.com"
                      placeholderTextColor="#999"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {touched.email && errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                  </View>

                  {/* Phone Number */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Phone number<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.phone_number &&
                          errors.phone_number &&
                          styles.inputError,
                      ]}
                      placeholder="+971 (555) 123-4567"
                      placeholderTextColor="#999"
                      value={values.phone_number}
                      onChangeText={handleChange('phone_number')}
                      onBlur={handleBlur('phone_number')}
                      keyboardType="phone-pad"
                    />
                    {touched.phone_number && errors.phone_number && (
                      <Text style={styles.errorText}>
                        {errors.phone_number}
                      </Text>
                    )}
                  </View>

                  {/* Interested In */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Interested in<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() => setFieldValue('interested_in', 'Studio')}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.interested_in === 'Studio' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.interested_in === 'Studio' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>Studio</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() =>
                          setFieldValue('interested_in', '1 Bedroom')
                        }
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.interested_in === '1 Bedroom' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.interested_in === '1 Bedroom' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>1 Bedroom</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.radioItem}
                        onPress={() =>
                          setFieldValue('interested_in', '2 Bedroom')
                        }
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            values.interested_in === '2 Bedroom' &&
                              styles.radioSelected,
                          ]}
                        >
                          {values.interested_in === '2 Bedroom' && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text style={styles.radioText}>2 Bedroom</Text>
                      </TouchableOpacity>
                    </View>
                    {touched.interested_in && errors.interested_in && (
                      <Text style={styles.errorText}>
                        {errors.interested_in}
                      </Text>
                    )}
                  </View>

                  {/* Save Button */}
                  {/* Save / Create Button */}
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveButtonText}>
                      {isEditing ? 'Save' : 'Create'}
                    </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // marginTop: 8,
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
    borderColor: '#666666',
    marginRight: 5,
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
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Medium',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: colors.defaultWhite,
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
  },
  iconClose: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
});

export default CreateClientModal;
