import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import colors from '../../theme/colors';

// Import custom icons
const icons = {
  arrowDown: require('../../assets/icons/arrow-down.png'),
  cross: require('../../assets/icons/cross-icon.png'),
  check: require('../../assets/icons/check-done-01.png'),
};

// Role options
const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'manager', label: 'Manager' },
  { id: 'sales_agent', label: 'Sales Agent' },
];

const RoleDropdown = ({
  value,
  onSelect,
  placeholder = 'Select role',
  error,
  touched,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedRole = ROLES.find(r => r.id === value);

  const handleSelect = role => {
    onSelect(role.id);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.dropdown, touched && error && styles.dropdownError]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          style={[styles.dropdownText, !selectedRole && styles.placeholder]}
        >
          {selectedRole ? selectedRole.label : placeholder}
        </Text>
        <Image source={icons.arrowDown} style={styles.iconDropdown} />
      </TouchableOpacity>

      {touched && error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Image source={icons.cross} style={styles.iconClose} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ROLES}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                  {/* {selectedRole?.id === item.id && (
                    <Image source={icons.check} style={styles.iconCheck} />
                  )} */}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  dropdown: {
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
  dropdownError: {
    borderColor: colors.warning,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  iconDropdown: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconClose: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  iconCheck: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
});

export default RoleDropdown;
