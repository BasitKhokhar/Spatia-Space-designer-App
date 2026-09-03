// The OS notification that shows download progress in the shade.
//
// Uses Notifee rather than expo-notifications for one decisive reason:
// expo-notifications has no binding for Android's NotificationCompat.setProgress,
// so it can only fake a bar with text. Notifee exposes it directly
// (`android.progress`), which is what produces the real determinate bar users
// recognise from every other download in the shade.
//
// It also gives us `asForegroundService`, so the transfer keeps running while
// the app is backgrounded instead of being suspended a few minutes in.
//
// iOS has no persistent progress notification and no library changes that.
// There it posts exactly two — start and finish — and the live progress lives
// in Settings › Offline resources.

import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidCategory,
  AndroidForegroundServiceType,
  EventType,
} from '@notifee/react-native';

const CHANNEL_ID = 'downloads';
const NOTIFICATION_ID = 'asset-download-progress';

// Android silently coalesces notification updates posted faster than ~1/s, so
// posting more often is wasted work that also burns battery.
const MIN_INTERVAL_MS = 1000;

let channelReady = false;
let permissionAsked = false;
let permissionGranted = false;
let lastPostAt = 0;
let lastPct = -1;
let iosStartPosted = false;
let foregroundRegistered = false;
let handlers = {};
let serviceRunning = false;

const fmt = (bytes) => {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

export async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Downloads',
      // LOW: ambient status. This must never buzz the phone or push a heads-up
      // banner over whatever the user is doing.
      importance: AndroidImportance.LOW,
      vibration: false,
      badge: false,
    });
  } catch (err) {
    console.warn('[assets] notification channel setup failed', err?.message || err);
  }
}

// Android 13+ runtime grant. Fire-and-forget by design: the notification is a
// DISPLAY, never a gate. A user who denies it still gets the full download.
export async function requestPermissionIfNeeded() {
  if (permissionAsked) return permissionGranted;
  permissionAsked = true;
  try {
    await ensureChannel();
    const settings = await notifee.requestPermission();
    // 1 = AUTHORIZED, 2 = PROVISIONAL — both allow posting.
    permissionGranted = settings.authorizationStatus >= 1;
  } catch (err) {
    console.warn('[assets] notification permission check failed', err?.message || err);
    permissionGranted = false;
  }
  return permissionGranted;
}

// The foreground service is what keeps bytes moving while the app is in the
// background. Notifee requires the task to stay alive for as long as the
// service should run, so it resolves only when the download finishes or the
// user stops it.
function registerForegroundService() {
  if (foregroundRegistered || Platform.OS !== 'android') return;
  foregroundRegistered = true;
  notifee.registerForegroundService(
    () =>
      new Promise((resolve) => {
        stopForegroundResolver = resolve;
      }),
  );
}

let stopForegroundResolver = null;

function stopForegroundService() {
  serviceRunning = false;
  if (stopForegroundResolver) {
    stopForegroundResolver();
    stopForegroundResolver = null;
  }
  notifee.stopForegroundService().catch(() => {});
}

// Registered at module load (cold start, idle JS thread) rather than lazily
// on first download. Notifee needs this JS<->native task bridge wired up
// before `displayNotification({ asForegroundService: true })` is ever called;
// registering it for the first time in the same tick as the post-login burst
// of API calls (projects/credits/catalog/push) starves the bridge and Android
// kills the app with ForegroundServiceDidNotStartInTimeException.
registerForegroundService();

// Action buttons. Notifee delivers presses to both a foreground and a
// background listener; the background one is what fires when the shade is used
// while the app is not on screen, which is the common case here.
export function registerActions({ onPause, onResume, onCancel } = {}) {
  handlers = { onPause, onResume, onCancel };
  registerForegroundService();

  const dispatch = ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS) return;
    const id = detail?.pressAction?.id;
    if (id === 'pause') handlers.onPause?.();
    else if (id === 'resume') handlers.onResume?.();
    else if (id === 'cancel') handlers.onCancel?.();
  };

  notifee.onForegroundEvent(dispatch);
  notifee.onBackgroundEvent(async (event) => {
    dispatch(event);
  });
}

function actionsFor(status) {
  if (Platform.OS !== 'android') return [];
  return status === 'paused'
    ? [
        { title: 'Resume', pressAction: { id: 'resume' } },
        { title: 'Cancel', pressAction: { id: 'cancel' } },
      ]
    : [
        { title: 'Pause', pressAction: { id: 'pause' } },
        { title: 'Cancel', pressAction: { id: 'cancel' } },
      ];
}

export async function showProgress(state) {
  if (!permissionGranted) return;

  const pct = Math.round((state.pct || 0) * 100);

  // iOS cannot hold a live notification and re-posting one repeatedly is
  // user-hostile — announce once, then let the in-app UI carry it.
  if (Platform.OS === 'ios') {
    if (iosStartPosted) return;
    iosStartPosted = true;
    await notifee
      .displayNotification({
        id: NOTIFICATION_ID,
        title: 'Downloading offline resources',
        body: `${fmt(state.totalBytes)} of 3D models and images. Progress is in Settings.`,
      })
      .catch(() => {});
    return;
  }

  const now = Date.now();
  if (pct === lastPct && now - lastPostAt < MIN_INTERVAL_MS) return;
  if (now - lastPostAt < MIN_INTERVAL_MS) return;
  lastPostAt = now;
  lastPct = pct;

  const running = state.status !== 'paused';
  if (running && !serviceRunning) {
    registerForegroundService();
    serviceRunning = true;
  }

  try {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: running ? 'Downloading resources' : 'Download paused',
      // Matches the shade convention users already know from other downloads.
      body: `${fmt(state.doneBytes)} / ${fmt(state.totalBytes)}`,
      android: {
        channelId: CHANNEL_ID,
        color: '#131210',
        category: AndroidCategory.PROGRESS,
        // THE native determinate bar.
        progress: { max: 100, current: Math.max(0, Math.min(100, pct)), indeterminate: false },
        // Sticky while running so it cannot be swiped away mid-transfer.
        ongoing: running,
        autoCancel: false,
        // Update in place without re-alerting on every tick.
        onlyAlertOnce: true,
        showTimestamp: false,
        actions: actionsFor(state.status),
        // Keeps the process alive while backgrounded. Only while genuinely
        // running — a paused download must not hold a foreground service.
        asForegroundService: running,
        // Must stay a subset of the manifest's foregroundServiceType or
        // Android 14+ kills the process at startForeground(). Notifee's AAR
        // declares only shortService, so plugins/withNotifeeForegroundServiceType.js
        // overrides the service element to dataSync|shortService — keep the two
        // in step.
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } catch (err) {
    console.warn('[assets] notification post failed', err?.message || err);
  }

  if (!running) stopForegroundService();
}

export async function showComplete(state) {
  lastPct = -1;
  iosStartPosted = false;
  if (Platform.OS === 'android') stopForegroundService();
  if (!permissionGranted) return;
  const total = state.usedBytes || state.doneBytes;
  try {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Offline resources ready',
      body: `${fmt(total)} downloaded — 3D models and plan artwork now work offline.`,
      android: {
        channelId: CHANNEL_ID,
        color: '#131210',
        // No progress/ongoing: this one is dismissible, as a finished job should be.
        autoCancel: true,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: `${fmt(total)} downloaded. Your catalog now renders with real models and top-down artwork without a connection.`,
        },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } catch (err) {
    console.warn('[assets] completion notification failed', err?.message || err);
  }
}

export async function showFailed(count) {
  if (!count || !permissionGranted) return;
  try {
    await notifee.displayNotification({
      title: 'Some resources could not download',
      body: `${count} item${count === 1 ? '' : 's'} failed. Retry from Settings › Offline resources.`,
      android: {
        channelId: CHANNEL_ID,
        color: '#131210',
        autoCancel: true,
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  } catch {
    /* a failed failure-notification is not worth escalating */
  }
}

export async function dismiss() {
  if (Platform.OS === 'android') stopForegroundService();
  try {
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch {
    /* nothing useful to do */
  }
}
