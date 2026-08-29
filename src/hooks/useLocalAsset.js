import { useEffect, useState } from 'react';

import * as assetManager from '@/services/assets/assetManager';

// Resolve one catalog asset to a local file:// URI, downloading it if needed.
//
// The synchronous first read matters: an asset already on disk must resolve on
// the FIRST render, otherwise every placed item flashes its bundled fallback
// before swapping to the real artwork on every mount.
//
// Returns { uri, ready }. `uri` is null until the file exists locally — callers
// are expected to render their bundled fallback meanwhile, never a blank.
export function useLocalAsset(item, kind, { priority = 'bulk', enabled = true } = {}) {
  const itemId = item?.id;
  const [uri, setUri] = useState(() => (itemId && enabled ? assetManager.localUriFor(itemId, kind) : null));

  useEffect(() => {
    if (!itemId || !enabled) {
      setUri(null);
      return undefined;
    }

    let cancelled = false;
    const cached = assetManager.localUriFor(itemId, kind);
    if (cached) {
      setUri(cached);
      return undefined;
    }
    setUri(null);

    // No URL for this kind (most catalog items have no .glb, for instance) —
    // stay on the bundled fallback rather than queueing a doomed job.
    if (!assetManager.descriptorFor(item, kind)) return undefined;

    assetManager
      .ensureItemAssets(item, [kind])
      .then((result) => {
        if (!cancelled && result?.[kind]) setUri(result[kind]);
      })
      .catch(() => {
        /* fallback art already renders; a failure needs no UI here */
      });

    return () => {
      cancelled = true;
    };
    // `item` identity changes whenever the catalog re-syncs; key on the fields
    // that actually affect resolution so a re-sync does not re-download.
  }, [itemId, kind, enabled, priority, item?.modelUrl, item?.thumbUrl, item?.planTopUrl]);

  return { uri, ready: !!uri };
}

export default useLocalAsset;
