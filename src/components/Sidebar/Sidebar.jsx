import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import crossIcon from '../../assets/icons/cross-icon.png';
import leadsIcon from '../../assets/icons/users-01.png';
import inventoryIcon from '../../assets/icons/pie-chart-03.png';
import salesIcon from '../../assets/icons/check-done-01.png';
import constructionIcon from '../../assets/icons/home-line.png';
import projectsIcon from '../../assets/icons/layers.png';
import installmentIcon from '../../assets/icons/coins-swap-01.png';
import rolesIcon from '../../assets/icons/git-branch-01.png';
import brokersIcon from '../../assets/icons/users-01.png';

import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { MODULES } from '../../utils/permissions';
import LogoutModal from '../Modal/LogoutModal';
import colors from '../../theme/colors';
import logo from '../../assets/images/logo.png';
import { useLogout } from '../../services/api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_MENU_ITEMS = [
  {
    id: 'lead_management',
    title: 'Leads Managment',
    icon: leadsIcon,
    route: 'Leadmanagement',
    module: MODULES.LEAD_MANAGEMENT,
  },
  {
    id: 'brokers',
    title: 'Broker Managment',
    icon: brokersIcon,
    route: 'Brokers',
    module: MODULES.LEAD_MANAGEMENT,
  },
  {
    id: 'inventory_management',
    title: 'Inventory Management',
    icon: inventoryIcon,
    route: 'InventoryManagement',
    module: MODULES.INVENTORY_MANAGEMENT,
  },
  {
    id: 'sales_offer',
    title: 'Client & SPA Management',
    icon: salesIcon,
    route: 'SalesOffer',
    module: MODULES.CLIENT_AND_SPA_MANAGEMENT,
  },
  {
    id: 'construction_updates',
    title: 'Construction Updates',
    icon: constructionIcon,
    route: 'ConstructionUpdates',
    module: MODULES.CONSTRUCTION_UPDATES,
  },
  {
    id: 'installment_management',
    title: 'Installment management',
    icon: installmentIcon,
    route: 'InstallmentManagement',
    module: MODULES.INSTALLMENT_MANAGEMENT,
  },
  {
    id: 'roles_permissions',
    title: 'Roles & Permissions',
    icon: rolesIcon,
    route: 'RolesPermissions',
    module: MODULES.ROLES_AND_PERMISSIONS,
  },
  {
    id: 'upcoming_projects',
    title: 'Upcoming Projects',
    icon: projectsIcon,
    route: 'UpcomingProjects',
    module: MODULES.UPCOMING_PROJECTS,
  },
];

const CLIENT_MENU_ITEMS = [
  {
    id: 'construction_updates',
    title: 'Construction Updates',
    icon: constructionIcon,
    route: 'ConstructionUpdateDetailsScreen',
    module: MODULES.CONSTRUCTION_UPDATES,
  },

  {
    id: 'installment_management',
    title: 'Installment management',
    icon: installmentIcon,
    route: 'InstallmentManagement',
    module: MODULES.INSTALLMENT_MANAGEMENT,
  },
  {
    id: 'upcoming_projects',
    title: 'Upcoming Projects',
    icon: projectsIcon,
    route: 'UpcomingProjects',
    module: MODULES.UPCOMING_PROJECTS,
  },
];

const Sidebar = ({ navigation, onClose }) => {
  const { userRole, logout: contextLogout } = useAuth();
  const { hasModule, isAdmin } = usePermissions();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  const { mutate: apiLogout, isPending } = useLogout();

  // Get base menu items based on role
  // Client users see client menu, everyone else sees admin menu
  const baseMenuItems =
    userRole === 'client' ? CLIENT_MENU_ITEMS : ADMIN_MENU_ITEMS;

  // Filter menu items based on user's module access
  const menuItems = baseMenuItems.filter(item => {
    // If user is client, show all client menu items (no permission checks)
    if (userRole === 'client') {
      return true;
    }
    // For ALL other users (admin, staff, etc.), check module access
    // This ensures even admins only see modules where allowed: true
    return hasModule(item.module);
  });

  useEffect(() => {
    const currentRoute = navigation.getCurrentRoute?.()?.name;
    if (currentRoute) {
      setActiveRoute(currentRoute);
    }
  }, [navigation]);

  const handleMenuPress = route => {
    setActiveRoute(route);

    try {
      navigation.navigate(route);
    } catch (err) {
      navigation.navigate('MainDrawer', { screen: route });
    }

    onClose && onClose();
  };

  const handleLogout = () => setShowLogoutModal(true);

  const handleLogoutConfirm = async () => {
    apiLogout(undefined, {
      onSuccess: async () => {
        setShowLogoutModal(false);

        // Clear AsyncStorage
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user_id');

        // Call the logout function from AuthContext
        // This will set isAuthenticated to false, which triggers navigation to Auth screen
        if (contextLogout) {
          contextLogout();
        }
      },
      onError: error => {
        console.log('Error logging out:', error);
        setShowLogoutModal(false);
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity onPress={onClose} style={styles.buttonContainer}>
            <Image source={crossIcon} style={styles.closeButton} />
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <ScrollView
          style={styles.menuContainer}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map(item => {
            const isActive = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.activeMenuItem]}
                onPress={() => handleMenuPress(item.route)}
                activeOpacity={0.7}
              >
                <Image
                  source={item.icon}
                  style={[
                    styles.menuIcon,
                    isActive && { tintColor: colors.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.menuText,
                    isActive && {
                      color: colors.primary,
                      fontFamily: 'Outfit-SemiBold',
                    },
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Logout */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>
              {isPending ? 'Logging out...' : 'Log out'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logo: { width: 200, height: 80 },
  closeButton: { width: 16, height: 16, resizeMode: 'contain' },
  buttonContainer: { height: '80%' },
  menuContainer: { flex: 1, paddingTop: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 14,
    gap: 12,
    paddingVertical: 14,
  },
  activeMenuItem: {
    backgroundColor: '#EBF0F5',
    marginHorizontal: 14,
    borderRadius: 6,
  },
  menuIcon: { width: 20, height: 18, resizeMode: 'contain' },
  menuText: {
    fontSize: 16,
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },
  footer: {
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  logoutButton: { paddingVertical: 12 },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default Sidebar;
