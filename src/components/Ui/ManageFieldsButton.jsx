import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from 'lucide-react-native';
import colors from '../../theme/colors';

/** Reads which field ids are hidden for `storageKey` — defaults to none hidden until the
 *  user explicitly saves a preference. Mirrors web's loadColumnPrefs (see
 *  frontend/src/app/components/shared/ManageColumnsButton.tsx) — same idea (per-device,
 *  show/hide only; mobile cards have a fixed layout so there's no reorder concept here). */
export async function loadHiddenFields(storageKey) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* corrupt/old value — default to none hidden */ }
  return new Set();
}

/**
 * Gear-icon button that opens a checklist of toggleable fields (no drag/reorder — mobile
 * cards have a fixed layout, only show/hide applies). Persists to AsyncStorage on Save.
 */
const ManageFieldsButton = ({ fields, storageKey, hidden, onSave }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(hidden);

  useEffect(() => { if (open) setDraft(hidden); }, [open, hidden]);

  const toggle = id => setDraft(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSave = async () => {
    await AsyncStorage.setItem(storageKey, JSON.stringify([...draft]));
    onSave(draft);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Settings size={18} color={colors.secondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.title}>Show Fields</Text>
            {fields.map(f => {
              const checked = !draft.has(f.id);
              return (
                <TouchableOpacity key={f.id} style={styles.row} onPress={() => toggle(f.id)}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.rowLabel}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 16, width: 260 },
  title: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 12, fontFamily: 'Outfit-Bold' },
  rowLabel: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});

export default ManageFieldsButton;
