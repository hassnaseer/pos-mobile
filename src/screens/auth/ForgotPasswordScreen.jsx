import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../theme/colors';
import logo from '../../assets/images/logo.png';
import { useForgotPassword } from '../../services/api/authApi';
const EmailVerificationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

const ForgotPasswordScreen = ({ navigation }) => {
  const forgotPasswordMutation = useForgotPassword();
  const handleSendOTP = async values => {
    try {
      await forgotPasswordMutation.mutateAsync({ email: values.email });
      navigation.navigate('OTPVerification', { email: values.email });
    } catch (error) {
      console.error('Error sending OTP:', error);

      // ✅ Extract backend message safely
      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to send OTP. Please try again.';

      Alert.alert('Error', errorMsg);
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

        {/* Forgot Password Form Container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Forgot Password</Text>
          {/* <Text style={styles.subtitle}>
            Enter your email address and we'll send you a code to reset your password
          </Text> */}

          <Formik
            initialValues={{ email: '' }}
            validationSchema={EmailVerificationSchema}
            onSubmit={handleSendOTP}
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
                    Email Address<Text style={{ color: 'red' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.email && errors.email && styles.inputError,
                    ]}
                    placeholder="Enter your email"
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

                {/* Send Code Button */}
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                  disabled={forgotPasswordMutation.isPending}
                >
                  <Text style={styles.sendButtonText}>
                    {forgotPasswordMutation.isPending
                      ? 'Sending...'
                      : 'Send Code'}
                  </Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
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
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#ffffff',
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
  sendButton: {
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
  sendButtonText: {
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
});

export default ForgotPasswordScreen;
