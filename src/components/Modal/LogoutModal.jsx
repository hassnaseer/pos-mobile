import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import colors from '../../theme/colors';
import logoutIcon from '../../assets/icons/logout.png';
// import { Image } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const LogoutModal = ({ visible, onClose, onConfirm }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            <Image source={logoutIcon} style={styles.logoutIcon} />
            {/* Message */}
            <Text style={styles.message}>
              Are you sure you want to log out?
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.button, styles.logoutButton]}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    // flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // justifyContent: 'center',
    // alignItems: 'center',
    // paddingHorizontal: 20,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // bottom
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  contentContainer: {
    padding: 24,
    gap: 6,
    alignItems: 'center',
  },
  logoutIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    // fontWeight: '400',
    fontFamily:'Outfit-SemiBold'
    //  borderTopWidth:1,
    // borderColor:"#EAECF0",
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.defaultWhite,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cancelButtonText: {
    color: colors.secondary,
    fontSize: 16,
    // fontWeight: '500',
    fontFamily:'Outfit-Regular',
  },
  logoutButton: {
    backgroundColor: colors.defaultBlack,
  },
  logoutButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LogoutModal;
