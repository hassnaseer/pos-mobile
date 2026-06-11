import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import messaging from '@react-native-firebase/messaging';

import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import SimpleSplashScreen from '../screens/splash/SimpleSplashScreen';
import EnhancedSplashScreen from '../screens/splash/EnhancedSplashScreen';
import LoadingScreen from '../components/LoadingScreen';

const Stack = createStackNavigator();

function SplashFlow({ navigation }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState('simple');

  const handleSimpleFinish = () => {
    if (isLoading) {
      // Auth check still in flight — wait for it then re-evaluate
      setStep('loading');
      return;
    }
    if (isAuthenticated) {
      navigation.replace('Main');
    } else {
      setStep('enhanced');
    }
  };

  // When loading finishes after simple splash, redirect appropriately
  useEffect(() => {
    if (step === 'loading' && !isLoading) {
      if (isAuthenticated) navigation.replace('Main');
      else setStep('enhanced');
    }
  }, [isLoading, isAuthenticated, step, navigation]);

  if (step === 'simple')   return <SimpleSplashScreen onFinish={handleSimpleFinish} />;
  if (step === 'loading')  return <LoadingScreen />;
  return <EnhancedSplashScreen onLogin={() => navigation.replace('Auth')} navigation={navigation} />;
}

// Save FCM token to backend — called on mount and on token refresh
async function syncFcmToken() {
  try {
    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    if (token) {
      const { authApi } = await import('../services/api/authApi');
      await authApi.saveFcmToken(token);
    }
  } catch {
    // Non-critical — silently ignore
  }
}

export default function Navigation() {
  const navigationRef = useRef(null);
  const { isAuthenticated, isLoading } = useAuth();
  const isReady = useRef(false);

  // Sync FCM token whenever user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    syncFcmToken();
    const unsub = messaging().onTokenRefresh(() => syncFcmToken());
    return unsub;
  }, [isAuthenticated]);

  // Handle logout — only after auth check completes, never on initial load
  useEffect(() => {
    if (!isReady.current) return;
    if (isLoading) return; // AsyncStorage check still in progress — don't act yet
    if (!isAuthenticated) {
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  }, [isAuthenticated, isLoading]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => { isReady.current = true; }}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animationEnabled: false }}
      >
        <Stack.Screen name="Splash" component={SplashFlow} />
        <Stack.Screen name="Auth"   component={AuthStack}  />
        <Stack.Screen name="Main"   component={MainStack}  />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
