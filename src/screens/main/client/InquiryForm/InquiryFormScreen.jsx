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
  SafeAreaView,
  Modal,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialIcons';
import checkIcon from '../../../../assets/icons/checkIcon.png';
import { useRegisterInterest } from '../../../../services/api/clientApi';
import colors from '../../../../theme/colors';
import logo from '../../../../assets/images/logo.png';

const InquirySchema = Yup.object().shape({
  fullName: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: Yup.string()
    .min(10, 'Phone number must be at least 10 digits')
    .required('Phone number is required'),
  bedroomType: Yup.string().required('Please select bedroom type'),
  additionalMessage: Yup.string(),
});

const SuccessModal = ({ visible, onClose, onContinue }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Image source={logo} style={styles.modalLogo} resizeMode="contain" />

          <View style={styles.successIconContainer}>
            <Image source={checkIcon} style={styles.checkIcon} />
          </View>

          <Text style={styles.successTitle}>
            Inquiry Form Submitted Successfully
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const InquiryFormScreen = ({ navigation, route }) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const registerMutation = useRegisterInterest();
  const project = route?.params?.project;

  const handleSubmit = async values => {
    try {
      await registerMutation.mutateAsync({
        ...values,
        projectId: project?.id,
        projectName: project?.title,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Registration failed:', error);
      // Handle error - could show error modal or toast
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        {/* <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity> */}
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
        {/* <View style={styles.placeholder} /> */}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Container */}
          {/* <View style={styles.formContainer}> */}
          <Text style={styles.title}>Inquiry Form</Text>

          <Formik
            initialValues={{
              fullName: '',
              email: '',
              phoneNumber: '',
              bedroomType: '',
              additionalMessage: '',
            }}
            validationSchema={InquirySchema}
            onSubmit={handleSubmit}
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
                {/* Full Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Full Name<Text style={{ color: colors.warning }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.fullName && errors.fullName && styles.inputError,
                    ]}
                    placeholder="John Doe"
                    placeholderTextColor="#999"
                    value={values.fullName}
                    onChangeText={handleChange('fullName')}
                    onBlur={handleBlur('fullName')}
                  />
                  {touched.fullName && errors.fullName && (
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  )}
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Email<Text style={{ color: colors.warning }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.email && errors.email && styles.inputError,
                    ]}
                    placeholder="john.doe@gmail.com"
                    placeholderTextColor="#949494"
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

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Phone No.<Text style={{ color: colors.warning }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      touched.phoneNumber &&
                        errors.phoneNumber &&
                        styles.inputError,
                    ]}
                    placeholder="+971 50 123 4567"
                    placeholderTextColor="#999"
                    value={values.phoneNumber}
                    onChangeText={handleChange('phoneNumber')}
                    onBlur={handleBlur('phoneNumber')}
                    keyboardType="phone-pad"
                  />
                  {touched.phoneNumber && errors.phoneNumber && (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  )}
                </View>

                {/* Bedroom Type */}
                <View style={styles.radioContainer}>
                  <Text style={styles.label}>Interested in</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioItem}
                      onPress={() => setFieldValue('bedroomType', 'studio')}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          values.bedroomType === 'studio' &&
                            styles.radioSelected,
                        ]}
                      >
                        {values.bedroomType === 'studio' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioText}>Studio</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.radioItem}
                      onPress={() => setFieldValue('bedroomType', '1bedroom')}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          values.bedroomType === '1bedroom' &&
                            styles.radioSelected,
                        ]}
                      >
                        {values.bedroomType === '1bedroom' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioText}>1 Bedroom</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.radioItem}
                      onPress={() => setFieldValue('bedroomType', '2bedroom')}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          values.bedroomType === '2bedroom' &&
                            styles.radioSelected,
                        ]}
                      >
                        {values.bedroomType === '2bedroom' && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text style={styles.radioText}>2 Bedroom</Text>
                    </TouchableOpacity>
                  </View>
                  {touched.bedroomType && errors.bedroomType && (
                    <Text style={styles.errorText}>{errors.bedroomType}</Text>
                  )}
                </View>

                {/* Additional Message */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Additional Message (optional)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Type your message"
                    placeholderTextColor="#999"
                    value={values.additionalMessage}
                    onChangeText={handleChange('additionalMessage')}
                    onBlur={handleBlur('additionalMessage')}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    registerMutation.isPending && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Formik>
          {/* </View> */}
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        onContinue={handleSuccessClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    // paddingVertical: 10,
    paddingTop: 36,
  },
  backButton: {
    padding: 4,
  },
  headerLogo: {
    width: 242,
    height: 80,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom:16,
    // backgroundColor:'#ccc',
  },
  // formContainer: {
  //   backgroundColor: '#ffffff',
  //   // borderRadius: 12,
  //   padding: 16,

  // },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    // marginBottom: 24,
    paddingVertical: 12,
  },
  form: {
    width: '100%',
    gap: 10,
  },
  inputContainer: {
    // marginBottom: 20,
    // backgroundColor:'#ccc',
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.defaultBlack,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    height: 48,
    borderColor: '#B3B3B3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.secondary,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
  },
  radioContainer: {
    paddingHorizontal: 20,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    // gap:10,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:6,
    // flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.secondary,
    // marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.secondary,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: colors.secondary,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#00000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalLogo: {
    width: 181,
    height: 60,
    marginBottom: 20,
  },
  checkIcon: {
    height: 140,
    width: 140,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    // lineHeight: 24,
  },
  continueButton: {
    flexDirection:'row',
    justifyContent:'center',
    backgroundColor: colors.primary,
    // paddingVertical: 14,
    // paddingHorizontal: 32,
    height:42,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InquiryFormScreen;
