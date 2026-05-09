import React, { useState, useEffect } from 'react';
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
import RoleDropdown from '../../Dropdown/RoleDropdown';
import colors from '../../../theme/colors';

// Import icons
const closeIcon = require('../../../assets/icons/cross-icon.png');
const eyeOpenIcon = require('../../../assets/icons/eye-open.png');
const eyeClosedIcon = require('../../../assets/icons/eye-closed.png');

// Member Form Schema
// Member Form Schema
const MemberSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .matches(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    )
    .required('Email is required'),
  password: Yup.string().when('$isEdit', {
    is: false,
    then: schema =>
      schema
        .min(6, 'Password must be at least 8 characters')
        .required('Password is required'),
    otherwise: schema =>
      schema.min(6, 'Password must be at least 8 characters'),
  }),
  confirmPassword: Yup.string().when('password', {
    is: val => val && val.length > 0,
    then: schema =>
      schema
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
    otherwise: schema => schema,
  }),
  role: Yup.string().required('Role is required'),
});

const AddEditMemberModal = ({
  visible,
  onClose,
  onSubmit,
  member,
  isEdit,
  fieldErrors = "",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  //  Local backend error state synced with parent prop
  const [backendErrors, setBackendErrors] = useState('');
  console.log('Errorsssssssssss', backendErrors);

  useEffect(() => {
    setBackendErrors(fieldErrors || '');
  }, [fieldErrors]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.memberModalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Member' : 'Add New Member'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={closeIcon} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              enableReinitialize
              initialValues={{
                name: member?.name || '',
                email: member?.email || '',
                password: '',
                confirmPassword: '',
                role: member?.role || '',
              }}
              validationSchema={MemberSchema}
              validateOnMount={false}
              context={{ isEdit }}
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
                  {/* Name */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Member Name<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.name && errors.name && styles.inputError,
                      ]}
                      placeholder="Enter full name"
                      placeholderTextColor="#999"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                    />
                    {touched.name && errors.name && (
                      <Text style={styles.errorText}>{errors.name}</Text>
                    )}
                  </View>

                  {/* Role */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Role<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <RoleDropdown
                      value={values.role}
                      onSelect={role => setFieldValue('role', role)}
                      placeholder="Select role"
                      error={errors.role}
                      touched={touched.role}
                    />
                  </View>

                  {/*  Email Field */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Email Address<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
                          styles.input,
                          ((touched.email && errors.email) || backendErrors) &&
                            styles.inputError,
                        ]}
                        placeholder="Enter email address"
                        placeholderTextColor="#999"
                        value={values.email}
                        onChangeText={text => {
                          handleChange('email')(text);
                          if (backendErrors) setBackendErrors('');
                        }}
                        onBlur={handleBlur('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    {(touched.email && errors.email) || backendErrors ? (
                      <Text style={styles.errorText}>
                        {errors.email || backendErrors}
                      </Text>
                    ) : null}
                  </View>

                  {/* Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Password
                      {isEdit ? '' : <Text style={{ color: 'red' }}>*</Text>}
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.passwordInput,
                          touched.password &&
                            errors.password &&
                            styles.inputError,
                        ]}
                        placeholder={
                          isEdit
                            ? 'Leave blank to keep current password'
                            : 'Enter password'
                        }
                        placeholderTextColor="#999"
                        value={values.password}
                        onChangeText={handleChange('password')}
                        onBlur={handleBlur('password')}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Image
                          source={showPassword ? eyeOpenIcon : eyeClosedIcon}
                          style={styles.eyeIconImage}
                        />
                      </TouchableOpacity>
                    </View>
                    {touched.password && errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Confirm Password<Text style={{ color: 'red' }}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.passwordInput,
                          touched.confirmPassword &&
                            errors.confirmPassword &&
                            styles.inputError,
                        ]}
                        placeholder="Re-enter password"
                        placeholderTextColor="#999"
                        value={values.confirmPassword}
                        onChangeText={handleChange('confirmPassword')}
                        onBlur={handleBlur('confirmPassword')}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Image
                          source={
                            showConfirmPassword ? eyeOpenIcon : eyeClosedIcon
                          }
                          style={styles.eyeIconImage}
                        />
                      </TouchableOpacity>
                    </View>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitButtonText}>
                      {isEdit ? 'Update Member' : 'Add Member'}
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
    alignItems: 'center',
  },
  memberModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '90%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
  },
  closeIcon: {
    width: 18,
    height: 18,
    tintColor: colors.text,
  },
  modalContent: {
    maxHeight: '100%',
  },
  form: {
    paddingHorizontal: 20,
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
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#B3B3B3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
    backgroundColor: '#ffffff',
    flex: 1,
  },
  passwordInput: {
    paddingRight: 45,
    paddingLeft: 16,
  },
  inputIcon: {
    width: 20,
    height: 20,
    position: 'absolute',
    left: 14,
    zIndex: 1,
    tintColor: colors.secondary,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeIconImage: {
    width: 20,
    height: 20,
    tintColor: colors.secondary,
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchDescription: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
});

export default AddEditMemberModal;
