import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { X } from 'lucide-react-native';
import colors from '../../theme/colors';

// Common 1D/2D symbologies used on retail product packaging.
const CODE_TYPES = ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39', 'qr', 'data-matrix'];

/**
 * Full-screen camera barcode/QR scanner. Feeds decoded values into `onScan(value)`,
 * same as manually typing a code into the POS's existing barcode text field.
 */
const BarcodeScannerModal = ({ visible, onClose, onScan }) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [requesting, setRequesting] = useState(false);
  const lastScan = useRef({ value: null, at: 0 });

  useEffect(() => {
    if (visible && !hasPermission && !requesting) {
      setRequesting(true);
      requestPermission().finally(() => setRequesting(false));
    }
  }, [visible, hasPermission, requesting, requestPermission]);

  const handleCodes = useCallback(codes => {
    const value = codes[0]?.value;
    if (!value) return;
    // Debounce the same code firing repeatedly across consecutive frames.
    const now = Date.now();
    if (lastScan.current.value === value && now - lastScan.current.at < 1500) return;
    lastScan.current = { value, at: now };
    onScan(value);
  }, [onScan]);

  const codeScanner = useCodeScanner({
    codeTypes: CODE_TYPES,
    onCodeScanned: handleCodes,
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {device && hasPermission ? (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              codeScanner={codeScanner}
            />
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at a barcode</Text>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            {requesting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : !hasPermission ? (
              <>
                <Text style={styles.permText}>Camera permission is needed to scan barcodes.</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.permText}>No camera available on this device.</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, borderWidth: 3, borderColor: colors.primary, borderRadius: 16, backgroundColor: 'transparent' },
  hint: { color: '#fff', fontFamily: 'Outfit-Medium', fontSize: 14, marginTop: 20 },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText: { color: '#fff', fontFamily: 'Outfit-Medium', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  permBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default BarcodeScannerModal;
