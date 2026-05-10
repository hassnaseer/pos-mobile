import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import colors from '../../theme/colors';

const NoAccessScreen = ({ message = "You don't have permission to view this content." }) => {
  return (
    <View style={styles.container}>
      <Lock size={60} color={colors.warning} />
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subtext}>
        Please contact your administrator for access.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default NoAccessScreen;
