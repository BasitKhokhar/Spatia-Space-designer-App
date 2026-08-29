import { useState } from 'react';
import { View, Image } from 'react-native';

// The bundled "designed house" render. Shown whenever a project or a design has
// no picture of its own, so a card never falls back to a bare line sketch — a
// blank project looks as finished as one the backend shipped art for.
export const FALLBACK_COVER = require('../../../assets/fallback.png');

// The artwork's own backdrop. Used as the tile colour so there's no light flash
// or letterbox seam while a remote image is still decoding.
const COVER_BG = '#33302D';

// Fields a project/design may carry its picture in, in priority order. Projects
// created locally have none; server rows use `imageUrl`. The rest are accepted
// so an AI render or an export snapshot lands on the card without more wiring.
const URI_KEYS = ['imageUrl', 'image', 'thumbnailUrl', 'thumbnail', 'coverUrl', 'previewUri'];

// Pull the first usable image URI off a project/design record (null when it has
// none, which is the signal to draw the fallback art).
export function coverUriOf(entity) {
  if (!entity) return null;
  for (const key of URI_KEYS) {
    const v = entity[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// One cover renderer for every card in the app: the record's own image when it
// has one, the house render otherwise — including when a remote URL 404s or the
// device is offline, which is why the failure is tracked in state.
export default function CoverImage({ uri, height = 96, style, accessibilityLabel }) {
  const [failed, setFailed] = useState(false);
  const source = uri && !failed ? { uri } : FALLBACK_COVER;

  return (
    <View style={[{ height, backgroundColor: COVER_BG, overflow: 'hidden' }, style]}>
      <Image
        source={source}
        style={{ width: '100%', height }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

// Empty-state illustration: the same house render as a rounded plate. A
// first-run screen ("No projects yet") then opens on the app's own artwork
// instead of a grey outline icon.
export function CoverArt({ height = 150, style }) {
  return <CoverImage height={height} style={[{ width: '100%', borderRadius: 20 }, style]} />;
}
