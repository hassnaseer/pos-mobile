import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import colors from '../../theme/colors';
import logo from '../../assets/images/logo.png';
import { useVerifyOtp } from '../../services/api/authApi';

const OTPVerificationScreen = ({ navigation, route }) => {
  const verifyOtpMutation = useVerifyOtp();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const email = route?.params?.email || '';

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // const handleVerifyOTP = async () => {
  //   const otpCode = otp.join('');
  //   if (otpCode.length !== 6) {
  //     // Show error - OTP incomplete
  //     return;
  //   }
  //   // API call will be implemented here
  //   console.log('Verify OTP:', otpCode);
  //   // Navigate to Reset Password screen after successful verification
  //   navigation.navigate('ResetPassword');
  // };
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }

    try {
      await verifyOtpMutation.mutateAsync({ email, otp: otpCode });
      navigation.navigate('ResetPassword', { email });
    } catch (error) {
      const message =
        error?.response?.data?.detail || 'OTP verification failed';
      Alert.alert('Error', message);
    }
  };

  // const handleResendCode = () => {
  //   if (!canResend) return;
  //   // API call to resend OTP
  //   console.log('Resend OTP to:', email);
  //   setTimer(60);
  //   setCanResend(false);
  //   setOtp(['', '', '', '', '', '']);
  // };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const isOtpComplete = otp.every(digit => digit !== '');

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

        {/* OTP Verification Container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* OTP Input Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={value => handleOtpChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Timer and Resend */}
          {/* <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerBold}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendCode}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            )}
          </View> */}

          {/* Verify Button */}
          
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!isOtpComplete || verifyOtpMutation.isPending) &&
                styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyOTP}
            activeOpacity={0.8}
            disabled={!isOtpComplete || verifyOtpMutation.isPending}
          >
            {verifyOtpMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
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
    marginBottom: 32,
    lineHeight: 20,
  },
  emailText: {
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    backgroundColor: '#ffffff',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  timerBold: {
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#B3B3B3',
    opacity: 0.6,
  },
  verifyButtonText: {
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

export default OTPVerificationScreen;
