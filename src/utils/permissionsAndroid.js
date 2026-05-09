// permissionsAndroid.js
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

export const ensureStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  const sdkInt = Platform.constants?.Release
    ? parseInt(Platform.constants.Release, 10)
    : 0;

  // 🔹 Android 13+ (SDK 33+)
  if (sdkInt >= 13) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      {
        title: 'Storage Access Required',
        message:
          'To download and view SPA documents, please allow access to your media files.',
        buttonPositive: 'Allow',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
  } else {
    // 🔹 Android 12 and below
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );

    if (!hasPermission) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Access Required',
          message:
            'To download and save SPA files, please allow storage access.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    } else {
      return true;
    }
  }

  // ❌ If still not granted, show fallback alert
  Alert.alert(
    'Permission Required',
    'You must allow storage access to save SPA documents. Please enable it from app settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ],
  );

  return false;
};
