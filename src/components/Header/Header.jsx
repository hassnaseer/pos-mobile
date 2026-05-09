import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import SearchBar from '../Searchbar/SearchBar';
import backButton from '../../assets/icons/backIcon.png';
import colors from '../../theme/colors';
import menuIcon from '../../assets/icons/menu-01.png';
import bellIcon from '../../assets/icons/bell-01.png';
import { useSearchStore } from '../../store/searchStore';

const Header = ({
  showMenuButton = true,
  showBackButton = false,
  showSearchBar = true,
  onMenuPress,
  onBackPress,
  onNotificationPress,
  searchPlaceholder = 'Search...',
  notificationCount = 0,
}) => {
  const setSearchQuery = useSearchStore(state => state.setSearchQuery);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left Side */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Image source={backButton} style={styles.backIcon} />
            </TouchableOpacity>
          ) : showMenuButton ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <Image source={menuIcon} style={styles.menuIconStyle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center - Search Bar now connected to Zustand */}
        {showSearchBar && (
          <View style={styles.centerSection}>
            <SearchBar
              placeholder={searchPlaceholder}
              onSearch={setSearchQuery} 
            />
          </View>
        )}

        {/* Right Side */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Image source={bellIcon} style={styles.menuIconStyle} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.defaultWhite,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
  },
  centerSection: {
    flex: 1,
    marginHorizontal: 12,
  },
  iconButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
  },
  menuIconStyle: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  backIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#666666',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 4,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: '#EAECF0',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.warning,
    borderRadius: 10,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.defaultWhite,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default Header;
