import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import colors from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useVerifyOtpMutation, useResendCodeMutation } from '../../services/api/authApi';

const RESEND_COOLDOWN = 60;

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, flow = 'login' } = route.params ?? {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);
  const { login } = useAuth();

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resendDisabled, setResendDisabled] = useState(true);
  const timerRef = useRef(null);

  const { mutateAsync: verifyOtp, isPending } = useVerifyOtpMutation();
  const { mutateAsync: resendCode, isPending: resending } = useResendCodeMutation();

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    setResendDisabled(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (text, idx) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned && text) return;
    const next = [...otp];
    next[idx] = cleaned.slice(-1);
    setOtp(next);
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus();
    if (!cleaned && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Please enter the 6-digit code'); return; }
    try {
      const data = await verifyOtp({ email, otp: code, flow });
      if (flow === 'forgot-password') {
        // Pass both email AND the OTP code so ResetPassword can include it in the API call
        navigation.navigate('ResetPassword', { email, otpCode: code });
        return;
      }
      // data = { user, access_token }
      await login(data.user, data.access_token ?? data.accessToken);
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message ?? 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', msg);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ email, flow });
      startCountdown();
      Alert.alert('Sent', 'A new verification code has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
  };

  const getTitle = () => {
    if (flow === 'forgot-password') return 'Reset Password';
    if (flow === 'signup') return 'Verify Your Email';
    return 'Verify Login';
  };

  const getSubtitle = () => {
    if (flow === 'forgot-password') return 'Enter the 6-digit code sent to your email to reset your password.';
    if (flow === 'signup') return "We've sent a 6-digit verification code to your email address.";
    return 'Enter the 6-digit verification code sent to your email.';
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.icon}>🛡️</Text>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>

          <View style={styles.emailBadge}>
            <Text style={styles.emailBadgeText}>✉️  Code sent to: <Text style={styles.emailBold}>{email}</Text></Text>
          </View>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={r => (refs.current[i] = r)}
                style={[styles.otpBox, digit && styles.otpBoxFilled]}
                value={digit}
                onChangeText={t => handleChange(t, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={isPending} activeOpacity={0.85}>
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnText}>Verify Code</Text>}
          </TouchableOpacity>

          <View style={styles.resendSection}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resendDisabled || resending} style={styles.resendBtn}>
              <Text style={[styles.resendBtnText, (resendDisabled || resending) && styles.resendBtnDisabled]}>
                {resending ? 'Sending...' : resendDisabled ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#f4f6f9' },
  scroll:           { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card:             { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  icon:             { fontSize: 40, marginBottom: 12 },
  title:            { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  subtitle:         { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  emailBadge:       { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 28, width: '100%' },
  emailBadgeText:   { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#1D4ED8', textAlign: 'center' },
  emailBold:        { fontFamily: 'Outfit-SemiBold' },
  otpRow:           { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox:           { width: 46, height: 56, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, textAlign: 'center', fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, backgroundColor: '#fff' },
  otpBoxFilled:     { borderColor: colors.primary, backgroundColor: '#EBF0F5' },
  btn:              { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 20 },
  btnText:          { color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
  resendSection:    { alignItems: 'center', marginBottom: 12, gap: 8 },
  resendLabel:      { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  resendBtn:        { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#fff' },
  resendBtnText:    { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  resendBtnDisabled:{ color: colors.secondary },
  backWrap:         { marginTop: 8 },
  backText:         { color: colors.primary, fontSize: 14, fontFamily: 'Outfit-Regular' },
});

export default OTPVerificationScreen;
