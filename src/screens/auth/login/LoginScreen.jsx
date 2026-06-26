import React, { useState } from 'react';
import {  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../../theme/colors';
import logo from '../../../assets/images/newLogo.png';
import showIcon from '../../../assets/icons/eye-open.png';
import hiddenIcon from '../../../assets/icons/eye-closed.png';
import { useLoginMutation } from '../../../services/api/authApi';
import { useAuth } from '../../../context/AuthContext';

const schema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Min 6 characters').required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { mutateAsync, isPending } = useLoginMutation();
  const { login } = useAuth();

  const handleLogin = async values => {
    try {
      const data = await mutateAsync({ email: values.email, password: values.password });
      // Backend returns { loggedIn, user, access_token } when already verified
      // or { email } when OTP verification is required
      if (data?.loggedIn && data?.user && (data?.access_token || data?.accessToken)) {
        await login(data.user, data.access_token ?? data.accessToken, data.firebaseToken);
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigation.navigate('OTPVerification', {
          email: data?.email ?? values.email,
          flow: 'login',
        });
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message ?? 'Login failed. Please try again.';
      Alert.alert('Login Error', msg);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Vendixs</Text>

        <Formik initialValues={{ email: '', password: '' }} validationSchema={schema} onSubmit={handleLogin}>
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View>
              <View style={styles.field}>
                <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={[styles.input, touched.email && errors.email && styles.inputErr]}
                  placeholder="admin@example.com"
                  placeholderTextColor="#999"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {touched.email && errors.email && <Text style={styles.errText}>{errors.email}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    style={[styles.pwInput, touched.password && errors.password && styles.inputErr]}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                    <Image source={showPassword ? showIcon : hiddenIcon} style={styles.eyeImg} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                {touched.password && errors.password && <Text style={styles.errText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={isPending} activeOpacity={0.85}>
                {isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>Continue</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('LegalPage', { type: 'terms' })}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LegalPage', { type: 'privacy' })}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 110, height: 110 },
  title: { fontSize: 28, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  req: { color: colors.warning },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.text, backgroundColor: '#fff' },
  inputErr: { borderColor: colors.warning },
  pwWrap: { position: 'relative' },
  pwInput: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.text, paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -11 }] },
  eyeImg: { width: 22, height: 22, tintColor: '#999' },
  errText: { color: colors.warning, fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 4 },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
  forgotWrap: { marginTop: 16, alignItems: 'center' },
  forgotText: { color: colors.primary, fontSize: 14, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 8 },
  legalLink: { color: colors.secondary, fontSize: 12, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline' },
  legalSep: { color: colors.secondary, fontSize: 12, fontFamily: 'Outfit-Regular' },
});

export default LoginScreen;
