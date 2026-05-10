import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../theme/colors';
import logo from '../../assets/images/logo.png';
import { useForgotPasswordMutation } from '../../services/api/authApi';

const schema = Yup.object({ email: Yup.string().email('Invalid email').required('Required') });

const ForgotPasswordScreen = ({ navigation }) => {
  const { mutateAsync, isPending } = useForgotPasswordMutation();

  const handleSubmit = async ({ email }) => {
    try {
      await mutateAsync({ email });
      navigation.navigate('OTPVerification', { email, flow: 'forgot-password' });
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to send reset code.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email and we'll send you a verification code.</Text>

          <Formik initialValues={{ email: '' }} validationSchema={schema} onSubmit={handleSubmit}>
            {({ handleChange, handleBlur, handleSubmit: submit, values, errors, touched }) => (
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

                <TouchableOpacity style={styles.btn} onPress={submit} disabled={isPending} activeOpacity={0.85}>
                  {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
                  <Text style={styles.backText}>← Back to Login</Text>
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
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 200, height: 70 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 24, lineHeight: 22 },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  req: { color: colors.warning },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.text },
  inputErr: { borderColor: colors.warning },
  errText: { color: colors.warning, fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 4 },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
  backWrap: { marginTop: 20, alignItems: 'center' },
  backText: { color: colors.primary, fontSize: 14, fontFamily: 'Outfit-Regular' },
});

export default ForgotPasswordScreen;
