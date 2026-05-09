import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAllUnitsDropdown } from '../../services/api/clientApi';
import colors from '../../theme/colors';

// Import custom icons
const icons = {
  arrowDown: require('../../assets/icons/arrow-down.png'),
  cross: require('../../assets/icons/cross-icon.png'),
  check: require('../../assets/icons/check-done-01.png'),
};

const UnitDropdown = ({
  value,
  onSelect,
  placeholder = 'Select unit',
  error,
  touched,
  selectedProjectId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: allUnitsDropdown, isLoading } =
    useAllUnitsDropdown(selectedProjectId);
    
    // Ensure allUnits is an array and filter based on selected project
    const units = allUnitsDropdown
    ? allUnitsDropdown?.units.filter(u => u.status === 'Available')
    : [];

  // Find selected unit by id
  const selectedUnit = value ? units.find(u => u.id === value) : null;

  const handleSelect = unit => {
    // Pass the entire unit object so parent can access all properties
    onSelect(unit);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.dropdown, touched && error && styles.dropdownError]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          style={[styles.dropdownText, !selectedUnit && styles.placeholder]}
        >
          {selectedUnit
            ? `${selectedUnit.unit_no} `
            : placeholder}
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
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Image source={icons.cross} style={styles.iconClose} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={units}
                keyExtractor={item => item.id?.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTextBold}>{item.unit_no}</Text>
                      {/* <Text style={styles.itemTextSecondary}>
                        {item.project_name}
                      </Text>
                      <Text style={styles.itemTextSecondary}>
                        {item.size_sqft} sq. ft. •{' '}
                        {item.price_aed?.toLocaleString()} AED
                      </Text> */}
                    </View>
                    {/* {selectedUnit?.id === item.id && (
                      // <Image source={icons.check} style={styles.iconCheck} />
                    )} */}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No units available</Text>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
    fontFamily: 'Outfit-Medium',

    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  errorText: {
    color: colors.warning,
    fontSize: 12,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemContent: {
    flex: 1,
  },
  itemTextBold: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 4,
  },
  itemTextSecondary: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 2,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  iconDropdown: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconClose: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconCheck: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
});

export default UnitDropdown;
