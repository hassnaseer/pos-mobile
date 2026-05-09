import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from 'react-native';
import DocumentPicker from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../../theme/colors';
import pdfIcon from '../../assets/icons/filetype-Icon.png';
import crossIcon from '../../assets/icons/cross-icon.png';

/**
 * PDFPickerDocuments Component
 * A reusable component for picking ONLY PDF files using @react-native-documents/picker
 * This picker will ONLY show PDF files in the file browser (better UX)
 *
 * Installation Required:
 * npm install @react-native-documents/picker
 *
 * iOS: cd ios && pod install
 * Android: Should work automatically after npm install
 *
 * @param {Object} props
 * @param {Function} props.onPdfSelected - Callback when PDF is selected
 * @param {Object} props.selectedPdf - Currently selected PDF object {uri, name, type, size}
 * @param {Function} props.onRemovePdf - Callback to remove selected PDF
 * @param {string} props.label - Label text for the picker
 * @param {string} props.placeholder - Placeholder text when no PDF is selected
 * @param {Object} props.containerStyle - Additional styles for container
 * @param {boolean} props.required - Whether the field is required
 */
const PDFPickerDocuments = ({
  onPdfSelected,
  selectedPdf,
  onRemovePdf,
  label = 'Upload PDF',
  placeholder = 'Select PDF file',
  containerStyle,
  required = false,
}) => {

  const handleSelectPdf = async () => {
    try {
      // This will ONLY show PDF files in the picker
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf], // ONLY PDF files
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const file = result[0];

        console.log('📄 PDF selected:', {
          name: file.name,
          uri: file.uri,
          type: file.type,
          size: file.size,
        });

        const pdfFile = {
          uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
          name: file.name || 'document.pdf',
          type: file.type || 'application/pdf',
          size: file.size || 0,
        };

        onPdfSelected?.(pdfFile);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('🚫 User cancelled PDF picker');
      } else {
        console.error('❌ Error selecting PDF:', err);
        Alert.alert('Error', 'Failed to pick PDF file. Please try again.');
      }
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      {/* Upload Button */}
      <TouchableOpacity
        style={styles.uploadBox}
        onPress={handleSelectPdf}
        activeOpacity={0.7}
      >
        <Image source={pdfIcon} style={styles.pdfIcon} />
        <Text style={styles.uploadText}>
          {selectedPdf ? selectedPdf.name : placeholder}
        </Text>
      </TouchableOpacity>

      {/* Display selected PDF */}
      {selectedPdf && (
        <View style={styles.pdfChip}>
          <Icon name="picture-as-pdf" size={20} color="#D32F2F" />
          <View style={styles.pdfInfo}>
            <Text style={styles.pdfName} numberOfLines={1}>
              {selectedPdf.name}
            </Text>
            {selectedPdf.size && (
              <Text style={styles.pdfSize}>
                {formatFileSize(selectedPdf.size)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onRemovePdf}
            style={styles.removeButton}
          >
            <Image
              source={crossIcon}
              style={styles.removeIcon}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

export default PDFPickerDocuments;
