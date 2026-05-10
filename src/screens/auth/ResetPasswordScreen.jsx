import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../theme/colors';
import { useResetPasswordMutation } from '../../services/api/authApi';

const schema = Yup.object({
  newPassword: Yup.string().min(8, 'Min 8 characters').required('Required'),
  confirm: Yup.string().oneOf([Yup.ref('newPassword')], 'Passwords must match').required('Required'),
});

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params ?? {};
  const [showPw, setShowPw] = useState(false);
  const { mutateAsync, isPending } = useResetPasswordMutation();

  const handleSubmit = async ({ newPassword }) => {
    try {
      await mutateAsync({ email, newPassword });
      Alert.alert('Success', 'Your password has been reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to reset password.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Create a new secure password for your account.</Text>

          <Formik initialValues={{ newPassword: '', confirm: '' }} validationSchema={schema} onSubmit={handleSubmit}>
            {({ handleChange, handleBlur, handleSubmit: submit, values, errors, touched }) => (
              <View>
                {[
                  { key: 'newPassword', label: 'New Password' },
                  { key: 'confirm', label: 'Confirm Password' },
                ].map(({ key, label }) => (
                  <View key={key} style={styles.field}>
                    <Text style={styles.label}>{label} <Text style={styles.req}>*</Text></Text>
                    <TextInput
                      style={[styles.input, touched[key] && errors[key] && styles.inputErr]}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={values[key]}
                      onChangeText={handleChange(key)}
                      onBlur={handleBlur(key)}
                      secureTextEntry={!showPw}
                    />
                    {touched[key] && errors[key] && <Text style={styles.errText}>{errors[key]}</Text>}
                  </View>
                ))}

                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.showPwWrap}>
                  <Text style={styles.showPwText}>{showPw ? 'Hide' : 'Show'} Password</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btn} onPress={submit} disabled={isPending} activeOpacity={0.85}>
                  {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 26, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 24, lineHeight: 22 },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  req: { color: colors.warning },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.text },
  inputErr: { borderColor: colors.warning },
  errText: { color: colors.warning, fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 4 },
  showPwWrap: { alignItems: 'flex-end', marginBottom: 8 },
  showPwText: { color: colors.primary, fontSize: 13, fontFamily: 'Outfit-Regular' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
});

export default ResetPasswordScreen;
