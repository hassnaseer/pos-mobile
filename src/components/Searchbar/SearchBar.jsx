import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import colors from '../../theme/colors';

const SearchBar = ({ 
  placeholder = "Search...", 
  onSearch, 
  onClear,
  containerStyle,
  inputStyle 
}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (text) => {
    setSearchText(text);
    if (onSearch) onSearch(text);
  };

  const handleClear = () => {
    setSearchText('');
    if (onClear) onClear();
    if (onSearch) onSearch('');
  };

  return (
    <View style={[styles.container, containerStyle, isFocused && styles.containerFocused]}>
      <Search size={18} color="#667085" style={styles.icon} />

      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        value={searchText}
        onChangeText={handleSearch}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
      />

      {searchText.length > 0 && (
        <TouchableOpacity 
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <X size={16} color="#667085" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.defaultWhite,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EAECF0',
    flex: 1,
  },
  containerFocused: {
    borderColor: colors.primary || '#6941C6',
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#101828',
    padding: 0,
    fontFamily: 'Inter-Regular',
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchBar;
