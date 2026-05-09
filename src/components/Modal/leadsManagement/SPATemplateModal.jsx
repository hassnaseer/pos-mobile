import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import colors from '../../../theme/colors';
import { useTemplates } from '../../../services/api/adminApi';

const icons = {
  cross: require('../../../assets/icons/cross-icon.png'),
};

const SPASchema = Yup.object().shape({
  template: Yup.string().required('Template is required'),
});

const SPATemplateModal = ({
  visible,
  onClose,
  onSubmit,
  offerData,
  isPending,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send SPA</Text>
            <TouchableOpacity onPress={onClose}>
              <Image source={icons.cross} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              initialValues={{
                template: '',
              }}
              validationSchema={SPASchema}
              onSubmit={values => {
                onSubmit({
                  sales_offer_id: offerData?.id,
                  template_name: values.template,
                });
              }}
            >
              {({ handleSubmit, values, errors, touched, setFieldValue }) => (
                <View style={styles.form}>
                  {/* Offer Details */}
                  <View style={styles.offerDetailsContainer}>
                    <Text style={styles.offerDetailsTitle}>Offer Details</Text>
                    <Text style={styles.offerDetailText}>
                      Client:{' '}
                      {offerData?.client_name || offerData?.lead_name || 'N/A'}
                    </Text>
                    <Text style={styles.offerDetailText}>
                      Status: {offerData?.status || 'N/A'}
                    </Text>
                  </View>

                  {/* Select Template */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Select template<Text style={{ color: 'red' }}>*</Text>
                    </Text>

                    {templatesLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <Text style={styles.loadingText}>
                          Loading templates...
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <TouchableOpacity
                          style={[
                            styles.dropdownButton,
                            touched.template &&
                              errors.template &&
                              styles.inputError,
                          ]}
                          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                          <Text
                            style={[
                              styles.dropdownButtonText,
                              !values.template && styles.dropdownPlaceholder,
                            ]}
                          >
                            {values.template
                              ? templates?.find(
                                  t => t.name.toString() === values.template,
                                )?.name
                              : 'Select a template'}
                          </Text>
                          <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        {isDropdownOpen && (
                          <ScrollView
                            nestedScrollEnabled={true}
                            style={styles.dropdownList}
                            showsVerticalScrollIndicator={true}
                          >
                            {templates && templates.length > 0 ? (
                              templates.map(template => (
                                <TouchableOpacity
                                  key={template.id}
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setFieldValue(
                                      'template',
                                      template.name.toString(),
                                    );
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>
                                    {template.name}
                                  </Text>
                                </TouchableOpacity>
                              ))
                            ) : (
                              <View style={styles.dropdownItem}>
                                <Text style={styles.dropdownItemText}>
                                  No templates available
                                </Text>
                              </View>
                            )}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    {touched.template && errors.template && (
                      <Text style={styles.errorText}>{errors.template}</Text>
                    )}
                  </View>

                  {/* Send Button */}
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      isPending && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.defaultWhite}
                      />
                    ) : (
                      <Text style={styles.sendButtonText}>Send SPA</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 24,
    color: colors.text,
    fontFamily: 'Outfit-SemiBold',
  },
  closeIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  modalContent: {
    maxHeight: '100%',
  },
  form: {
    padding: 20,
  },
  offerDetailsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  offerDetailsTitle: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'Outfit-SemiBold',
  },
  offerDetailText: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 4,
    fontFamily: 'Outfit-Regular',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'Outfit-Medium',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.secondary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#ffffff',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
});

export default SPATemplateModal;
