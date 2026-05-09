/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// 🔹 Create a default notification channel
async function createDefaultChannel() {
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
    lights: true,
    lightColor: '#FF0000',
    badge: true,
  });
}

// 🔹 Handle background messages (when app is in background but still running)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await createDefaultChannel();

    const notificationId = await notifee.displayNotification({
      title: remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification',
      body: remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new message!',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        sound: 'default',
        autoCancel: true,
        showTimestamp: true,
        timestamp: Date.now(),
        vibrationPattern: [300, 500],
        lightUpScreen: true,
        visibility: 1,
      },
      data: remoteMessage.data || {},
    });

    // console.log('[Background] Notification displayed with ID:', notificationId);
  } catch (error) {
    console.error('[Background] Error displaying notification:', error);
  }
});

// 🔹 Handle messages when app is fully killed (Android Headless JS)
AppRegistry.registerHeadlessTask('RNFirebaseBackgroundMessage', () =>
  async remoteMessage => {
    // console.log(' [Killed] message received:', remoteMessage);
    // console.log(' [Killed] Notification title:', remoteMessage.notification?.title);
    // console.log('[Killed] Notification body:', remoteMessage.notification?.body);

    try {
      await createDefaultChannel();

      const notificationId = await notifee.displayNotification({
        title: remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification',
        body: remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new message!',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          sound: 'default',
          autoCancel: true,
          showTimestamp: true,
          timestamp: Date.now(),
          vibrationPattern: [300, 500],
          lightUpScreen: true,
          visibility: 1,
        },
        data: remoteMessage.data || {},
      });

      // console.log('[Killed] Notification displayed with ID:', notificationId);
    } catch (error) {
      console.error(' [Killed] Error displaying notification:', error);
    }
  }
);

// 🔹 Register main app
AppRegistry.registerComponent(appName, () => App);
