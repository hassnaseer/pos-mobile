import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

/**
 * Modal-sheet multi-select dropdown — same visual convention as InlinePicker (modal-sheet,
 * shared across admin forms) but allows selecting multiple options via checkboxes and stays
 * open until "Done" is tapped. Mirrors web's `MultiSelect` component
 * (frontend/src/app/components/ui/multi-select.tsx) used for the "Assigned Team" field.
 */
const MultiSelectPicker = ({
  label, selected = [], options, onChange, keyField = 'id', labelField = 'name',
  placeholder = 'Select…',
}) => {
  const [open, setOpen] = useState(false);
  const toggle = id => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const selectedLabels = options.filter(o => selected.includes(o[keyField])).map(o => o[labelField]);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, selectedLabels.length === 0 && { color: '#999' }]} numberOfLines={1}>
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView>
              {options.length === 0 && <Text style={styles.emptyText}>No options available.</Text>}
              {options.map(opt => {
                const checked = selected.includes(opt[keyField]);
                return (
                  <TouchableOpacity key={opt[keyField]} style={styles.option} onPress={() => toggle(opt[keyField])}>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.optionText}>{opt[labelField]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, flex: 1, marginRight: 8 },
  chevron: { fontSize: 12, color: colors.secondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 400, padding: 8 },
  emptyText: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', padding: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: 'Outfit-Bold' },
  optionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  doneBtn: { margin: 8, marginTop: 4, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  doneText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default MultiSelectPicker;
