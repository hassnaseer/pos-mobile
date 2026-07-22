import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet,
} from 'react-native';
import { isValidPhoneNumber, isPossiblePhoneNumber } from 'libphonenumber-js';
import colors from '../../theme/colors';
import { PHONE_COUNTRIES, DEFAULT_PHONE_COUNTRY, flagEmoji } from '../../constants/phoneCountries';

// Sorted longest-dial-code-first so e.g. "1876" (Jamaica) matches before the plain "1" (US/Canada).
const COUNTRIES_BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

function splitValue(value) {
  const digits = (value ?? '').replace(/[^\d]/g, '');
  if (!digits) return { country: DEFAULT_PHONE_COUNTRY, national: '' };
  const match = COUNTRIES_BY_DIAL_LENGTH.find(c => digits.startsWith(c.dial));
  if (!match) return { country: DEFAULT_PHONE_COUNTRY, national: digits };
  return { country: match, national: digits.slice(match.dial.length) };
}

/**
 * Phone number field matching web's PhoneInputComponent (frontend/src/app/components/PhoneInput.tsx):
 * a country flag + calling-code selector prefixed to the number field, value stored as a single
 * "+<dial><national>" E.164-ish string, with the same isValidPhoneNumber/isPossiblePhoneNumber checks.
 */
const PhoneInput = ({ label, value, onChange, placeholder = 'Phone number', error, required }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { country, national } = useMemo(() => splitValue(value), [value]);

  const fullNumber = `+${country.dial}${national}`;
  const isInvalid = national
    ? (!isPossiblePhoneNumber(fullNumber) || !isValidPhoneNumber(fullNumber))
    : false;
  const showError = error || isInvalid;

  const setNational = text => {
    const digits = text.replace(/[^\d]/g, '');
    onChange(`+${country.dial}${digits}`);
  };

  const selectCountry = c => {
    onChange(`+${c.dial}${national}`);
    setPickerOpen(false);
    setSearch('');
  };

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [search]);

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={styles.label}>{label} {required ? <Text style={styles.req}>*</Text> : null}</Text>
      ) : null}
      <View style={[styles.row, showError && styles.rowError]}>
        <TouchableOpacity style={styles.countryBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={styles.flag}>{flagEmoji(country.iso2)}</Text>
          <Text style={styles.dial}>+{country.dial}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          value={national}
          onChangeText={setNational}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>
      {isInvalid && <Text style={styles.errText}>⚠️ Invalid phone format</Text>}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code…"
              placeholderTextColor="#999"
              autoFocus
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.iso2}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.option} onPress={() => selectCountry(item)}>
                  <Text style={styles.optionFlag}>{flagEmoji(item.iso2)}</Text>
                  <Text style={[styles.optionText, item.iso2 === country.iso2 && styles.optionTextActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.optionDial}>+{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 6 },
  req: { color: colors.warning },
  row: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD',
    borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 4,
  },
  rowError: { borderColor: colors.warning },
  countryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 4 },
  flag: { fontSize: 18 },
  dial: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chevron: { fontSize: 10, color: colors.secondary, marginLeft: 2 },
  divider: { width: 1, height: 22, backgroundColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.text, paddingHorizontal: 10, paddingVertical: 10 },
  errText: { color: colors.warning, fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 4 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingTop: 12 },
  searchInput: {
    marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.text,
  },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0', gap: 10 },
  optionFlag: { fontSize: 18 },
  optionText: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  optionTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  optionDial: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
});

export default PhoneInput;
