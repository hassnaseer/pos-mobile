import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import colors from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useVerifyOtpMutation, useResendCodeMutation } from '../../services/api/authApi';

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, flow = 'login' } = route.params ?? {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);
  const { login } = useAuth();

  const { mutateAsync: verifyOtp, isPending } = useVerifyOtpMutation();
  const { mutateAsync: resendCode, isPending: resending } = useResendCodeMutation();

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
        navigation.navigate('ResetPassword', { email });
        return;
      }
      // data = { user, access_token }
      await login(data.user, data.access_token);
      // Reset root stack to Main so back button can't return to Auth
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message ?? 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', msg);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ email, flow });
      Alert.alert('Sent', 'A new verification code has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.icon}>✉️</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

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

          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendWrap}>
            <Text style={styles.resendText}>
              {resending ? 'Sending...' : "Didn't receive it? "}
              {!resending && <Text style={styles.resendLink}>Resend</Text>}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  icon: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  email: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  otpBox: { width: 46, height: 56, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, textAlign: 'center', fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, backgroundColor: '#fff' },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: '#EBF0F5' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
  resendWrap: { marginBottom: 12 },
  resendText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary },
  resendLink: { color: colors.primary, textDecorationLine: 'underline' },
  backWrap: { marginTop: 4 },
  backText: { color: colors.primary, fontSize: 14, fontFamily: 'Outfit-Regular' },
});

export default OTPVerificationScreen;
