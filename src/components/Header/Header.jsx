import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import SearchBar from '../Searchbar/SearchBar';
import { useAuth } from '../../context/AuthContext';
import { useLogout } from '../../services/api/authApi';
import { ROLES } from '../../utils/permissions';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 60, right: 12 });
  const avatarRef = useRef(null);
  const setSearchQuery = useSearchStore(state => state.setSearchQuery);
  const navigation = useNavigation();
  const { user, userRole, logout: contextLogout } = useAuth();
  const { mutate: apiLogout, isPending } = useLogout();

  const initial = (user?.name ?? 'U')[0].toUpperCase();

  const handleLogout = () => {
    setDropdownOpen(false);
    apiLogout(undefined, {
      onSuccess: async () => {
        await AsyncStorage.multiRemove(['authToken', 'userData']);
        contextLogout?.();
      },
    });
  };

  const go = route => {
    setDropdownOpen(false);
    navigation.navigate(route);
  };

  const settingsRoute = userRole === ROLES.SUPER_ADMIN ? 'SASettings' : 'Settings';
  const showSettings = userRole !== ROLES.SUPPORT_STAFF;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity style={styles.iconButton} onPress={onBackPress} activeOpacity={0.7}>
              <Image source={backButton} style={styles.backIcon} />
            </TouchableOpacity>
          ) : showMenuButton ? (
            <TouchableOpacity style={styles.iconButton} onPress={onMenuPress} activeOpacity={0.7}>
              <Image source={menuIcon} style={styles.menuIconStyle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Center */}
        {showSearchBar && (
          <View style={styles.centerSection}>
            <SearchBar placeholder={searchPlaceholder} onSearch={setSearchQuery} />
          </View>
        )}

        {/* Right — bell + profile avatar */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress} activeOpacity={0.7}>
            <Image source={bellIcon} style={styles.menuIconStyle} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            ref={avatarRef}
            style={styles.avatarBtn}
            onPress={() => {
              avatarRef.current?.measureInWindow((_x, y, _w, height) => {
                setDropdownPos({ top: y + height + 6, right: 12 });
                setDropdownOpen(true);
              });
            }}
            activeOpacity={0.8}
          >
            {user?.profileImg
              ? <Image source={{ uri: user.profileImg }} style={styles.avatarImg} />
              : <Text style={styles.avatarInitial}>{initial}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile dropdown */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropdown, { top: dropdownPos.top, right: dropdownPos.right }]}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownName} numberOfLines={1}>{user?.name ?? 'User'}</Text>
                  <Text style={styles.dropdownSub} numberOfLines={1}>{user?.businessName ?? ''}</Text>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => go('Profile')}>
                  <Text style={styles.dropdownText}>My Profile</Text>
                </TouchableOpacity>
                {showSettings && (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => go(settingsRoute)}>
                    <Text style={styles.dropdownText}>Settings</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.divider} />
                <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout} disabled={isPending}>
                  <Text style={[styles.dropdownText, styles.logoutText]}>{isPending ? 'Logging out…' : 'Log Out'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  centerSection: { flex: 1, marginHorizontal: 10 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 6, borderWidth: 1, borderColor: '#EAECF0', borderRadius: 8, position: 'relative' },
  menuIconStyle: { width: 20, height: 20, resizeMode: 'contain' },
  backIcon: { width: 20, height: 20, resizeMode: 'contain', tintColor: '#666' },
  notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.warning, borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Outfit-Bold' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#EAECF0' },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarInitial: { fontSize: 14, fontFamily: 'Outfit-Bold', color: colors.primary },

  // Dropdown
  overlay: { flex: 1 },
  dropdown: { position: 'absolute', backgroundColor: '#fff', borderRadius: 12, width: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  dropdownHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  dropdownName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  dropdownSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  dropdownItem: { paddingVertical: 13, paddingHorizontal: 16 },
  dropdownText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack },
  logoutText: { color: '#ef4444' },
});

export default Header;
