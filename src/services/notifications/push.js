// FCM registration + foreground display. Background/killed-state notification
// messages are shown automatically by the OS; the background handler
// registered in index.js only needs to exist so RNFirebase doesn't warn.
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

import { isRemote } from '@/services/api/client';
import { notificationsApi } from '@/services/api/notificationsApi';

const PUSH_CHANNEL_ID = 'push';

let channelReady = false;
let currentToken = null;
let listenersAttached = false;

async function ensurePushChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  await notifee.createChannel({
    id: PUSH_CHANNEL_ID,
    name: 'Notifications',
    importance: AndroidImportance.HIGH,
  });
}

async function displayForeground(remoteMessage) {
  const { notification, data } = remoteMessage || {};
  if (!notification) return; // data-only messages are handled by feature code, not shown here
  try {
    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      data,
      android: { channelId: PUSH_CHANNEL_ID, pressAction: { id: 'default', launchActivity: 'default' } },
    });
  } catch (err) {
    console.warn('[push] failed to display foreground notification', err?.message || err);
  }
}

// Call once a real session exists (after login/signup). Requests the
// notification permission, gets the FCM token, and registers it with the
// backend so it can target this device via admin.messaging().
export async function registerForPushNotifications() {
  if (!isRemote()) return;
  try {
    await ensurePushChannel();
    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus < 1) return; // denied — nothing to register

    currentToken = await messaging().getToken();
    await notificationsApi.registerToken(currentToken, Platform.OS);

    if (!listenersAttached) {
      listenersAttached = true;
      messaging().onTokenRefresh(async (newToken) => {
        currentToken = newToken;
        try {
          await notificationsApi.registerToken(newToken, Platform.OS);
        } catch (err) {
          console.warn('[push] token refresh registration failed', err?.message || err);
        }
      });
      messaging().onMessage(displayForeground);
    }
  } catch (err) {
    console.warn('[push] registration failed', err?.message || err);
  }
}

// Call on logout/delete-account, before the session is torn down.
export async function unregisterPushNotifications() {
  if (!isRemote() || !currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await notificationsApi.unregisterToken(token);
  } catch (err) {
    console.warn('[push] unregister failed', err?.message || err);
  }
}
