/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Background FCM handler (app killed / background)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? 'New Notification',
      body: remoteMessage.notification?.body ?? '',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default', launchActivity: 'default' },
        sound: 'default',
        autoCancel: true,
      },
      data: remoteMessage.data ?? {},
    });
  } catch {}
});

AppRegistry.registerComponent(appName, () => App);
