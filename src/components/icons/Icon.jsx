import Svg, { Path, Rect, Circle, Line, Polygon, Polyline, G } from 'react-native-svg';

// Central line-icon set. Each entry renders SVG children for a 24x24 viewBox.
// Stroke-based icons inherit `color`; a few are filled or multicolor.
const ICONS = {
  'chevron-left': (c, w) => (
    <Path
      d="M15 5 L8 12 L15 19"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-right': (c, w) => (
    <Path
      d="M9 6 L15 12 L9 18"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'arrow-right': (c, w) => (
    <Path
      d="M5 12 H19 M13 6 L19 12 L13 18"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-up': (c, w) => (
    <Path d="M5 15 L12 8 L19 15" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'chevron-down': (c, w) => (
    <Path d="M5 9 L12 16 L19 9" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  layers: (c, w) => (
    <Path
      d="M12 4 L20 8 L12 12 L4 8 Z M4 12 L12 16 L20 12 M4 16 L12 20 L20 16"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  plus: (c, w) => (
    <Path d="M12 5 V19 M5 12 H19" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ),
  minus: (c, w) => <Path d="M5 12 H19" stroke={c} strokeWidth={w} strokeLinecap="round" />,
  check: (c, w) => (
    <Path
      d="M5 12 L10 17 L19 7"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  close: (c, w) => (
    <Path d="M6 6 L18 18 M18 6 L6 18" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ),
  eye: (c, w) => (
    <G>
      <Path
        d="M2 12 s3.5 -7 10 -7 10 7 10 7 -3.5 7 -10 7 -10 -7 -10 -7z"
        stroke={c}
        strokeWidth={w}
        fill="none"
      />
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  lock: (c, w) => (
    <G>
      <Rect x="5" y="10" width="14" height="10" rx="2.5" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M8 10 V7 a4 4 0 0 1 8 0 V10" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  mail: (c, w) => (
    <G>
      <Rect x="3" y="5" width="18" height="14" rx="3" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M4 7 L12 13 L20 7" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  user: (c, w) => (
    <G>
      <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M5 20 a7 7 0 0 1 14 0" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  home: (c, w) => (
    <Path
      d="M4 11 L12 4 L20 11 V20 H4 Z"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinejoin="round"
    />
  ),
  explore: (c, w) => (
    <G>
      <Circle cx="12" cy="12" r="8" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M15 9 L13 13 L9 15 L11 11 Z" fill={c} />
    </G>
  ),
  menu: (c, w) => (
    <Path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ),
  grid: (c, w) => (
    <G>
      <Rect x="4" y="4" width="7" height="7" rx="2" stroke={c} strokeWidth={w} fill="none" />
      <Rect x="13" y="4" width="7" height="7" rx="2" stroke={c} strokeWidth={w} fill="none" />
      <Rect x="4" y="13" width="7" height="7" rx="2" stroke={c} strokeWidth={w} fill="none" />
      <Rect x="13" y="13" width="7" height="7" rx="2" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  search: (c, w) => (
    <G>
      <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M21 21 L16.6 16.6" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  settings: (c, w) => (
    <G>
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={w} fill="none" />
      <Path
        d="M19.4 15 a1.7 1.7 0 0 0 .3 1.9 l.1 .1 a2 2 0 1 1 -2.8 2.8 l-.1 -.1 a1.7 1.7 0 0 0 -1.9 -.3 1.7 1.7 0 0 0 -1 1.5 V21 a2 2 0 1 1 -4 0 v-.1 a1.7 1.7 0 0 0 -1 -1.5 1.7 1.7 0 0 0 -1.9 .3 l-.1 .1 a2 2 0 1 1 -2.8 -2.8 l.1 -.1 a1.7 1.7 0 0 0 .3 -1.9 1.7 1.7 0 0 0 -1.5 -1 H3 a2 2 0 1 1 0 -4 h.1 a1.7 1.7 0 0 0 1.5 -1 1.7 1.7 0 0 0 -.3 -1.9 l-.1 -.1 a2 2 0 1 1 2.8 -2.8 l.1 .1 a1.7 1.7 0 0 0 1.9 .3 H9 a1.7 1.7 0 0 0 1 -1.5 V3 a2 2 0 1 1 4 0 v.1 a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9 -.3 l.1 -.1 a2 2 0 1 1 2.8 2.8 l-.1 .1 a1.7 1.7 0 0 0 -.3 1.9 V9 a1.7 1.7 0 0 0 1.5 1 H21 a2 2 0 1 1 0 4 h-.1 a1.7 1.7 0 0 0 -1.5 1z"
        stroke={c}
        strokeWidth={w * 0.8}
        fill="none"
      />
    </G>
  ),
  bell: (c, w) => (
    <Path
      d="M4 8 a5 5 0 0 1 5 -5 h6 a5 5 0 0 1 5 5 v3 a5 5 0 0 1 -5 5 h-3 l-4 3 v-3 h-1 a5 5 0 0 1 -5 -5z"
      stroke={c}
      strokeWidth={w}
      fill="none"
    />
  ),
  share: (c, w) => (
    <G>
      <Circle cx="18" cy="5" r="2.4" stroke={c} strokeWidth={w} fill="none" />
      <Circle cx="6" cy="12" r="2.4" stroke={c} strokeWidth={w} fill="none" />
      <Circle cx="18" cy="19" r="2.4" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M8.2 10.8 L15.8 6.2 M8.2 13.2 L15.8 17.8" stroke={c} strokeWidth={w} />
    </G>
  ),
  star: (c, w) => (
    <Path d="M5 4 L19 12 L5 20 Z" stroke={c} strokeWidth={w} fill="none" />
  ),
  shield: (c, w) => (
    <Path
      d="M12 3 L20 6 V11 c0 5 -3.5 8.5 -8 9 c-4.5 -.5 -8 -4 -8 -9 V6 Z"
      stroke={c}
      strokeWidth={w}
      fill="none"
    />
  ),
  file: (c, w) => (
    <G>
      <Path d="M6 3 H14 L19 8 V21 H6 Z" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M14 3 V8 H19" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  help: (c, w) => (
    <G>
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={w} fill="none" />
      <Path
        d="M12 17 V17.01 M12 13.5 a2.2 2.2 0 1 0 -2.2 -2.2"
        stroke={c}
        strokeWidth={w}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  ),
  globe: (c, w) => (
    <Path
      d="M5 8 H19 M5 8 a3 3 0 0 1 3 -3 h8 a3 3 0 0 1 3 3 M5 8 v10 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2 -2 V8"
      stroke={c}
      strokeWidth={w}
      fill="none"
    />
  ),
  trash: (c, w) => (
    <Path
      d="M4 7 H20 M9 7 V4 h6 v3 M6 7 l1 14 h10 l1 -14"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  upload: (c, w) => (
    <Path
      d="M12 16 V5 M7 10 L12 5 L17 10 M5 18 H19"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  download: (c, w) => (
    <Path
      d="M12 5 V16 M7 11 L12 16 L17 11 M5 18 H19"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  undo: (c, w) => (
    <Path
      d="M9 14 L4 9 L9 4 M4 9 H14 a6 6 0 0 1 0 12 H11"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  redo: (c, w) => (
    <Path
      d="M15 4 L20 9 L15 14 M20 9 H10 a6 6 0 0 0 0 12 H13"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  cube: (c, w) => (
    <G>
      <Path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M3 7 L12 12 L21 7 M12 12 V22" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  sun: (c, w) => (
    <G>
      <Circle cx="12" cy="12" r="5" stroke={c} strokeWidth={w} fill="none" />
      <Path
        d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M5 5 L6.5 6.5 M17.5 17.5 L19 19 M19 5 L17.5 6.5 M6.5 17.5 L5 19"
        stroke={c}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </G>
  ),
  moon: (c, w) => (
    <Path
      d="M20 14 a8 8 0 0 1 -10 -10 a8 8 0 1 0 10 10z"
      stroke={c}
      strokeWidth={w}
      fill="none"
    />
  ),
  play: (c) => <Path d="M8 5 L19 12 L8 19 Z" fill={c} />,
  rotate: (c, w) => (
    <G>
      <Path d="M12 2 A10 10 0 1 1 4.9 5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path
        d="M2 3 L5 6 L8 3"
        stroke={c}
        strokeWidth={w}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  ),
  walk: (c, w) => (
    <G>
      <Circle cx="12" cy="5" r="2.4" fill={c} />
      <Path
        d="M9 21 L10.5 13 L8 10 L10 5 L14 5 L16.5 9 L15 13 L16 21"
        stroke={c}
        strokeWidth={w}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  ),
  warning: (c, w) => (
    <G>
      <Path d="M12 2 L22 20 H2 Z" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M12 9 V13.5 M12 16.5 V16.6" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  'wifi-off': (c, w) => (
    <Path
      d="M3 3 L21 21 M8.3 8.3 a11 11 0 0 1 13.4 1.4 M2.3 9.7 a11 11 0 0 1 3.2 -3.1 M5.3 12.6 a7 7 0 0 1 4.4 -2.4 M12 17.5 a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0 -3.2z"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
    />
  ),
  pencil: (c, w) => (
    <Path d="M4 20 L20 4" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ),
  square: (c, w) => (
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke={c} strokeWidth={w} fill="none" />
  ),
  polygon: (c, w) => (
    <G>
      <Path
        d="M4 8 L10 3 L20 7 L18 17 L8 20 L3 13 Z"
        stroke={c}
        strokeWidth={w}
        fill="none"
        strokeLinejoin="round"
      />
      <Circle cx="10" cy="3" r="1.7" fill={c} />
      <Circle cx="20" cy="7" r="1.7" fill={c} />
      <Circle cx="8" cy="20" r="1.7" fill={c} />
    </G>
  ),
  door: (c, w) => (
    <Path d="M4 12 H20 M4 12 V17 M20 12 V17" stroke={c} strokeWidth={w} fill="none" />
  ),
  window: (c, w) => (
    <G>
      <Rect x="8" y="4" width="8" height="16" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M4 12 H8 M16 12 H20" stroke={c} strokeWidth={w} />
    </G>
  ),
  ruler: (c, w) => (
    <Path d="M3 10 L21 10 M3 14 L21 14 M7 6 V18 M17 6 V18" stroke={c} strokeWidth={w} fill="none" />
  ),
  image: (c, w) => (
    <G>
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth={w} fill="none" />
      <Circle cx="8.5" cy="8.5" r="1.6" fill={c} />
      <Path d="M21 15 L15 9 L5 21" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  duplicate: (c, w) => (
    <G>
      <Rect x="8" y="8" width="12" height="12" rx="2" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M4 16 V6 a2 2 0 0 1 2 -2 H16" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  wall: (c, w) => (
    <G>
      <Rect x="3" y="6" width="18" height="12" rx="1" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M3 12 H21 M9 6 V12 M15 12 V18" stroke={c} strokeWidth={w} />
    </G>
  ),
  magnet: (c, w) => (
    <G>
      <Path d="M6 3 v8 a6 6 0 0 0 12 0 V3" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d="M6 3 H10 V11 a2 2 0 0 0 4 0 V3 H18" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M6 20 H10 M14 20 H18" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  palette: (c, w) => (
    <G>
      <Path
        d="M12 3 a9 9 0 1 0 0 18 c1.5 0 2 -1 2 -2 0 -1.5 1 -2 2.5 -2 H18 a3 3 0 0 0 3 -3 c0 -5 -4 -9 -9 -9z"
        stroke={c}
        strokeWidth={w}
        fill="none"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="11" r="1.3" fill={c} />
      <Circle cx="12" cy="8" r="1.3" fill={c} />
      <Circle cx="16" cy="10" r="1.3" fill={c} />
    </G>
  ),
  move: (c, w) => (
    <Path
      d="M12 3 V21 M3 12 H21 M9 6 L12 3 L15 6 M9 18 L12 21 L15 18 M6 9 L3 12 L6 15 M18 9 L21 12 L18 15"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  expand: (c, w) => (
    <Path
      d="M4 10 V4 H10 M20 14 V20 H14 M4 4 L10 10 M20 20 L14 14"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  store: (c, w) => (
    <G>
      <Path d="M4 9 L5.5 4 H18.5 L20 9 Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M5 9 v11 h14 V9" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M10 20 v-5 h4 v5" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
    </G>
  ),
  cart: (c, w) => (
    <G>
      <Path d="M3 4 H5 L7 15 H18 L20 7 H6" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="19" r="1.6" fill={c} />
      <Circle cx="17" cy="19" r="1.6" fill={c} />
    </G>
  ),
  hanger: (c, w) => (
    <G>
      <Path d="M12 5 a2 2 0 1 1 2 2 c-1.2 0 -2 .8 -2 2" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d="M12 9 L3 16 a1.2 1.2 0 0 0 .8 2 H20.2 a1.2 1.2 0 0 0 .8 -2 Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
    </G>
  ),
  coffee: (c, w) => (
    <G>
      <Path d="M5 9 H17 V15 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M17 10 h2.5 a2 2 0 0 1 0 5 H17" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M8 3 v2 M12 3 v2" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  scissors: (c, w) => (
    <G>
      <Circle cx="7" cy="7" r="2.6" stroke={c} strokeWidth={w} fill="none" />
      <Circle cx="7" cy="17" r="2.6" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M9 8.5 L20 17 M9 15.5 L20 7 M9 8.5 L14 12 L9 15.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  // ---- Category / construction icons ---------------------------------
  building: (c, w) => (
    <G>
      <Rect x="5" y="3" width="14" height="18" rx="1.5" stroke={c} strokeWidth={w} fill="none" />
      <Path
        d="M9 7 H10 M14 7 H15 M9 11 H10 M14 11 H15 M9 15 H10 M14 15 H15 M11 21 V17 H13 V21"
        stroke={c}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </G>
  ),
  briefcase: (c, w) => (
    <G>
      <Rect x="3" y="7" width="18" height="13" rx="2.5" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M8 7 V5 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 V7 M3 12.5 H21" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  health: (c, w) => (
    <G>
      <Rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M12 8 V16 M8 12 H16" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  school: (c, w) => (
    <G>
      <Path d="M2 9 L12 4 L22 9 L12 14 Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M7 11 V16 c0 1.5 2.5 3 5 3 s5 -1.5 5 -3 V11 M22 9 V14" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
    </G>
  ),
  parking: (c, w) => (
    <G>
      <Rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke={c} strokeWidth={w} fill="none" />
      <Path d="M9 17 V7 h4 a3 3 0 0 1 0 6 H9" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  tree: (c, w) => (
    <G>
      <Path d="M12 3 a5 5 0 0 0 -4 8 a4.5 4.5 0 0 0 3 7 h2 a4.5 4.5 0 0 0 3 -7 a5 5 0 0 0 -4 -8z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M12 12 V21" stroke={c} strokeWidth={w} strokeLinecap="round" />
    </G>
  ),
  plaza: (c, w) => (
    <G>
      <Path d="M4 9 L5.5 4 H18.5 L20 9 Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M4 9 v11 h16 V9 M9 20 v-6 h6 v6 M8 9 v2 M12 9 v2 M16 9 v2" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
    </G>
  ),
  car: (c, w) => (
    <G>
      <Path d="M4 16 v-3 l2 -5 a2 2 0 0 1 1.9 -1.3 h8.2 A2 2 0 0 1 18 8 l2 5 v3" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
      <Path d="M3 16 H21 M6 13 H18" stroke={c} strokeWidth={w} strokeLinecap="round" />
      <Circle cx="8" cy="17.5" r="1.6" stroke={c} strokeWidth={w} fill="none" />
      <Circle cx="16" cy="17.5" r="1.6" stroke={c} strokeWidth={w} fill="none" />
    </G>
  ),
  logout: (c, w) => (
    <Path
      d="M15 4 H6 a2 2 0 0 0 -2 2 V18 a2 2 0 0 0 2 2 H15 M10 12 H21 M18 9 L21 12 L18 15"
      stroke={c}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  google: () => (
    <G>
      <Path
        fill="#4285F4"
        d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7C21.7 18.7 23 15.8 23 12.3z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H1.8v2.9C3.7 21.3 7.6 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.6 14.7c-.2-.7-.4-1.4-.4-2.7s.2-2 .4-2.7V6.4H1.8C1.3 8 1 9.7 1 12s.3 4 .8 5.6l3.8-2.9z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.7 1.8 6.4l3.8 2.9C6.5 6.8 9 4.8 12 4.8z"
      />
    </G>
  ),
  apple: (c) => (
    <Path
      fill={c}
      d="M17.05 12.9c-.03-2.7 2.2-4 2.3-4.06-1.25-1.83-3.2-2.08-3.9-2.11-1.66-.17-3.24.98-4.08.98-.84 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.08 1.35 10.72.9 1.3 1.97 2.75 3.38 2.7 1.36-.05 1.87-.87 3.51-.87 1.64 0 2.1.87 3.53.84 1.46-.02 2.38-1.32 3.27-2.62 1.03-1.5 1.46-2.96 1.48-3.03-.03-.02-2.84-1.09-2.87-4.32zM14.4 5.2c.74-.9 1.24-2.15 1.1-3.4-1.07.04-2.36.71-3.13 1.61-.69.8-1.29 2.07-1.13 3.29 1.19.09 2.42-.6 3.16-1.5z"
    />
  ),
};

export default function Icon({ name, size = 24, color = '#1B1A17', strokeWidth = 1.8, style }) {
  const render = ICONS[name];
  if (!render) {
    return null;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {render(color, strokeWidth)}
    </Svg>
  );
}
