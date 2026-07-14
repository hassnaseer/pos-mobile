import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DATE_MODES } from '../utils/dateRangeFilter';
import DateRangePicker from './Ui/DateRangePicker';
import colors from '../theme/colors';

export default function PeriodFilterRow({ mode, onModeChange, customStart, onCustomStartChange, customEnd, onCustomEndChange }) {
  return (
    <View style={s.wrap}>
      <View style={s.chips}>
        {DATE_MODES.map(m => (
          <TouchableOpacity key={m.value} style={[s.chip, mode === m.value && s.chipActive]} onPress={() => onModeChange(m.value)}>
            <Text style={[s.chipText, mode === m.value && s.chipTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'custom' && (
        <DateRangePicker
          from={customStart}
          to={customEnd}
          onChangeFrom={onCustomStartChange}
          onChangeTo={onCustomEndChange}
          fromPlaceholder="Start date"
          toPlaceholder="End date"
          style={s.customRow}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 10 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  customRow: { marginTop: 8 },
});
