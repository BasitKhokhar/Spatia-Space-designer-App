// Descriptor derivation — pure, no I/O.
//
// The cache key carries a CONTENT TOKEN, which is what closes the stale-file
// bug the old cache had: it stored `<catalogId>.glb`, so republishing a model
// under the same slug served the original bytes forever. Here a changed asset
// produces a different key, lands on a different path, and the old file becomes
// an orphan that the reconcile sweep collects.

// Ordered cheapest-value-first. Plan tops and thumbs together are a small
// fraction of the bytes but buy the entire 2D experience, so they download
// first; models are the expensive 3D tier.
export const ASSET_KINDS = ['planTop', 'thumb', 'model'];

const URL_FOR = {
  planTop: (item) => item?.planTopUrl,
  thumb: (item) => item?.thumbUrl,
  model: (item) => item?.modelUrl,
};
const BYTES_FOR = {
  planTop: (item) => item?.planTopBytes,
  thumb: (item) => item?.thumbBytes,
  model: (item) => item?.modelBytes,
};
const SHA_FOR = {
  planTop: (item) => item?.planTopSha,
  thumb: (item) => item?.thumbSha,
  model: (item) => item?.modelSha,
};

// Tiny non-crypto hash. Only used as a LAST-RESORT token when the server sent
// neither a sha nor a size — it just needs to change when the URL changes.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Preference order matters: sha is exact, size+updatedAt is a good proxy, the
// URL hash only catches re-uploads that changed the filename (which dashboard
// uploads do, since they are Date.now()-prefixed).
export function assetToken(item, kind) {
  const sha = SHA_FOR[kind]?.(item);
  if (sha) return String(sha).slice(0, 12);
  const bytes = BYTES_FOR[kind]?.(item);
  if (bytes && item?.updatedAt) return fnv1a(`${bytes}:${item.updatedAt}`);
  const url = URL_FOR[kind]?.(item);
  return url ? fnv1a(url) : 'na';
}

// A filesystem-safe key. The item id is a slug (already safe), but guard anyway
// so an odd server-side id can never escape the assets directory.
export function assetKey(item, kind) {
  const id = String(item?.id || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${id}__${kind}__${assetToken(item, kind)}`;
}

// One downloadable unit. `bytes` may be 0 when the server has not been
// backfilled yet — the queue treats that as "unknown", not "empty".
export function descriptorFor(item, kind) {
  const url = URL_FOR[kind]?.(item);
  if (!url) return null;
  return {
    key: assetKey(item, kind),
    itemId: item.id,
    kind,
    url,
    bytes: BYTES_FOR[kind]?.(item) || 0,
    sha: SHA_FOR[kind]?.(item) || null,
  };
}

export function assetsForItem(item, kinds = ASSET_KINDS) {
  return kinds.map((k) => descriptorFor(item, k)).filter(Boolean);
}

// Whole-catalog descriptor list, in tier order so a bulk download naturally
// front-loads the cheap 2D wins.
export function assetsForCatalog(items = [], kinds = ASSET_KINDS) {
  const out = [];
  for (const kind of kinds) {
    for (const item of items) {
      const d = descriptorFor(item, kind);
      if (d) out.push(d);
    }
  }
  return out;
}
