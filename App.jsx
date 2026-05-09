import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApp, initializeApp as initFirebase } from '@react-native-firebase/app';
import messaging, { getMessaging, getToken } from '@react-native-firebase/messaging';

// Screens & Context
import SimpleSplashScreen from './src/screens/splash/SimpleSplashScreen';
import EnhancedSplashScreen from './src/screens/splash/EnhancedSplashScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { queryClient } from './src/utils/reactQueryClient';

//  Ask for notification permission (Notifee)
async function requestNotificationPermission() {
  try {
    const settings = await notifee.requestPermission();
    if (settings && settings.authorizationStatus) {
      console.log(' Notification permission granted');
    } else {
      console.warn(' Notification permission denied');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
}

function App() {
  const [splashStep, setSplashStep] = useState('simple');
  const opacity = useRef(new Animated.Value(1)).current;

  //  Initialize Firebase & Notifications
  useEffect(() => {
    const initializeApp = async () => {
      try {
        //  Ask for permission first
        await requestNotificationPermission();

        //  Initialize Firebase
        try {
          getApp();
          console.log('Firebase already initialized');
        } catch (e) {
          initFirebase();
          console.log('Firebase initialized successfully');
        }

        //  Create notification channel
        console.log('Creating notification channel...');
        const channelId = await notifee.createChannel({
          id: 'default',
          name: 'Default Notifications',
          description: 'Default channel for app notifications',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: '#FF0000',
          badge: true,
        });
        console.log('Notification channel created:', channelId);

        //  Firebase messaging permission (Android-safe)
        let enabled = false;
        try {
          const authStatus = await messaging().requestPermission();
          enabled = authStatus === 1 || authStatus === true;
        } catch (err) {
          console.warn(' Firebase messaging permission not required on Android');
        }

        if (enabled) console.log(' FCM permission granted');
        else console.warn(' FCM permission denied');
      } catch (error) {
        console.error('Error in initialization:', error);
      }
    };

    initializeApp();
  }, []);

  //  Get FCM Token after splash completes
  useEffect(() => {
    if (splashStep !== 'done') return;
    const setupFirebase = async () => {
      try {
        const messagingInstance = getMessaging(getApp());
        const token = await getToken(messagingInstance);
        console.log('📱 FCM Token:', token);
      } catch (err) {
        console.error('Firebase setup error:', err);
      }
    };
    setupFirebase();
  }, [splashStep]);

  //  Notification cache invalidation helper
  let refetchTimeout;
  const invalidateNotifications = () => {
    clearTimeout(refetchTimeout);
    refetchTimeout = setTimeout(() => {
      console.log(' Invalidating notifications cache...');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, 1000);
  };

  //  Foreground notifications
  useEffect(() => {
    if (splashStep !== 'done') return;
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      try {
        await notifee.displayNotification({
          title:
            remoteMessage.notification?.title ||
            remoteMessage.data?.title ||
            'New Notification',
          body:
            remoteMessage.notification?.body ||
            remoteMessage.data?.body ||
            'You have a new message!',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default', launchActivity: 'default' },
            sound: 'default',
            vibrationPattern: [300, 500],
          },
        });
        invalidateNotifications();
      } catch (error) {
        console.error('Error handling FCM message:', error);
      }
    });
    return unsubscribe;
  }, [splashStep]);

  //  App opened from background or quit
  useEffect(() => {
    if (splashStep !== 'done') return;
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(' Opened app from quit state:', remoteMessage);
          invalidateNotifications();
        }
      });

    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(' Opened app from background:', remoteMessage);
      invalidateNotifications();
    });
    return unsubscribe;
  }, [splashStep]);

  //  Notifee foreground event listener
  useEffect(() => {
    if (splashStep !== 'done') return;
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      console.log('Notifee event:', type, detail);
      if (type === EventType.PRESS) {
        console.log('User pressed notification:', detail.notification);
      }
    });
    return unsubscribe;
  }, [splashStep]);

  //  Background event listener
  useEffect(() => {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('Notifee background event:', type, detail);
      if (type === EventType.PRESS) {
        console.log('User pressed notification in background:', detail.notification);
      }
    });
  }, []);

  //  Splash screen sequence
  useEffect(() => {
    if (splashStep === 'simple') {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          setSplashStep('enhanced');
          opacity.setValue(1);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [splashStep, opacity]);

  const handleEnhancedFinish = () => setSplashStep('done');
  const handleLogin = () => setSplashStep('done');

  //  Splash screens
  if (splashStep === 'simple') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
          <Animated.View style={{ flex: 1, opacity }}>
            <SimpleSplashScreen />
          </Animated.View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (splashStep === 'enhanced') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
          <EnhancedSplashScreen onLogin={handleLogin} onFinish={handleEnhancedFinish} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  //  Main App
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <AppNavigator />
          </SafeAreaView>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
