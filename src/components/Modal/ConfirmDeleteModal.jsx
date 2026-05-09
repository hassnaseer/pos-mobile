import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import deleteIcon from '../../assets/icons/trash-01.png';

const ConfirmDeleteModal = ({ visible, onClose, onConfirm, itemName, title = 'Delete Confirmation' }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View> */}

          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Image source={deleteIcon} style={styles.deleteIcon} />
            </View>
            <Text style={styles.message}>
              Are you sure you want to delete{' '}
              <Text style={styles.itemName}>{itemName || 'this item'}</Text>?
            </Text>
            {/* <Text style={styles.subMessage}>This action cannot be undone.</Text> */}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
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
    padding: 24,
    alignItems: 'center',
  },
  deleteIcon:{
    width:24,
    height:24,
    resizeMode:'contain',
  },
  warningIconContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontFamily:'Outfit-SemiBold',
    marginBottom: 8,
  },
  itemName: {
    fontWeight: '600',
    color: colors.warning,
  },
  subMessage: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    // borderTopWidth: 1,
    // borderTopColor: '#D0D5DD',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth:1,
    borderColor:'#D0D5DD',
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily:'Outfit-Regular',


  },
  deleteButton: {
    backgroundColor: colors.warning,
  },
  deleteButtonText: {
    fontSize: 16,
    color: colors.defaultWhite,
    fontFamily:'Outfit-Regular',

  },
});

export default ConfirmDeleteModal;
