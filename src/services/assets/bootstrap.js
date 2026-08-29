// Decides WHEN the bulk download runs. Kept out of assetManager so the policy
// (which is product judgement) is separable from the machinery.

import * as assetManager from './assetManager';
import * as notification from './notification';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useProjectsStore } from '@/store/useProjectsStore';

let started = false;
let unsubscribeProgress = null;

// Every catalog id referenced by a saved project, so those assets can be pinned
// and survive "Clear downloads" — reopening an old project offline must work.
function placedCatalogIds() {
  try {
    const projects = useProjectsStore.getState().projects || [];
    const ids = new Set();
    for (const project of projects) {
      for (const floor of project.floors || []) {
        for (const item of floor.plan?.furniture || []) {
          if (item.catalogId) ids.add(item.catalogId);
        }
      }
    }
    return [...ids];
  } catch {
    return [];
  }
}

export function recomputePins() {
  assetManager.pinProjectAssets(placedCatalogIds());
}

// Mirror queue progress into the OS notification. Subscribed once, throttled by
// the queue itself, and torn down when the run completes.
function watchProgress() {
  if (unsubscribeProgress) return;
  unsubscribeProgress = assetManager.subscribe((state) => {
    if (state.status === 'running' || state.status === 'paused') {
      notification.showProgress(state);
    } else if (state.status === 'done') {
      notification.showComplete(state);
      unsubscribeProgress?.();
      unsubscribeProgress = null;
    }
  });
}

/**
 * Called after a successful sign-in, once the catalog has hydrated.
 *
 * Deliberately NOT a silent bulk pull on first run. The requirement is that
 * downloading starts automatically — and it does, from the next launch onward —
 * but the very first time we ask once, because silently consuming hundreds of
 * megabytes on someone's first session is how an app earns one-star reviews.
 * After that single answer it never asks again.
 *
 * @returns {'started'|'armed'|'off'|'prompt'} what happened, so the caller can
 *          show the first-run sheet when it returns 'prompt'.
 */
export function bootstrapAssets({ force = false } = {}) {
  assetManager.initAssets();
  recomputePins();

  const { assetDownloadPolicy, assetPromptSeen } = useSettingsStore.getState();
  assetManager.setPolicy(assetDownloadPolicy);

  if (assetDownloadPolicy === 'off' && !force) return 'off';
  if (!assetPromptSeen && !force) return 'prompt';

  return startBulkDownload();
}

// Without this the shade buttons render but do nothing. Registered once,
// lazily, so the listener is not installed for users who never download.
let actionsRegistered = false;
function registerNotificationActions() {
  if (actionsRegistered) return;
  actionsRegistered = true;
  notification.registerActions({
    onPause: () => assetManager.pause(),
    onResume: () => assetManager.resume(),
    onCancel: () => {
      assetManager.cancelAll();
      notification.dismiss();
    },
  });
}

export function startBulkDownload(kinds) {
  const items = useCatalogStore.getState().items || [];
  const plan = assetManager.planFullDownload(items);
  if (!plan.missingCount) return 'done';

  started = true;
  watchProgress();
  registerNotificationActions();
  // Fire-and-forget: the notification is a progress DISPLAY, never a gate. A
  // user who denies it still gets the full download.
  notification.requestPermissionIfNeeded();
  assetManager.startFullDownload(items, kinds);
  return 'started';
}

// First-run sheet answers. Each records the choice so the sheet never returns.
export function acceptFirstRunDownload() {
  useSettingsStore.getState().markAssetPromptSeen();
  return startBulkDownload();
}

export function deferFirstRunDownload() {
  // "Not now" — keep the policy, just do not bulk download this session. The
  // prompt stays unseen so it can be offered again on the next sign-in.
  return 'deferred';
}

export function chooseOnDemandOnly() {
  const { markAssetPromptSeen, setAssetDownloadPolicy } = useSettingsStore.getState();
  setAssetDownloadPolicy('off');
  assetManager.setPolicy('off');
  markAssetPromptSeen();
  // 'off' stops BULK prefetch only — ensureItemAssets still runs at user
  // priority, so placing an item always fetches what it needs.
  return 'on-demand';
}

// What the first-run sheet should quote.
export function plannedBytes() {
  const items = useCatalogStore.getState().items || [];
  return assetManager.planFullDownload(items).missingBytes;
}

export function hasStarted() {
  return started;
}
