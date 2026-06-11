import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/auth/login/LoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import LegalPageScreen from '../screens/auth/LegalPageScreen';

const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"           component={LoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"   component={ResetPasswordScreen} />
      <Stack.Screen name="LegalPage"       component={LegalPageScreen} />
    </Stack.Navigator>
  );
}
