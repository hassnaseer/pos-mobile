import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import colors from '../../../theme/colors';
import crossIcon from '../../../assets/icons/cross-icon.png';
import layersIcon from '../../../assets/icons/layers-three.png';
import { useSendInvoice } from '../../../services/api/installmentApi';

const GenerateInvoiceModal = ({
  visible,
  onClose,
  project,
  client,
  onGenerate,
  remainingAmount,
}) => {
  const [formData, setFormData] = useState({
    projectName: '',
    clientEmail: '',
    paymentPrice: '',
  });
  const { mutate: generateInvoice } = useSendInvoice();

  // Reset form data when modal opens or props change
  useEffect(() => {
    if (visible) {
      setFormData({
        projectName: project?.project_name || '',
        clientEmail: client?.client_email || '',
        paymentPrice: '',
      });
    }
  }, [visible, project, client]);

  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (loading) return;

    const { projectName, clientEmail, paymentPrice } = formData;

    if (!projectName || !clientEmail || !paymentPrice) {
      Alert.alert('Missing fields', 'Please fill in all required fields');
      return;
    }

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const payload = {
      in_progress_project_id: project.inprogress_id,
      status: 'pending',
      date: formattedDate,
      price_on_invoice: parseInt(paymentPrice) || 0,
    };

    setLoading(true);

    generateInvoice(payload, {
      onSuccess: data => {
        setLoading(false);
        onClose(); // ✅ close modal immediately

        // ✅ Notify parent for toast only
        onGenerate({
          success: true,
          message: 'Invoice generated successfully',
        });

        // reset form
        setFormData({
          projectName: project?.project_name || '',
          clientEmail: client?.client_email || '',
          paymentPrice: '',
        });
      },
      onError: err => {
        setLoading(false);
        onClose();

        onGenerate({
          success: false,
          message: 'Failed to generate invoice',
        });

        console.error('Error generating invoice:', err?.response?.data || err);
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Generate Invoice</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Project Info */}
            <View style={styles.projectInfo}>
              <View style={styles.projectInfoRow}>
                <Image source={layersIcon} style={styles.projectIcon} />
                <Text style={styles.projectInfoText}>Project</Text>
                <Text style={styles.projectInfoValue}>
                  {project?.id?.toString().padStart(2, '0') || '01'}
                </Text>
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Project Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter project name"
                placeholderTextColor="#98A2B3"
                value={formData.projectName}
                onChangeText={text =>
                  setFormData({ ...formData, projectName: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Email*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client email"
                placeholderTextColor="#98A2B3"
                value={formData.clientEmail}
                onChangeText={text =>
                  setFormData({ ...formData, clientEmail: text })
                }
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Price*</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.inputPrice}
                  placeholder={`≤ ${remainingAmount} AED`}
                  placeholderTextColor="#98A2B3"
                  value={formData.paymentPrice}
                  editable={remainingAmount > 0}
                  onChangeText={text => {
                    const numericValue = parseFloat(text) || 0;
                    if (numericValue > remainingAmount) {
                      Alert.alert(
                        'Amount exceeds limit',
                        'The entered amount exceeds the remaining payable limit. Please clear or delete pending invoices first.',
                      );
                      return;
                    }
                    setFormData({ ...formData, paymentPrice: text });
                  }}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>AED</Text>
              </View>

              {remainingAmount <= 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#DC2626',
                    marginTop: 4,
                    fontFamily: 'Outfit-Regular',
                  }}
                >
                  All invoices generated. No remaining amount left.
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.defaultWhite} />
              ) : (
                <Text style={styles.generateButtonText}>Generate</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  projectInfo: {
    backgroundColor: '#EDF5FE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3083FF',
  },
  projectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  projectInfoText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.primary,
    flex: 1,
  },
  projectInfoValue: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.primary,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
  },
  inputPrice: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    paddingRight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultWhite,
  },
});

export default GenerateInvoiceModal;
