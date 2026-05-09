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


const validationSchema = Yup.object().shape({
  company_name: Yup.string().required('Company name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  relationship_manager: Yup.string().required('Relationship manager is required'),
  office_phone_number: Yup.string().required('Office phone number is required'),
  website: Yup.string(),
  company_whatsapp: Yup.string(),
  general_manager_whatsapp: Yup.string(),
  accounts_contact_number: Yup.string(),
  area: Yup.string(),
  complete_address: Yup.string(),
  city: Yup.string(),
  state_province: Yup.string(),
  postal_code: Yup.string(),
});

const EditAgencyBrokerModal = ({ visible, onClose, broker, onSubmit, isLoading, isEditMode = true }) => {
  // State for PDF files
  const [tradeLicense, setTradeLicense] = useState(null);
  const [reraCertificate, setReraCertificate] = useState(null);
  const [taxCertificate, setTaxCertificate] = useState(null);
  const [passportCopy, setPassportCopy] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  const initialValues = {
    company_name: broker?.company_name || '',
    email: broker?.email || '',
    relationship_manager: broker?.relationship_manager || '',
    office_phone_number: broker?.office_phone_number || '',
    website: broker?.website || '',
    company_whatsapp: broker?.company_whatsapp || '',
    general_manager_whatsapp: broker?.general_manager_whatsapp || '',
    accounts_contact_number: broker?.accounts_contact_number || '',
    area: broker?.area || '',
    complete_address: broker?.complete_address || '',
    city: broker?.city || '',
    state_province: broker?.state_province || '',
    postal_code: broker?.postal_code || '',
  };

  const handleAddOtherDocument = (document) => {
    setOtherDocuments([...otherDocuments, document]);
  };

  const handleRemoveOtherDocument = (index) => {
    const updatedDocuments = otherDocuments.filter((_, i) => i !== index);
    setOtherDocuments(updatedDocuments);
  };

  const handleSubmit = async (values, { resetForm }) => {
    const formData = new FormData();

    // Add all text fields to FormData
    Object.keys(values).forEach(key => {
      if (values[key]) {
        formData.append(key, values[key]);
      }
    });

    // Add PDF files to FormData
    if (tradeLicense) {
      formData.append('trade_license', {
        uri: tradeLicense.uri,
        type: tradeLicense.type,
        name: tradeLicense.name,
      });
    }

    if (reraCertificate) {
      formData.append('rera_certificate', {
        uri: reraCertificate.uri,
        type: reraCertificate.type,
        name: reraCertificate.name,
      });
    }

    if (taxCertificate) {
      formData.append('tax_registration_certificate', {
        uri: taxCertificate.uri,
        type: taxCertificate.type,
        name: taxCertificate.name,
      });
    }

    if (passportCopy) {
      formData.append('passport_copy_owner_gm', {
        uri: passportCopy.uri,
        type: passportCopy.type,
        name: passportCopy.name,
      });
    }

    // Add other supporting documents
    if (otherDocuments.length > 0) {
      otherDocuments.forEach((doc, index) => {
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
      // Reset PDF states
      setTradeLicense(null);
      setReraCertificate(null);
      setTaxCertificate(null);
      setPassportCopy(null);
      setOtherDocuments([]);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? 'Edit Agency Broker' : 'Add Agency Broker'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.crossIcon} />
            </TouchableOpacity>
          </View>

          {/* Form */}
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
              }) => (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Company Name<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.company_name && errors.company_name && styles.inputError,
                      ]}
                      placeholder="Enter company name"
                      placeholderTextColor="#999"
                      value={values.company_name}
                      onChangeText={handleChange('company_name')}
                      onBlur={handleBlur('company_name')}
                    />
                    {touched.company_name && errors.company_name && (
                      <Text style={styles.errorText}>{errors.company_name}</Text>
                    )}
                  </View>

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

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Relationship Manager<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.relationship_manager &&
                          errors.relationship_manager &&
                          styles.inputError,
                      ]}
                      placeholder="Enter relationship manager"
                      placeholderTextColor="#999"
                      value={values.relationship_manager}
                      onChangeText={handleChange('relationship_manager')}
                      onBlur={handleBlur('relationship_manager')}
                    />
                    {touched.relationship_manager && errors.relationship_manager && (
                      <Text style={styles.errorText}>
                        {errors.relationship_manager}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Office Phone Number<Text style={styles.star}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.office_phone_number &&
                          errors.office_phone_number &&
                          styles.inputError,
                      ]}
                      placeholder="Enter office phone number"
                      placeholderTextColor="#999"
                      value={values.office_phone_number}
                      onChangeText={handleChange('office_phone_number')}
                      onBlur={handleBlur('office_phone_number')}
                      keyboardType="phone-pad"
                    />
                    {touched.office_phone_number && errors.office_phone_number && (
                      <Text style={styles.errorText}>
                        {errors.office_phone_number}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Website</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter website"
                      placeholderTextColor="#999"
                      value={values.website}
                      onChangeText={handleChange('website')}
                      onBlur={handleBlur('website')}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Company WhatsApp</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter company WhatsApp"
                      placeholderTextColor="#999"
                      value={values.company_whatsapp}
                      onChangeText={handleChange('company_whatsapp')}
                      onBlur={handleBlur('company_whatsapp')}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>General Manager WhatsApp</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter general manager WhatsApp"
                      placeholderTextColor="#999"
                      value={values.general_manager_whatsapp}
                      onChangeText={handleChange('general_manager_whatsapp')}
                      onBlur={handleBlur('general_manager_whatsapp')}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Accounts Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter accounts contact number"
                      placeholderTextColor="#999"
                      value={values.accounts_contact_number}
                      onChangeText={handleChange('accounts_contact_number')}
                      onBlur={handleBlur('accounts_contact_number')}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Area</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter area"
                      placeholderTextColor="#999"
                      value={values.area}
                      onChangeText={handleChange('area')}
                      onBlur={handleBlur('area')}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Complete Address</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Enter complete address"
                      placeholderTextColor="#999"
                      value={values.complete_address}
                      onChangeText={handleChange('complete_address')}
                      onBlur={handleBlur('complete_address')}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter city"
                      placeholderTextColor="#999"
                      value={values.city}
                      onChangeText={handleChange('city')}
                      onBlur={handleBlur('city')}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>State/Province</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter state/province"
                      placeholderTextColor="#999"
                      value={values.state_province}
                      onChangeText={handleChange('state_province')}
                      onBlur={handleBlur('state_province')}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter postal code"
                      placeholderTextColor="#999"
                      value={values.postal_code}
                      onChangeText={handleChange('postal_code')}
                      onBlur={handleBlur('postal_code')}
                      keyboardType="number-pad"
                    />
                  </View>

                  {/* PDF Upload Fields */}
                  <PDFPicker
                    label="Trade License"
                    placeholder="Upload trade license PDF"
                    selectedPdf={tradeLicense}
                    onPdfSelected={setTradeLicense}
                    onRemovePdf={() => setTradeLicense(null)}
                  />

                  <PDFPicker
                    label="RERA Certificate"
                    placeholder="Upload RERA certificate PDF"
                    selectedPdf={reraCertificate}
                    onPdfSelected={setReraCertificate}
                    onRemovePdf={() => setReraCertificate(null)}
                  />

                  <PDFPicker
                    label="Tax Registration Certificate"
                    placeholder="Upload tax registration certificate PDF"
                    selectedPdf={taxCertificate}
                    onPdfSelected={setTaxCertificate}
                    onRemovePdf={() => setTaxCertificate(null)}
                  />

                  <PDFPicker
                    label="Passport Copy (Owner/GM)"
                    placeholder="Upload passport copy PDF"
                    selectedPdf={passportCopy}
                    onPdfSelected={setPassportCopy}
                    onRemovePdf={() => setPassportCopy(null)}
                  />

                  {/* Other Supporting Documents Section */}
                  <View style={styles.otherDocumentsSection}>
                    <Text style={styles.sectionTitle}>Other Supporting Documents</Text>
                    <Text style={styles.sectionSubtitle}>
                      Upload additional documents (optional)
                    </Text>

                    {/* Display existing other documents */}
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

                    {/* Add Another Document Button */}
                    <PDFPicker
                      label=""
                      placeholder="+ Add Another Document"
                      selectedPdf={null}
                      onPdfSelected={handleAddOtherDocument}
                      onRemovePdf={() => {}}
                      isMultiple={true}
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.defaultWhite} />
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
  closeButton: {
    padding: 4,
  },
  crossIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  modalContent: {
    paddingHorizontal: 16,
    // paddingVertical: 8,
  },
  form: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
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
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: 'red',
    fontFamily: 'Outfit-Medium',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  otherDocumentsSection: {
    // marginTop: 20,
    // marginBottom: 15,
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
  documentInfo: {
    flex: 1,
    marginRight: 10,
  },
  documentName: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  removeDocButton: {
    padding: 8,
    backgroundColor: colors.defaultWhite,
    borderRadius: 6,
  },
  removeIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    textAlign: 'center',
    color: colors.defaultWhite,
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
  },
  star: {
    color: 'red',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EditAgencyBrokerModal;