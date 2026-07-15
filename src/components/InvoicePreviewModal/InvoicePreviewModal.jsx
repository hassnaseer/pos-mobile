import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import RNPrint from 'react-native-print';
import colors from '../../theme/colors';

/**
 * Renders an HTML document (invoice/payslip) in a WebView with Print/Share and
 * Close actions. Used both for the real document (after checkout, from order
 * detail, from payslip list) and for the live preview in template settings
 * screens (pass `previewOnly` to hide the Print/Share actions there).
 */
const InvoicePreviewModal = ({ visible, onClose, html, fileName = 'document', title = 'Preview', previewOnly = false }) => {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await RNPrint.print({
        html,
        jobName: fileName.replace(/[^a-z0-9-_]/gi, '_'),
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to print document. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scalesPageToFit
        />
        {!previewOnly && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint} disabled={printing}>
              {printing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.printBtnText}>Print</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', flex: 1 },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  closeBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  webview: { flex: 1 },
  footer: { padding: 14, borderTopWidth: 1, borderColor: '#eee' },
  printBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  printBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default InvoicePreviewModal;
