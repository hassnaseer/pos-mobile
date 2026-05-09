import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../../theme/colors';
import crossIcon from '../../../assets/icons/cross-icon.png';
import PDFPicker from '../../PDFPicker/PDFPicker';

//Validation schema with age, format, and date checks
const validationSchema = Yup.object().shape({
  full_name: Yup.string().required('Full name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone_number: Yup.string().required('Phone number is required'),
  whatsapp_number: Yup.string(),
  nationality: Yup.string()
    .required('Nationality is required')
    .min(2, 'Nationality must be at least 2 characters')
    .matches(/^[A-Za-z ]+$/, 'Nationality must contain only letters'),

  date_of_birth: Yup.string()
    .required('Date of birth is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .test('is-valid-date', 'Invalid date', value => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test('not-in-future', 'Date of birth cannot be in the future', value => {
      if (!value) return false;
      return new Date(value) <= new Date();
    }),

  nationality: Yup.string(),
  gender: Yup.string(),
  years_of_experience: Yup.number(),
  specialization: Yup.string(),
  languages_spoken: Yup.string(),
  current_company: Yup.string(),
  rera_number: Yup.string(),
});

const EditIndividualBrokerModal = ({
  visible,
  onClose,
  broker,
  onSubmit,
  isLoading,
  isEditMode = true,
}) => {
  const [passportCopy, setPassportCopy] = useState(null);
  const [resumeCv, setResumeCv] = useState(null);
  const [reraLicense, setReraLicense] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  const initialValues = {
    full_name: broker?.full_name || '',
    email: broker?.email || '',
    phone_number: broker?.phone_number || '',
    whatsapp_number: broker?.whatsapp_number || '',
    date_of_birth: broker?.date_of_birth || '',
    nationality: broker?.nationality || '',
    gender: broker?.gender || '',
    years_of_experience: broker?.years_of_experience?.toString() || '',
    specialization: broker?.specialization || '',
    languages_spoken: broker?.languages_spoken || '',
    current_company: broker?.current_company || '',
    rera_number: broker?.rera_number || '',
  };

  const handleAddOtherDocument = document => {
    setOtherDocuments([...otherDocuments, document]);
  };

  const handleRemoveOtherDocument = index => {
    const updatedDocuments = otherDocuments.filter((_, i) => i !== index);
    setOtherDocuments(updatedDocuments);
  };

  const handleSubmit = async (values, { resetForm }) => {
    const formData = new FormData();
    Object.keys(values).forEach(key => {
      if (values[key]) {
        formData.append(key, values[key]);
      }
    });

    if (passportCopy) {
      formData.append('passport_copy', {
        uri: passportCopy.uri,
        type: passportCopy.type,
        name: passportCopy.name,
      });
    }

    if (resumeCv) {
      formData.append('resume_cv', {
        uri: resumeCv.uri,
        type: resumeCv.type,
        name: resumeCv.name,
      });
    }

    if (reraLicense) {
      formData.append('rera_license', {
        uri: reraLicense.uri,
        type: reraLicense.type,
        name: reraLicense.name,
      });
    }

    if (otherDocuments.length > 0) {
      otherDocuments.forEach(doc => {
        formData.append('other_supporting_documents', {
          uri: doc.uri,
          type: doc.type,
          name: doc.name,
        });
      });
    }

    await onSubmit(formData);
    if (!isEditMode) {
      resetForm();
      setPassportCopy(null);
      setResumeCv(null);
      setReraLicense(null);
      setOtherDocuments([]);
    }
  };

  // ✅ Function to auto-insert dashes (YYYY-MM-DD)
  const formatDateWithDashes = text => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(
        4,
        6,
      )}-${cleaned.slice(6, 8)}`;
    }
    return formatted;
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? 'Edit Individual Broker' : 'Add Individual Broker'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.crossIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
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
                      Full Name<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.full_name &&
                          errors.full_name &&
                          styles.inputError,
                      ]}
                      placeholder="Enter full name"
                      placeholderTextColor="#999"
                      value={values.full_name}
                      onChangeText={handleChange('full_name')}
                      onBlur={handleBlur('full_name')}
                    />
                    {touched.full_name && errors.full_name && (
                      <Text style={styles.errorText}>{errors.full_name}</Text>
                    )}
                  </View>

                  {/* Email */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Email<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.email && errors.email && styles.inputError,
                      ]}
                      placeholder="Enter email"
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

                  {/* Phone */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Phone Number<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.phone_number &&
                          errors.phone_number &&
                          styles.inputError,
                      ]}
                      placeholder="Enter phone number"
                      placeholderTextColor="#999"
                      value={values.phone_number}
                      onChangeText={handleChange('phone_number')}
                      onBlur={handleBlur('phone_number')}
                      keyboardType="phone-pad"
                    />
                    {touched.phone_number && errors.phone_number && (
                      <Text style={styles.errorText}>
                        {errors.phone_number}
                      </Text>
                    )}
                  </View>

                  {/* WhatsApp */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>WhatsApp Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter WhatsApp number"
                      placeholderTextColor="#999"
                      value={values.whatsapp_number}
                      onChangeText={handleChange('whatsapp_number')}
                      onBlur={handleBlur('whatsapp_number')}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* ✅ Date of Birth (auto-format) */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Date of Birth<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.date_of_birth &&
                          errors.date_of_birth &&
                          styles.inputError,
                      ]}
                      placeholder="Enter date of birth (YYYY-MM-DD)"
                      placeholderTextColor="#999"
                      value={values.date_of_birth}
                      onChangeText={text => {
                        const formatted = formatDateWithDashes(text);
                        setFieldValue('date_of_birth', formatted);
                      }}
                      onBlur={handleBlur('date_of_birth')}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                    {touched.date_of_birth && errors.date_of_birth && (
                      <Text style={styles.errorText}>
                        {errors.date_of_birth}
                      </Text>
                    )}
                  </View>

                  {/* Other Inputs */}
                  {[
                    ['nationality', 'Nationality'],
                    ['gender', 'Gender'],
                    ['years_of_experience', 'Years of Experience'],
                    ['specialization', 'Specialization'],
                    ['languages_spoken', 'Languages Spoken'],
                    ['current_company', 'Current Company'],
                    ['rera_number', 'RERA Number'],
                  ].map(([key, label]) => (
                    <View key={key} style={styles.inputContainer}>
                      <Text style={styles.label}>{label}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        placeholderTextColor="#999"
                        value={values[key]}
                        onChangeText={handleChange(key)}
                        onBlur={handleBlur(key)}
                        keyboardType={
                          key === 'years_of_experience' ? 'numeric' : 'default'
                        }
                      />
                    </View>
                  ))}

                  {/* PDFs */}
                  <PDFPicker
                    label="Passport Copy"
                    placeholder="Upload passport copy PDF"
                    selectedPdf={passportCopy}
                    onPdfSelected={setPassportCopy}
                    onRemovePdf={() => setPassportCopy(null)}
                  />

                  <PDFPicker
                    label="Resume/CV"
                    placeholder="Upload resume/CV PDF"
                    selectedPdf={resumeCv}
                    onPdfSelected={setResumeCv}
                    onRemovePdf={() => setResumeCv(null)}
                  />

                  <PDFPicker
                    label="RERA License"
                    placeholder="Upload RERA license PDF"
                    selectedPdf={reraLicense}
                    onPdfSelected={setReraLicense}
                    onRemovePdf={() => setReraLicense(null)}
                  />

                  {/* Other Supporting Documents */}
                  <View style={styles.otherDocumentsSection}>
                    <Text style={styles.sectionTitle}>
                      Other Supporting Documents
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Upload additional documents (optional)
                    </Text>

                    {otherDocuments.map((doc, index) => (
                      <View key={index} style={styles.documentItem}>
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentName} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Text style={styles.documentSize}>
                            {(doc.size / 1024).toFixed(2)} KB
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveOtherDocument(index)}
                          style={styles.removeDocButton}
                        >
                          <Image source={crossIcon} style={styles.removeIcon} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <PDFPicker
                      label=""
                      placeholder="+ Add Another Document"
                      onPdfSelected={handleAddOtherDocument}
                      isMultiple
                    />
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      isLoading && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.defaultWhite}
                      />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isEditMode ? 'Update Broker' : 'Add Broker'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  closeButton: { padding: 4 },
  crossIcon: { width: 16, height: 16, resizeMode: 'contain' },
  modalContent: { paddingHorizontal: 16 },
  form: { marginTop: 10 },
  inputContainer: { marginBottom: 15 },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.secondary,
  },
  inputError: { borderColor: 'red' },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentInfo: { flex: 1, marginRight: 10 },
  documentName: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 2,
  },
  documentSize: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  removeDocButton: {
    padding: 8,
    backgroundColor: colors.defaultWhite,
    borderRadius: 6,
  },
  removeIcon: { width: 12, height: 12, resizeMode: 'contain' },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    textAlign: 'center',
    color: colors.defaultWhite,
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
  },
  star: { color: 'red', fontSize: 18, fontWeight: '600' },
});

export default EditIndividualBrokerModal;
