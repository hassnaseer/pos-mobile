import React, { useEffect } from 'react';
import { StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import Toast from 'react-native-toast-message';

import { AuthProvider } from './src/context/AuthContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { queryClient } from './src/utils/reactQueryClient';
import Navigation from './src/navigation';

const createDefaultChannel = () =>
  notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

const App = () => {
  // Request notification permission + create channel
  useEffect(() => {
    const setup = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        } else {
          await messaging().requestPermission();
        }
        await createDefaultChannel();
      } catch {}
    };
    setup();
  }, []);

  // Foreground FCM → display via Notifee
  useEffect(() => {
    const unsub = messaging().onMessage(async remoteMessage => {
      try {
        await createDefaultChannel();
        await notifee.displayNotification({
          title: remoteMessage.notification?.title ?? 'New Notification',
          body: remoteMessage.notification?.body ?? '',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default', launchActivity: 'default' },
            sound: 'default',
          },
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch {}
    });
    return unsub;
  }, []);

  // Notification tap — app in background
  useEffect(() => {
    const unsub = messaging().onNotificationOpenedApp(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    messaging()
      .getInitialNotification()
      .then(msg => {
        if (msg) queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    return unsub;
  }, []);

  // Notifee foreground tap
  useEffect(() => {
    return notifee.onForegroundEvent(({ type }) => {
      if (type === EventType.PRESS) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CurrencyProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              <Navigation />
              <Toast />
            </CurrencyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
