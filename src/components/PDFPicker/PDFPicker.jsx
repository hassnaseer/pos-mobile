import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { pick, types, isCancel } from '@react-native-documents/picker';
import colors from '../../theme/colors';
import pdfIcon from '../../assets/icons/filetype-Icon.png';
import crossIcon from '../../assets/icons/cross-icon.png';

const PDFPicker = ({
  onPdfSelected,
  selectedPdf,
  onRemovePdf,
  label,
  placeholder,
  containerStyle,
  required,
}) => {
  const handleSelectPdf = async () => {
    try {
      const [result] = await pick({
        type: [types.pdf],
        allowMultiSelection: false,
      });

      if (result) {
        const pdfFile = {
          uri: result.uri,
          name: result.name || 'document.pdf',
          type: result.mimeType || 'application/pdf',
          size: result.size || 0,
        };
        onPdfSelected?.(pdfFile);
      }
    } catch (err) {
      if (!isCancel(err)) {
        Alert.alert('Error', 'Failed to pick PDF file');
        console.error('PDF Picker Error:', err);
      }
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity style={styles.uploadBox} onPress={handleSelectPdf}>
        <Image source={pdfIcon} style={styles.pdfIcon} />
        <Text style={styles.uploadText}>
          {selectedPdf ? selectedPdf.name : placeholder}
        </Text>
      </TouchableOpacity>

      {selectedPdf && (
        <View style={styles.pdfChip}>
          <Image source={pdfIcon} style={styles.pdfIcon} />
          <View style={styles.pdfInfo}>
            <Text style={styles.pdfName} numberOfLines={1}>
              {selectedPdf.name}
            </Text>
            {selectedPdf.size ? (
              <Text style={styles.pdfSize}>
                {(selectedPdf.size / 1024).toFixed(1)} KB
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onRemovePdf} style={styles.removeButton}>
            <Image source={crossIcon} style={styles.removeIcon} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper function to format file size
const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: 'red',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    gap: 8,
  },
  pdfIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  uploadText: {
    fontSize: 14,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  pdfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
    marginTop: 12,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfName: {
    fontSize: 14,
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Medium',
  },
  pdfSize: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: '#666',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    width: 10,
    height: 10,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
});

export default PDFPicker;
