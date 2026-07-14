import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

/**
 * Small "+Add new" modal for quick-creating a related entity inline (Department,
 * Document Category, Leave Type, …) without leaving the parent form.
 *
 * `fields`: [{ key, label, placeholder, keyboardType }]
 * `onCreate(values)` must return the created entity (or throw on failure).
 */
export default function QuickCreateModal({ visible, title, fields, onClose, onCreate, onCreated }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.key, ''])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setValues(Object.fromEntries(fields.map(f => [f.key, ''])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = key => val => setValues(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    const missing = fields.find(f => f.required !== false && !String(values[f.key] ?? '').trim());
    if (missing) {
      Alert.alert('Error', `${missing.label} is required`);
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        fields.map(f => [f.key, f.keyboardType === 'numeric' || f.keyboardType === 'decimal-pad' ? Number(values[f.key]) : values[f.key].trim()]),
      );
      const created = await onCreate(payload);
      onCreated?.(created);
      onClose();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {fields.map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={String(values[f.key] ?? '')}
                onChangeText={set(f.key)}
                placeholder={f.placeholder}
                placeholderTextColor="#999"
                keyboardType={f.keyboardType ?? 'default'}
                autoFocus={fields.indexOf(f) === 0}
              />
            </View>
          ))}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 17, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
