import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../theme/colors';
import logo from '../../assets/images/logo.png';
import showIcon from '../../assets/icons/eye-open.png';
import hiddenIcon from '../../assets/icons/eye-closed.png';
import { useResetPassword } from '../../services/api/authApi';

const ResetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    // .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    // .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    // .matches(/[0-9]/, 'Password must contain at least one number')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const ResetPasswordScreen = ({ navigation, route }) => {
  const resetPasswordMutation = useResetPassword();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const email = route?.params?.email || '';

  const handleResetPassword = async values => {
    if (!email) {
      Alert.alert('Error', 'Email is missing.');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        email,
        new_password: values.newPassword,
      });

      // Show success and navigate to login
      Alert.alert('Success', 'Your password has been reset.');
      navigation.navigate('Login');
    } catch (error) {
      // Error is already handled in the hook, this is fallback
      console.error('Reset password failed:', error);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Reset Password Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Reset Password</Text>

          <Formik
            initialValues={{ newPassword: '', confirmPassword: '' }}
            validationSchema={ResetPasswordSchema}
            onSubmit={handleResetPassword}
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
                {/* New Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Enter New password<Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.passwordInput,
                        touched.newPassword && errors.newPassword && styles.inputError,
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={values.newPassword}
                      onChangeText={handleChange('newPassword')}
                      onBlur={handleBlur('newPassword')}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={showNewPassword ? showIcon : hiddenIcon}
                        style={styles.eyeImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.newPassword && errors.newPassword && (
                    <Text style={styles.errorText}>{errors.newPassword}</Text>
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
                        touched.confirmPassword && errors.confirmPassword && styles.inputError,
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
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={showConfirmPassword ? showIcon : hiddenIcon}
                        style={styles.eyeImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>

                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsText}>
                    Minimum 8 characters including upper, lower and number
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity onPress={handleBackToLogin}>
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 220,
    height: 80,
  },
  formContainer: {},
  title: {
    fontSize: 32,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {},
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
    backgroundColor: '#ffffff',
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeImage: {
    width: 22,
    height: 22,
    tintColor: '#999',
  },
  errorText: {
    color: colors.warning,
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  requirementsContainer: {
    marginBottom: 20,
  },
  requirementsText: {
    fontSize: 12,
    fontFamily: 'Outfit-Light',
    color: colors.secondary,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  backToLoginText: {
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  inputError: {
    borderColor: colors.warning,
  },
});

export default ResetPasswordScreen;
