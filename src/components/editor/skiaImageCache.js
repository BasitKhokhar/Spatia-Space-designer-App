import { useEffect, useState } from 'react';
import { Image as RNImage } from 'react-native';
import { Skia } from '@shopify/react-native-skia';

// Process-wide decoded-image cache for the 2D plan canvas.
//
// Skia's own `useImage` has NO caching: it calls `Skia.Data.fromURI` inside a
// `useEffect` keyed on the source, per component instance, on every mount. The
// editor renders one FurnitureShape per placed item, so a 30-item plan decodes
// 30 images every time the screen mounts — and again after any remount. Worse,
// ten identical dining chairs decode the same PNG ten times.
//
// A module-level Map fixes both. Entries are decoded SkImages, which are small
// relative to the .glb models already held in memory, and the set is bounded by
// the number of distinct catalog items a user actually places.

const cache = new Map(); // source key -> SkImage
const pending = new Map(); // source key -> Promise<SkImage|null>

// A bundled asset is a require() number; a remote/local file is a string.
function keyFor(source) {
  if (source == null) return null;
  return typeof source === 'number' ? `bundled:${source}` : `uri:${source}`;
}

async function decode(source) {
  try {
    const data =
      typeof source === 'number'
        ? await Skia.Data.fromURI(RNImage.resolveAssetSource(source).uri)
        : await Skia.Data.fromURI(source);
    if (!data) return null;
    return Skia.Image.MakeImageFromEncoded(data);
  } catch {
    return null;
  }
}

function loadCached(source) {
  const key = keyFor(source);
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);

  const promise = decode(source).then((img) => {
    pending.delete(key);
    // Cache the null too? No — a transient failure should be retried on the
    // next mount, whereas a permanent one costs one cheap failed decode.
    if (img) cache.set(key, img);
    return img;
  });
  pending.set(key, promise);
  return promise;
}

// Drop-in replacement for Skia's useImage that shares decoded images across
// every component instance. Returns null while decoding — callers fall through
// to their next art layer, exactly as before.
export function useSkiaImageCached(source) {
  const key = keyFor(source);
  const [image, setImage] = useState(() => (key && cache.has(key) ? cache.get(key) : null));

  useEffect(() => {
    if (!key) {
      setImage(null);
      return undefined;
    }
    if (cache.has(key)) {
      setImage(cache.get(key));
      return undefined;
    }
    let cancelled = false;
    setImage(null);
    loadCached(source).then((img) => {
      if (!cancelled) setImage(img || null);
    });
    return () => {
      cancelled = true;
    };
  }, [key, source]);

  return image;
}

// Called when downloads are cleared, so the canvas stops drawing an image whose
// backing file has just been deleted.
export function evictSkiaImages() {
  cache.clear();
  pending.clear();
}
