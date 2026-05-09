import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import colors from '../../../theme/colors';

const ConfirmDeleteInventoryModal = ({ visible, onClose, onConfirm, itemName }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.deleteModalContainer}>
        <Text style={styles.deleteModalTitle}>
          Are you sure you want to delete this item?
        </Text>
        <Text style={styles.deleteModalSubtitle}>
          {itemName}
        </Text>
        <View style={styles.deleteModalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={onConfirm}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  deleteModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.warning,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConfirmDeleteInventoryModal;
