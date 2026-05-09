import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../../theme/colors';
import { useLeadById } from '../../../services/api/adminApi';

const icons = {
  cross: require('../../../assets/icons/cross-icon.png'),
  eyeOpen: require('../../../assets/icons/eye-open.png'),
  eyeClosed: require('../../../assets/icons/eye-closed.png'),
};

const ConvertToClientModal = ({ visible, onClose, onSubmit, leadData }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { data: leadDataById } = useLeadById(leadData?.lead_id);
  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .min(8, 'Minimum 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
  });

  const handleSubmit = values => {
    onSubmit(values);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Convert to Client</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={icons.cross} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              initialValues={{
                password: '',
                confirmPassword: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.form}>
                  {/* Display Lead/Client Information (Read-only) */}
                  <View style={styles.infoSection}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Client Name</Text>
                      <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                          {leadData?.client_name ||
                            leadData?.lead_name ||
                            leadDataById?.full_name ||
                            'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email</Text>
                      <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                          {leadData?.client_email ||
                            leadDataById?.lead_email ||
                            leadDataById?.email ||
                            'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Phone Number</Text>
                      <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                          {leadData?.client_phone ||
                            leadDataById?.lead_phone ||
                            leadDataById?.phone_number ||
                            'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Display Project Information (read-only from sales offer) */}
                  {(leadData?.project_name || leadData?.unit_number) && (
                    <>
                      {leadData?.project_name && (
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Project</Text>
                          <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>
                              {leadData.project_name}
                            </Text>
                          </View>
                        </View>
                      )}
                      {leadData?.unit_number && (
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Unit</Text>
                          <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>
                              {leadData.unit_number}
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {/* Create New Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Create new password<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          errors.password &&
                            touched.password &&
                            styles.inputError,
                        ]}
                        placeholder="Enter password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        value={values.password}
                        onChangeText={handleChange('password')}
                        onBlur={handleBlur('password')}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Image
                          source={
                            showPassword ? icons.eyeOpen : icons.eyeClosed
                          }
                          style={styles.eyeIconImage}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && touched.password ? (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Minimum 8 characters
                      </Text>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Confirm password<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          errors.confirmPassword &&
                            touched.confirmPassword &&
                            styles.inputError,
                        ]}
                        placeholder="********"
                        placeholderTextColor="#999"
                        secureTextEntry={!showConfirmPassword}
                        value={values.confirmPassword}
                        onChangeText={handleChange('confirmPassword')}
                        onBlur={handleBlur('confirmPassword')}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Image
                          source={
                            showConfirmPassword
                              ? icons.eyeOpen
                              : icons.eyeClosed
                          }
                          style={styles.eyeIconImage}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && touched.confirmPassword ? (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Minimum 8 characters
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>Convert</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
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
  infoSection: {
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  readOnlyInput: {
    // backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  readOnlyText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  eyeIconImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Medium',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    // marginTop: 20,
  },
  submitButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    // fontWeight: '600',
    fontFamily: 'Outfit-Medium',
  },
});

export default ConvertToClientModal;
