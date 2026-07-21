import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import colors from '../../theme/colors';

// Branded toast styles shared across the app (used by src/utils/toast.js showToast.*).
// Pass `toastConfig` to <Toast config={toastConfig} /> in App.jsx.

const VARIANTS = {
  success: { accent: '#16a34a', bg: '#ECFDF5', icon: '✓', iconBg: '#16a34a' },
  error:   { accent: '#dc2626', bg: '#FEF2F2', icon: '!', iconBg: '#dc2626' },
  info:    { accent: colors.primary, bg: '#EFF6FF', icon: 'i', iconBg: colors.primary },
};

function BaseToast({ variant, text1, text2 }) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <View style={[styles.card, { backgroundColor: v.bg, borderLeftColor: v.accent }]}>
      <View style={[styles.iconWrap, { backgroundColor: v.iconBg }]}>
        <Text style={styles.iconText}>{v.icon}</Text>
      </View>
      <View style={styles.textWrap}>
        {text1 ? <Text style={[styles.title, { color: v.accent }]} numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text style={styles.msg} numberOfLines={3}>{text2}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => Toast.hide()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.close}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export const toastConfig = {
  success: props => <BaseToast variant="success" {...props} />,
  error:   props => <BaseToast variant="error" {...props} />,
  info:    props => <BaseToast variant="info" {...props} />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '92%', alignSelf: 'center',
    borderRadius: 12, borderLeftWidth: 4, paddingVertical: 12, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  iconWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { color: '#fff', fontSize: 15, fontFamily: 'Outfit-Bold', lineHeight: 18 },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontFamily: 'Outfit-SemiBold' },
  msg: { fontSize: 12.5, fontFamily: 'Outfit-Regular', color: '#374151', marginTop: 1 },
  close: { fontSize: 13, color: '#9ca3af', paddingLeft: 4, fontFamily: 'Outfit-SemiBold' },
});

export default toastConfig;
