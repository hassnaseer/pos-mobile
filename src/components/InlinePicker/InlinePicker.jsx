import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

/**
 * Modal-sheet dropdown shared across admin forms (Staff, Job Board, Leave, HR Documents).
 * Pass `onAddNew` to show a "+ Add new" row at the bottom of the sheet for inline quick-create.
 */
const InlinePicker = ({
  label, value, options, onSelect, keyField = 'id', labelField = 'name',
  placeholder = 'Select…', allowNone = true, onAddNew, addNewLabel = '+ Add new',
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o[keyField] === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>
          {selected ? selected[labelField] : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {onAddNew && (
              <TouchableOpacity
                style={styles.addNewRow}
                onPress={() => { setOpen(false); onAddNew(); }}
              >
                <Text style={styles.addNewText}>{addNewLabel}</Text>
              </TouchableOpacity>
            )}
            <ScrollView>
              {allowNone && (
                <TouchableOpacity style={styles.option} onPress={() => { onSelect(''); setOpen(false); }}>
                  <Text style={styles.optionText}>— None —</Text>
                </TouchableOpacity>
              )}
              {options.map(opt => (
                <TouchableOpacity key={opt[keyField]} style={styles.option} onPress={() => { onSelect(opt[keyField]); setOpen(false); }}>
                  <Text style={[styles.optionText, value === opt[keyField] && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>
                    {opt[labelField]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chevron: { fontSize: 12, color: colors.secondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  addNewRow: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  addNewText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  option: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  optionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
});

export default InlinePicker;
