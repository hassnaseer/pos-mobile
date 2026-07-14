import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import colors from '../../theme/colors';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const pad2 = n => String(n).padStart(2, '0');

// value / onDateChange always use ISO "YYYY-MM-DD" — matches every backend DTO.
// Display label is formatted for humans ("31 Dec 2025").
const toIso = (day, month, year) => `${year}-${pad2(month)}-${pad2(day)}`;

const parseIso = value => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
};

/**
 * Reusable date picker — tap the field to open a day/month/year scroll picker.
 * `value` and the value passed to `onDateChange` are both ISO "YYYY-MM-DD" strings.
 */
const DatePicker = ({
  value,
  onDateChange,
  placeholder = 'Select date',
  label,
  style,
  error,
  minimumDate,
  maximumDate,
  disabled,
}) => {
  const [show, setShow] = useState(false);
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Sync from the ISO value whenever the picker opens or the value changes
  useEffect(() => {
    const parsed = parseIso(value);
    if (parsed) {
      setSelectedDay(parsed.day);
      setSelectedMonth(parsed.month);
      setSelectedYear(parsed.year);
    }
  }, [value, show]);

  // Adjust day if month/year change and selected day is invalid
  useEffect(() => {
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  }, [selectedMonth, selectedYear, selectedDay]);

  const displayLabel = (() => {
    const parsed = parseIso(value);
    if (!parsed) return placeholder;
    return `${parsed.day} ${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
  })();

  const handleOpen = () => {
    if (disabled) return;
    setShow(true);
  };

  const handleDone = () => {
    onDateChange(toIso(selectedDay, selectedMonth, selectedYear));
    setShow(false);
  };

  const handleCancel = () => setShow(false);

  const minYear = minimumDate ? parseIso(minimumDate)?.year : new Date().getFullYear() - 50;
  const maxYear = maximumDate ? parseIso(maximumDate)?.year : new Date().getFullYear() + 50;

  const days = Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: (maxYear ?? selectedYear + 50) - (minYear ?? selectedYear - 50) + 1 }, (_, i) => (minYear ?? selectedYear - 50) + i);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputContainer, error && styles.inputError, disabled && styles.inputDisabled]}
        onPress={handleOpen}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {displayLabel}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={show}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleDone}>
                <Text style={[styles.modalButton, styles.doneButton]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.picker}
                  contentContainerStyle={styles.pickerContent}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDay === day && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDay === day && styles.pickerItemTextSelected,
                        ]}
                      >
                        {String(day).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.picker}
                  contentContainerStyle={styles.pickerContent}
                >
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        selectedMonth === month && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedMonth(month)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMonth === month && styles.pickerItemTextSelected,
                        ]}
                      >
                        {MONTH_NAMES[month - 1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.picker}
                  contentContainerStyle={styles.pickerContent}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        selectedYear === year && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedYear === year && styles.pickerItemTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.defaultWhite,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  inputDisabled: {
    backgroundColor: '#F4F6F9',
  },
  inputText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
    flex: 1,
  },
  placeholder: {
    color: '#98A2B3',
  },
  icon: {
    fontSize: 20,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#DC2626',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  modalButton: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.primary,
  },
  doneButton: {
    fontFamily: 'Outfit-SemiBold',
  },
  pickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    height: 300,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  picker: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: colors.primary,
  },
  pickerItemText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: colors.defaultWhite,
    fontFamily: 'Outfit-SemiBold',
  },
});

export default DatePicker;
