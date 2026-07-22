import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import colors from '../../theme/colors';

/**
 * Icon-only "+" action for list/section headers — replaces the old "+ Add X" text
 * pill so long labels ("+ Add Employee") don't stretch the header. The label still
 * reaches screen readers via accessibilityLabel.
 */
const HeaderAddButton = ({ onPress, label = 'Add', disabled, style, size = 20 }) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled, style]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Plus size={size} color="#fff" strokeWidth={2.5} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
});

export default HeaderAddButton;
