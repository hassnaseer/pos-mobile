import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Image,
} from 'react-native';
import { Formik } from 'formik';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import crossIcon from '../../assets/icons/cross-icon.png';


const FormBottomModal = ({
  visible,
  onClose,
  title,
  fields,
  initialValues,
  validationSchema,
  onSubmit,
  submitLabel,
  showCloseButton = true,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0], // slide up from bottom
  });

  return (
    <Modal
      animationType="none" // we handle animation ourselves
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY }] }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {showCloseButton && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Image source={crossIcon} style={styles.crossIcon}    />
              </TouchableOpacity>
            )}
          </View>

          {/* Form */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={onSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.form}>
                  {fields.map((field, idx) => (
                    <View key={idx} style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {field.label}
                        {field.required && <Text style={styles.star}>*</Text>}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          touched[field.name] &&
                            errors[field.name] &&
                            styles.inputError,
                        ]}
                        placeholder={field.placeholder}
                        placeholderTextColor="#999"
                        value={values[field.name]}
                        onChangeText={handleChange(field.name)}
                        onBlur={handleBlur(field.name)}
                        keyboardType={field.keyboardType || 'default'}
                        multiline={field.multiline || false}
                        numberOfLines={field.numberOfLines || 1}
                        secureTextEntry={field.secureTextEntry || false}
                      />
                      {touched[field.name] && errors[field.name] && (
                        <Text style={styles.errorText}>
                          {errors[field.name]}
                        </Text>
                      )}
                    </View>
                  ))}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>{submitLabel}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    color: colors.defaultBlack,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  form: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  crossIcon:{
    width:16,
    height:16,
    resizeMode:'contain',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.secondary,
  },
  inputError: {
    borderColor: 'red',
    fontFamily: 'Outfit-Medium',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Outfit-Medium',
  },
  star: {
    color: 'red',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FormBottomModal;
