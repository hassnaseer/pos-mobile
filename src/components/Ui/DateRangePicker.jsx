import React from 'react';
import { View, StyleSheet } from 'react-native';
import DatePicker from './DatePicker';

// Two DatePickers side by side for a from/to filter row.
// `from`/`to` and the values passed to `onChangeFrom`/`onChangeTo` are ISO "YYYY-MM-DD" strings.
const DateRangePicker = ({
  from, to, onChangeFrom, onChangeTo,
  fromPlaceholder = 'From date', toPlaceholder = 'To date',
  style,
}) => (
  <View style={[styles.row, style]}>
    <DatePicker
      value={from}
      onDateChange={onChangeFrom}
      placeholder={fromPlaceholder}
      style={styles.field}
      maximumDate={to || undefined}
    />
    <DatePicker
      value={to}
      onDateChange={onChangeTo}
      placeholder={toPlaceholder}
      style={styles.field}
      minimumDate={from || undefined}
    />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, marginBottom: 0 },
});

export default DateRangePicker;
