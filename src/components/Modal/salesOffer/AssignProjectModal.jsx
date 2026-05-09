import React, { useState } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProjectDropdown from '../../Dropdown/ProjectDropdown';
import colors from '../../../theme/colors';

const icons = {
  cross: require('../../../assets/icons/cross-icon.png'),
};

// ✅ Validation Schema
const AssignProjectSchema = Yup.object().shape({
  project: Yup.string().required('Project is required'),
  password: Yup.string()
    .min(8, 'Minimum 8 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const AssignProjectModal = ({ visible, onClose, projectName, onSubmit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Project</Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={icons.cross} style={styles.iconClose} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Formik
              initialValues={{
                project: projectName || '',
                password: '',
                confirmPassword: '',
              }}
              validationSchema={AssignProjectSchema}
              onSubmit={(values, { resetForm }) => {
                onSubmit(values);
                resetForm();
                onClose(); // ✅ Auto-close after submit
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
              }) => (
                <View style={styles.form}>
                  {/* Project Field */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Select a project*</Text>

                    {/* If dropdown is implemented, use it below */}
                    {/* <ProjectDropdown
                      value={values.project}
                      onSelect={(project) => setFieldValue('project', project.id)}
                      placeholder="Select project"
                      error={errors.project}
                      touched={touched.project}
                    /> */}

                    {/* Fallback to text input for now */}
                    <TextInput
                      style={[
                        styles.textInput,
                        touched.project && errors.project && styles.inputError,
                      ]}
                      placeholder="Enter or select project"
                      placeholderTextColor="#999"
                      value={values.project}
                      onChangeText={handleChange('project')}
                      onBlur={handleBlur('project')}
                    />
                    {touched.project && errors.project && (
                      <Text style={styles.errorText}>{errors.project}</Text>
                    )}
                  </View>

                  {/* Password Field */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Create new password*</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          touched.password &&
                            errors.password &&
                            styles.inputError,
                        ]}
                        placeholder="••••••••"
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
                        <Icon
                          name={showPassword ? 'visibility' : 'visibility-off'}
                          size={20}
                          color={colors.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {touched.password && errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                    <Text style={styles.helperText}>Minimum 8 characters</Text>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm password*</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          touched.confirmPassword &&
                            errors.confirmPassword &&
                            styles.inputError,
                        ]}
                        placeholder="••••••••"
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
                        <Icon
                          name={
                            showConfirmPassword
                              ? 'visibility'
                              : 'visibility-off'
                          }
                          size={20}
                          color={colors.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                    <Text style={styles.helperText}>Minimum 8 characters</Text>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
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

// ✅ Styles
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 12,
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
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: colors.defaultBlack,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '500',
  },
  iconClose: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});

export default AssignProjectModal;
