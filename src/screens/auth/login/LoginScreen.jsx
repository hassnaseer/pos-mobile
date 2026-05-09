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
import notifee, { AndroidImportance } from '@notifee/react-native';
import colors from '../../../theme/colors';
import logo from '../../../assets/images/logo.png';
import showIcon from '../../../assets/icons/eye-open.png';
import hiddenIcon from '../../../assets/icons/eye-closed.png';
import { useAuth } from '../../../context/AuthContext';
import { useLogin } from '../../../services/api/authApi';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState('client'); // 'client' or 'member'
  const loginMutation = useLogin();
  const { mutateAsync, isPending } = loginMutation;

  const handleLogin = async values => {
    try {
      const credentials = { ...values, role: loginType };
      const response = await mutateAsync(credentials);

      const role = loginType === 'client' ? 'client' : response?.user?.role;
      const token =
        loginType === 'client'
          ? response.access_token
          : response?.token?.access_token;
      const userData =
        loginType === 'client' ? response?.client : response?.user;
      const modules = loginType === 'member' ? response?.modules : null;

      await login(userData, token, role, modules);
    } catch (error) {
      console.error('Login failed:', error);

      //  Extract a meaningful backend message
      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please try again.';

      // Show alert to user
      Alert.alert('Login Error', errorMsg);

      // (optional) still log to console for debugging
      console.log('Full error response:', error?.response?.data);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('EmailVerification');
  };

  // 🧪 Test Notification Function
  const sendTestNotification = async () => {
    try {
      // Create channel if not exists
      await notifee.createChannel({
        id: 'default',
        name: 'Default Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500],
      });

      // Display test notification
      const notificationId = await notifee.displayNotification({
        title: '🧪 Test Notification',
        body: 'This is a test notification from the login screen. If you see this, notifications are working! ✅',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          sound: 'default',
          vibrationPattern: [300, 500],
          lightUpScreen: true,
          visibility: 1,
          autoCancel: true,
          showTimestamp: true,
          timestamp: Date.now(),
        },
      });

      Alert.alert(
        'Test Notification Sent! ✅',
        `Notification ID: ${notificationId}\n\nCheck your notification drawer!`,
        [{ text: 'OK' }],
      );
      console.log('🧪 Test notification sent with ID:', notificationId);
    } catch (error) {
      Alert.alert(
        'Notification Failed ❌',
        `Error: ${error.message}\n\nCheck console for details.`,
        [{ text: 'OK' }],
      );
      console.error('❌ Test notification error:', error);
    }
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

        {/* Login Form Container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Login Form</Text>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
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
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Mail ID <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.email && errors.email && styles.inputError,
                    ]}
                    placeholder="john.doe@gmail.com"
                    placeholderTextColor="#666666"
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

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Password <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.passwordInput,
                        touched.password &&
                          errors.password &&
                          styles.inputError,
                      ]}
                      placeholder="*******"
                      placeholderTextColor="#666666"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={showPassword ? showIcon : hiddenIcon}
                        style={styles.eyeImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Login Type Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Login as</Text>
                  <View style={styles.radioContainer}>
                    {/* Client Option */}
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setLoginType('client')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioButton}>
                        {loginType === 'client' && (
                          <View style={styles.radioButtonSelected} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Client</Text>
                    </TouchableOpacity>

                    {/* Other User Option */}
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setLoginType('member')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioButton}>
                        {loginType === 'member' && (
                          <View style={styles.radioButtonSelected} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Member</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleSubmit}
                  disabled={isPending}
                  activeOpacity={0.8}
                >
                  {isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.defaultWhite}
                    />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      Login as{' '}
                      {loginType === 'client' ? 'Client' : 'Member'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Forgot Password */}
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* Test Notification Button */}
                {/* <TouchableOpacity
                  style={styles.testNotificationButton}
                  onPress={sendTestNotification}
                  activeOpacity={0.8}
                >
                  <Text style={styles.testNotificationButtonText}>
                    🧪 Test Notification
                  </Text>
                </TouchableOpacity> */}
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
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    marginBottom: 6,
  },
  required: {
    color: colors.warning,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#B3B3B3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: colors.warning,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1.5,
    borderColor: '#B3B3B3',
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
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
  },
  // Radio Button Styles
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  testNotificationButton: {
    backgroundColor: '#FFA500',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  testNotificationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
  },
});

export default LoginScreen;
