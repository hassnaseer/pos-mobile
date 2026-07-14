import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import colors from '../../../../theme/colors';

export function MultiPicker({ options, selected, onChange }) {
  const toggle = id => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  return (
    <FlatList
      data={options}
      keyExtractor={o => o.id}
      style={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No co-workers available.</Text>}
      renderItem={({ item }) => {
        const checked = selected.includes(item.id);
        return (
          <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 220, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0D5DD', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: 'Outfit-Bold' },
  name: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
});
