import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import colors from '../../theme/colors';

const VARIANTS = {
  danger:  { btnBg: '#dc2626', btnText: '#fff', icon: '🗑️' },
  success: { btnBg: '#16a34a', btnText: '#fff', icon: '✅' },
  warning: { btnBg: '#d97706', btnText: '#fff', icon: '⚠️' },
  primary: { btnBg: colors.primary, btnText: '#fff', icon: '❓' },
};

const ConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}) => {
  const v = VARIANTS[variant] ?? VARIANTS.danger;
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>{v.icon}</Text>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: v.btnBg }, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={v.btnText} />
                : <Text style={[styles.confirmText, { color: v.btnText }]}>{confirmLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
  icon: { fontSize: 32, marginBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#6b7280' },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmText: { fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default ConfirmModal;
