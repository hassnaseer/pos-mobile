import React, { useState } from 'react';
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
import { useGetProjects } from '../../services/api/adminApi';
import colors from '../../theme/colors';

// Import custom icons
const icons = {
  arrowDown: require('../../assets/icons/arrow-down.png'),
  cross: require('../../assets/icons/cross-icon.png'),
  check: require('../../assets/icons/check-done-01.png'),
};

const ProjectDropdown = ({
  value,
  onSelect,
  placeholder = 'Select project',
  error,
  touched,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: projectsList, isLoading } = useGetProjects();

  // Filter projects - ensure projectsList is an array
  const projects = projectsList || [];
    
  // Find selected project by id
  const selectedProject = value ? projects.find(p => p.id === value) : null;

  const handleSelect = project => {
    // Pass the entire project object so parent can access all properties including id
    onSelect(project);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.dropdown, touched && error && styles.dropdownError]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          style={[styles.dropdownText, !selectedProject && styles.placeholder]}
        >
          {selectedProject ? selectedProject.project_name : placeholder}
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
              <Text style={styles.modalTitle}>Select Project</Text>
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
                data={projects}
                keyExtractor={item => item.id?.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.itemText}>{item.project_name}</Text>
                    {/* {selectedProject?.id === item.id && (
                      <Image source={icons.check} style={styles.iconCheck} />
                    )} */}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No projects available</Text>
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
    fontFamily: 'Outfit-Regular',
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
    paddingHorizontal: 10,
    // paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
     paddingHorizontal:10,
    paddingTop:10,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    // paddingHorizontal:10,
    // paddingVertical:20,
  },
  itemText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Medium',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: colors.secondary,
  },
  iconDropdown: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconClose: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  iconCheck: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
});

export default ProjectDropdown;
