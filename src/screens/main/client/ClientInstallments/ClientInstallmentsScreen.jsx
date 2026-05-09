import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../../../components/Header/Header';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';
import { useAuth } from '../../../../context/AuthContext';

// Invoice Generation Schema
const InvoiceSchema = Yup.object().shape({
  installmentNo: Yup.string().required('Installment number is required'),
  date: Yup.string().required('Date is required'),
  paymentPrice: Yup.number()
    .positive('Payment price must be positive')
    .required('Payment price is required'),
  invoiceNo: Yup.string().required('Invoice number is required'),
});

// Generate Invoice Modal
const GenerateInvoiceModal = ({ visible, onClose, onSubmit, client }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.invoiceModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Invoice</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Formik
              initialValues={{
                installmentNo: '05',
                date: 'Sept 19, 2025',
                paymentPrice: '67900',
                invoiceNo: '0102',
              }}
              validationSchema={InvoiceSchema}
              onSubmit={onSubmit}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.form}>
                  {/* Installment No */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Installment no*</Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.installmentNo && errors.installmentNo && styles.inputError
                      ]}
                      placeholder="05"
                      placeholderTextColor="#999"
                      value={values.installmentNo}
                      onChangeText={handleChange('installmentNo')}
                      onBlur={handleBlur('installmentNo')}
                    />
                    {touched.installmentNo && errors.installmentNo && (
                      <Text style={styles.errorText}>{errors.installmentNo}</Text>
                    )}
                  </View>

                  {/* Date */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date*</Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.date && errors.date && styles.inputError
                      ]}
                      placeholder="Sept 19, 2025"
                      placeholderTextColor="#999"
                      value={values.date}
                      onChangeText={handleChange('date')}
                      onBlur={handleBlur('date')}
                    />
                    {touched.date && errors.date && (
                      <Text style={styles.errorText}>{errors.date}</Text>
                    )}
                  </View>

                  {/* Payment Price */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Payment Price*</Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          touched.paymentPrice && errors.paymentPrice && styles.inputError
                        ]}
                        placeholder="67900"
                        placeholderTextColor="#999"
                        value={values.paymentPrice}
                        onChangeText={handleChange('paymentPrice')}
                        onBlur={handleBlur('paymentPrice')}
                        keyboardType="numeric"
                      />
                      <Text style={styles.currencyText}>AED</Text>
                    </View>
                    {touched.paymentPrice && errors.paymentPrice && (
                      <Text style={styles.errorText}>{errors.paymentPrice}</Text>
                    )}
                  </View>

                  {/* Invoice No */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Invoice #*</Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.invoiceNo && errors.invoiceNo && styles.inputError
                      ]}
                      placeholder="0102"
                      placeholderTextColor="#999"
                      value={values.invoiceNo}
                      onChangeText={handleChange('invoiceNo')}
                      onBlur={handleBlur('invoiceNo')}
                    />
                    {touched.invoiceNo && errors.invoiceNo && (
                      <Text style={styles.errorText}>{errors.invoiceNo}</Text>
                    )}
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.generateButtonText}>Generate</Text>
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

// Project Card Component
const ProjectCard = ({ project, onGenerateInvoice, onViewInstallments }) => {
  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectDate}>{project.date}</Text>
        </View>
        <View style={styles.progressIndicator}>
          <Icon name="radio-button-checked" size={16} color={colors.primary} />
          <Text style={styles.progressText}>Project no.</Text>
          <Text style={styles.progressNumber}>{project.projectNo}</Text>
        </View>
      </View>

      <View style={styles.paymentInfo}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentItem}>
            <Icon name="account-balance-wallet" size={16} color={colors.success} />
            <Text style={styles.paymentLabel}>Total payments</Text>
            <Text style={styles.paymentAmount}>
              {project.totalPayments.toLocaleString()} {project.currency}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <Icon name="pending" size={16} color={colors.warning} />
            <Text style={styles.paymentLabel}>Remaining payments</Text>
            <Text style={styles.paymentAmount}>
              {project.remainingPayments.toLocaleString()} {project.currency}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.generateInvoiceButton}
          onPress={() => onGenerateInvoice(project)}
          activeOpacity={0.7}
        >
          <Text style={styles.generateInvoiceText}>Generate invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewInstallmentsButton}
          onPress={() => onViewInstallments(project)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewInstallmentsText}>View installment plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Screen Component
const ClientInstallmentsScreen = ({ route, navigation }) => {
  const { client } = route.params;
  const { userRole } = useAuth();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Mock client project data
  const clientProjects = [
    {
      id: 1,
      name: 'Azad Tower',
      date: 'Aug 19, 2025',
      projectNo: '02',
      totalPayments: 789870,
      remainingPayments: 675540,
      currency: 'AED'
    },
    {
      id: 2,
      name: 'Downtown Office',
      date: 'Aug 19, 2025',
      projectNo: '02',
      totalPayments: 789870,
      remainingPayments: 675540,
      currency: 'AED'
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleGenerateInvoice = (project) => {
    setSelectedProject(project);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSubmit = (formData) => {
    // Navigate to invoice view based on user role
    const invoiceScreen = userRole === 'admin' || userRole === 'superadmin' ? 'AdminInvoiceView' : 'InvoiceView';
    navigation.navigate(invoiceScreen, {
      client,
      project: selectedProject,
      invoiceData: formData
    });
    setShowInvoiceModal(false);
    showToast('Invoice generated successfully', 'success');
  };

  const handleViewInstallments = (project) => {
    // Navigate to installment plan based on user role
    const installmentScreen = userRole === 'admin' || userRole === 'superadmin' ? 'AdminInstallmentPlan' : 'InstallmentPlan';
    navigation.navigate(installmentScreen, {
      client,
      project
    });
  };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'success' });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={client.name}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNotificationPress={handleNotificationPress}
        notificationCount={3}
      />

      {/* Client Info Header */}
      <View style={styles.clientInfoContainer}>
        <Text style={styles.clientName}>Client Name: {client.name}</Text>
        <Text style={styles.clientDetail}>Email: {client.email}</Text>
        <Text style={styles.clientDetail}>Phone number: {client.phone}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {clientProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onGenerateInvoice={handleGenerateInvoice}
              onViewInstallments={handleViewInstallments}
            />
          ))}
        </View>
      </ScrollView>

      <GenerateInvoiceModal
        visible={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedProject(null);
        }}
        onSubmit={handleInvoiceSubmit}
        client={client}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  clientInfoContainer: {
    backgroundColor: colors.defaultWhite,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  projectCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 14,
    color: colors.secondary,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.primary,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentInfo: {
    marginBottom: 16,
  },
  paymentRow: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  generateInvoiceButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateInvoiceText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  viewInstallmentsButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  viewInstallmentsText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  invoiceModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    maxHeight: 400,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 4,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  currencyText: {
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClientInstallmentsScreen;