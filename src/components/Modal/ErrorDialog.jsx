import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

const VARIANTS = {
  error:   { accent: '#dc2626', icon: '⚠️' },
  warning: { accent: '#d97706', icon: '⚠️' },
  info:    { accent: colors.primary, icon: 'ℹ️' },
};

let showFn = null;

/**
 * Imperative global trigger — call from anywhere (screens, API client catch blocks, etc.)
 * without prop-drilling or local modal state, mirroring utils/toast.js's showToast pattern.
 * Usage: showErrorDialog('Login Error', 'Network request failed')
 *     or showErrorDialog({ title, message, variant: 'warning', okLabel: 'Got it' })
 */
export function showErrorDialog(titleOrOpts, message) {
  const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts, message } : (titleOrOpts ?? {});
  if (showFn) showFn(opts);
}

/** Mounted once at the app root (see App.jsx, alongside <Toast />) — renders nothing until
 *  showErrorDialog() is called from anywhere in the app. Replaces the native Alert.alert popup
 *  with a dialog styled to match the rest of the app instead of the default OS look. */
export default function ErrorDialog() {
  const [state, setState] = useState(null);

  useEffect(() => {
    showFn = (opts) => setState({ title: 'Error', message: '', variant: 'error', okLabel: 'OK', ...opts });
    return () => { showFn = null; };
  }, []);

  if (!state) return null;
  const v = VARIANTS[state.variant] ?? VARIANTS.error;
  const close = () => setState(null);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>{v.icon}</Text>
          <Text style={styles.title}>{state.title}</Text>
          {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <TouchableOpacity style={[styles.okBtn, { backgroundColor: v.accent }]} onPress={close}>
            <Text style={styles.okText}>{state.okLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
  icon: { fontSize: 32, marginBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  okBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center', marginTop: 20, minWidth: 120 },
  okText: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#fff' },
});
