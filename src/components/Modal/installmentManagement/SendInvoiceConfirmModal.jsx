import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../../theme/colors';

const SendInvoiceConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  isPending,
  invoiceNumber,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* <View style={styles.iconContainer}>
              <Icon name="email" size={48} color={colors.primary} />
            </View> */}
            <Text style={styles.title}>Send Invoice</Text>
            <Text style={styles.message}>
              Are you sure you want to send invoice{' '}
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text> to the
              client?
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isPending}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                isPending && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.defaultWhite} />
              ) : (
                <Text style={styles.confirmButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
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
    width: '100%',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
  },
  invoiceNumber: {
    fontFamily: 'Outfit-SemiBold',
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    color: colors.defaultWhite,
    fontFamily: 'Outfit-Regular',
  },
});

export default SendInvoiceConfirmModal;
