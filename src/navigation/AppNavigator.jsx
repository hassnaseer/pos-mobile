import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../services/api/clientApi';
import LoadingScreen from '../components/LoadingScreen';
import Header from '../components/Header/Header';
import ProtectedRoute from '../components/ProtectedRoute';
import { MODULES } from '../utils/permissions';

// Auth Screens
import LoginScreen from '../screens/auth/login/LoginScreen';
import EmailVerificationScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Shared Screens
import NotificationsScreen from '../screens/main/shared/Notifications/NotificationsScreen';

// Admin Screens
import LaunchManagementScreen from '../screens/main/admin/LeadManagement/LeadManagementScreen';
import InventoryManagementScreen from '../screens/main/admin/InventoryManagement/InventoryManagementScreen';
import SalesOfferScreen from '../screens/main/admin/SalesOffer/SalesOfferScreen';
import BrokersScreen from '../screens/main/admin/Brokers/BrokersScreen';
import BrokerDetailScreen from '../screens/main/admin/Brokers/BrokerDetailScreen';
import AdminConstructionUpdatesScreen from '../screens/main/admin/ConstructionUpdates/ConstructionUpdatesScreen';
import AdminUpcomingProjectsScreen from '../screens/main/admin/AdminUpcomingProjects/AdminUpcomingProjectsScreen';
import AdminInstallmentManagementScreen from '../screens/main/admin/AdminInstallmentManagement/AdminInstallmentManagementScreen';
import InstallmentDetailsScreen from '../screens/main/admin/AdminInstallmentManagement/InstallmentDetailsScreen';
import InstallmentPlanScreen_Admin from '../screens/main/admin/AdminInstallmentManagement/InstallmentPlanScreen';
import RolesPermissionsScreen from '../screens/main/admin/RolesPermissions/RolesPermissionsScreen';
import AdminConstructionUpdateDetails from '../screens/main/admin/ConstructionUpdates/ConstructionUpdateDetailsScreen';
import AdminProjectUpdateScreen from '../screens/main/admin/ConstructionUpdates/ProjectUpdateDetail';

// Client Screens
import ClientInstallmentsScreen from '../screens/main/client/ClientInstallments/ClientInstallmentsScreen';
import InquiryFormScreen from '../screens/main/client/InquiryForm/InquiryFormScreen';
import InstallmentPlanScreen from '../screens/main/client/InstallmentPlan/InstallmentPlanScreen';
import InstallmentManagementScreen from '../screens/main/client/InstallmentManagement/InstallmentManagementScreen';
import ConstructionUpdateDetailsScreen from '../screens/main/client/ConstructionUpdateDetails/ConstructionUpdateDetailsScreen';
import ProjectUpdateDetail from '../screens/main/client/ConstructionUpdateDetails/ProjectUpdateDetail';
import ProjectVisualsScreen from '../screens/main/client/ProjectVisuals/ProjectVisualsScreen';
import UpcomingProjectsScreen from '../screens/main/client/UpcomingProjects/UpcomingProjectsScreen';

// Components
import Sidebar from '../components/Sidebar/Sidebar';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Header configuration
const getHeaderOptions = ({
  navigation,
  isDrawerScreen = false,
  unreadCount = 0,
  showSearchBar,
}) => ({
  headerShown: true,
  header: () => (
    <Header
      showMenuButton={isDrawerScreen}
      showBackButton={!isDrawerScreen}
      showSearchBar={showSearchBar ?? true}
      onMenuPress={() => navigation.toggleDrawer?.()}
      onBackPress={() => navigation.goBack?.()}
      onNotificationPress={() => navigation.navigate('Notifications')}
      notificationCount={unreadCount}
    />
  ),
  gestureEnabled: isDrawerScreen,
});

//  Auth Stack
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen
      name="EmailVerification"
      component={EmailVerificationScreen}
    />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

//  Admin Drawer
const AdminDrawerNavigator = ({ unreadCount }) => (
  <Drawer.Navigator
    drawerContent={props => (
      <Sidebar
        navigation={props.navigation}
        onClose={() => props.navigation.closeDrawer()}
      />
    )}
    screenOptions={{ drawerType: 'slide', overlayColor: 'rgba(0, 0, 0, 0.5)' }}
  >
    <Drawer.Screen
      name="Leadmanagement"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={LaunchManagementScreen}
          moduleName={MODULES.LEAD_MANAGEMENT}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="InventoryManagement"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={InventoryManagementScreen}
          moduleName={MODULES.INVENTORY_MANAGEMENT}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="SalesOffer"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={SalesOfferScreen}
          moduleName={MODULES.CLIENT_AND_SPA_MANAGEMENT}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="Brokers"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={BrokersScreen}
          moduleName={MODULES.LEAD_MANAGEMENT}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="ConstructionUpdates"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={AdminConstructionUpdatesScreen}
          moduleName={MODULES.CONSTRUCTION_UPDATES}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="UpcomingProjects"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={AdminUpcomingProjectsScreen}
          moduleName={MODULES.UPCOMING_PROJECTS}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="InstallmentManagement"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={AdminInstallmentManagementScreen}
          moduleName={MODULES.INSTALLMENT_MANAGEMENT}
        />
      )}
    </Drawer.Screen>

    <Drawer.Screen
      name="RolesPermissions"
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    >
      {props => (
        <ProtectedRoute
          {...props}
          component={RolesPermissionsScreen}
          moduleName={MODULES.ROLES_AND_PERMISSIONS}
        />
      )}
    </Drawer.Screen>
  </Drawer.Navigator>
);

//  Admin Stack
const AdminStackNavigator = ({ unreadCount }) => (
  <Stack.Navigator>
    <Stack.Screen name="AdminDrawer" options={{ headerShown: false }}>
      {() => <AdminDrawerNavigator unreadCount={unreadCount} />}
    </Stack.Screen>

    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount, showSearchBar: false })
      }
    />
    <Stack.Screen
      name="InstallmentDetails"
      component={InstallmentDetailsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="AdminConstructionUpdateDetails"
      component={AdminConstructionUpdateDetails}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="AdminProjectUpdateScreen"
      component={AdminProjectUpdateScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount ,showSearchBar: false, })
      }
    />
    <Stack.Screen
      name="InstallmentPlan"
      component={InstallmentPlanScreen_Admin}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount ,showSearchBar: false, })
      }
    />
    <Stack.Screen
      name="AdminClientInstallments"
      component={ClientInstallmentsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="BrokerDetail"
      component={BrokerDetailScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount ,showSearchBar: false, })
      }
    />
  </Stack.Navigator>
);

//  Client Drawer Navigator
const ClientDrawerNavigator = ({ unreadCount }) => (
  <Drawer.Navigator
    drawerContent={props => (
      <Sidebar
        navigation={props.navigation}
        onClose={() => props.navigation.closeDrawer()}
      />
    )}
    screenOptions={{ drawerType: 'slide', overlayColor: 'rgba(0, 0, 0, 0.5)' }}
  >
    <Drawer.Screen
      name="ConstructionUpdateDetailsScreen"
      component={ConstructionUpdateDetailsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    />
    <Drawer.Screen
      name="InstallmentManagement"
      component={InstallmentManagementScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    />
    <Drawer.Screen
      name="UpcomingProjects"
      component={UpcomingProjectsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, isDrawerScreen: true, unreadCount })
      }
    />
  </Drawer.Navigator>
);

// Client Stack
const ClientStackNavigator = ({ unreadCount }) => (
  <Stack.Navigator>
    <Stack.Screen name="ClientDrawer" options={{ headerShown: false }}>
      {() => <ClientDrawerNavigator unreadCount={unreadCount} />}
    </Stack.Screen>

    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount,showSearchBar: false, })
      }
    />
    <Stack.Screen
      name="InstallmentPlan"
      component={InstallmentPlanScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount, showSearchBar: false, })
      }
    />
    <Stack.Screen
      name="ConstructionUpdateDetailsScreen"
      component={ConstructionUpdateDetailsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="ProjectUpdateDetail"
      component={ProjectUpdateDetail}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="ProjectVisuals"
      component={ProjectVisualsScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
    <Stack.Screen
      name="InquiryForm"
      component={InquiryFormScreen}
      options={({ navigation }) =>
        getHeaderOptions({ navigation, unreadCount })
      }
    />
  </Stack.Navigator>
);

//  Main Navigator
const MainNavigator = React.memo(({ unreadCount }) => {
  const { userRole } = useAuth();

  // if (
  //   userRole === 'admin' ||
  //   userRole === 'superadmin' ||
  //   userRole === 'manager'  
  // ) {
  //   return <AdminStackNavigator unreadCount={unreadCount} />;
  // } else {
  //   return <ClientStackNavigator unreadCount={unreadCount} />;
  // }
  if (userRole === 'client') {
  return <ClientStackNavigator unreadCount={unreadCount} />;
} else {
  return <AdminStackNavigator unreadCount={unreadCount} />;
}
});

//  Root App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  //  React Query hook — will NOT refetch infinitely
  const { data: notificationsData } = useNotifications(userRole, {
    enabled: !!isAuthenticated && !!userRole,
    refetchOnWindowFocus: false,
  });

  //  Memoize derived value
  const unreadCount = useMemo(
    () => notificationsData?.filter(n => !n.is_read)?.length || 0,
    [notificationsData],
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp">
            {() => <MainNavigator unreadCount={unreadCount} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
