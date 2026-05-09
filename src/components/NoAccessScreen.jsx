import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import colors from '../theme/colors';

const lockIcon = require('../assets/icons/cross-icon.png');
const NoAccessScreen = ({
  moduleName = 'this module',
  onGoBack,
  navigation
}) => {
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image source={lockIcon} style={styles.lockIcon} />
        </View>

        <Text style={styles.title}>Access Denied</Text>

        <Text style={styles.message}>
          You don't have access to {moduleName}
        </Text>

        <Text style={styles.subMessage}>
          Please contact your administrator to request access to this module.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    width: 50,
    height: 50,
    tintColor: colors.warning,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NoAccessScreen;
