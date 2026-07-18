import Svg, { Rect, Ellipse, Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

// Simple 2D glyphs standing in for catalog product photos, tinted by theme.
// Each glyph draws inside its own viewBox; `size` sets the width.
export default function FurnitureGlyph({ kind = 'sofa', size = 80, color }) {
  const { colors, isDark } = useTheme();
  const c = color || colors.accent;
  const wood = isDark ? '#6E5240' : '#8A6250';
  const steel = isDark ? '#9AA0A6' : '#AEB4BB';
  const steelDk = isDark ? '#6A6F75' : '#8B9096';
  const glass = isDark ? '#39454F' : '#CBD6DE';
  const soft = colors.accentSoft;
  const press = colors.accentPress;
  const green = colors.success;
  const shellDk = isDark ? '#4A4034' : '#7C6A55';

  const glyphs = {
    // ---- Structure shells ----------------------------------------------
    roomSquare: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Rect x="8" y="8" width="44" height="36" rx="2" fill={c} opacity={0.5} />
        <Rect x="8" y="8" width="44" height="36" rx="2" fill="none" stroke={shellDk} strokeWidth={3} />
      </Svg>
    ),
    roomL: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Path d="M8 8 H37 V26 H52 V44 H8 Z" fill={c} opacity={0.5} />
        <Path d="M8 8 H37 V26 H52 V44 H8 Z" fill="none" stroke={shellDk} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    ),
    roomU: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Path d="M8 8 H21 V33 H39 V8 H52 V44 H8 Z" fill={c} opacity={0.5} />
        <Path d="M8 8 H21 V33 H39 V8 H52 V44 H8 Z" fill="none" stroke={shellDk} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    ),
    roomT: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Path d="M8 8 H52 V22 H37 V44 H23 V22 H8 Z" fill={c} opacity={0.5} />
        <Path d="M8 8 H52 V22 H37 V44 H23 V22 H8 Z" fill="none" stroke={shellDk} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    ),
    stairsStraight: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 44 60">
        <Rect x="10" y="6" width="24" height="48" rx="2" fill={c} opacity={0.45} />
        <Rect x="10" y="6" width="24" height="48" rx="2" fill="none" stroke={shellDk} strokeWidth={2.5} />
        <Path d="M10 14 H34 M10 22 H34 M10 30 H34 M10 38 H34 M10 46 H34" stroke={shellDk} strokeWidth={2} />
      </Svg>
    ),
    stairsL: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Path d="M8 8 H30 V30 H48 V48 H8 Z" fill={c} opacity={0.45} />
        <Path d="M8 8 H30 V30 H48 V48 H8 Z" fill="none" stroke={shellDk} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M14 8 V30 M20 8 V30 M26 8 V30 M30 36 H48 M30 42 H48" stroke={shellDk} strokeWidth={1.8} />
      </Svg>
    ),
    stairsSpiral: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Circle cx="28" cy="28" r="20" fill={c} opacity={0.4} />
        <Circle cx="28" cy="28" r="20" fill="none" stroke={shellDk} strokeWidth={2.5} />
        <Path d="M28 28 L28 8 M28 28 L45 18 M28 28 L48 28 M28 28 L45 38 M28 28 L28 48 M28 28 L11 38" stroke={shellDk} strokeWidth={1.8} />
      </Svg>
    ),
    landing: (
      <Svg width={size} height={size * 0.8} viewBox="0 0 60 48">
        <Rect x="12" y="10" width="36" height="28" rx="2" fill={c} opacity={0.5} />
        <Rect x="12" y="10" width="36" height="28" rx="2" fill="none" stroke={shellDk} strokeWidth={2.5} />
      </Svg>
    ),
    ramp: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 44 60">
        <Rect x="12" y="6" width="20" height="48" rx="2" fill={c} opacity={0.45} />
        <Rect x="12" y="6" width="20" height="48" rx="2" fill="none" stroke={shellDk} strokeWidth={2.5} />
        <Path d="M22 46 V14 M15 22 L22 14 L29 22" fill="none" stroke={shellDk} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    ),
    column: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Circle cx="28" cy="28" r="14" fill={c} />
        <Circle cx="28" cy="28" r="14" fill="none" stroke={shellDk} strokeWidth={3} />
      </Svg>
    ),
    wallSegment: (
      <Svg width={size} height={size * 0.4} viewBox="0 0 80 32">
        <Rect x="6" y="12" width="68" height="8" rx="2" fill={shellDk} />
      </Svg>
    ),
    archOpening: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Path d="M12 46 V26 A16 16 0 0 1 44 26 V46" fill="none" stroke={shellDk} strokeWidth={3} />
        <Path d="M12 46 V26 A16 16 0 0 1 44 26 V46" fill={c} opacity={0.35} />
      </Svg>
    ),

    // ---- Doors & windows -----------------------------------------------
    doorSingle: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Path d="M14 46 A32 32 0 0 1 46 14" fill="none" stroke={shellDk} strokeWidth={2} opacity={0.55} />
        <Line x1="14" y1="46" x2="14" y2="14" stroke={c} strokeWidth={4} />
        <Rect x="12" y="46" width="34" height="4" rx="1" fill={shellDk} />
      </Svg>
    ),
    doorDouble: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Path d="M10 44 A18 18 0 0 1 28 26" fill="none" stroke={shellDk} strokeWidth={1.8} opacity={0.55} />
        <Path d="M46 44 A18 18 0 0 0 28 26" fill="none" stroke={shellDk} strokeWidth={1.8} opacity={0.55} />
        <Line x1="10" y1="44" x2="10" y2="26" stroke={c} strokeWidth={4} />
        <Line x1="46" y1="44" x2="46" y2="26" stroke={c} strokeWidth={4} />
        <Rect x="8" y="44" width="40" height="4" rx="1" fill={shellDk} />
      </Svg>
    ),
    doorMainGate: (
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Rect x="8" y="14" width="40" height="32" rx="2" fill={c} opacity={0.4} />
        <Rect x="8" y="14" width="40" height="32" rx="2" fill="none" stroke={shellDk} strokeWidth={3} />
        <Path d="M18 14 V46 M28 14 V46 M38 14 V46" stroke={shellDk} strokeWidth={2} />
      </Svg>
    ),
    doorSliding: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 72 44">
        <Rect x="6" y="14" width="60" height="16" rx="2" fill="none" stroke={shellDk} strokeWidth={2} />
        <Rect x="8" y="17" width="28" height="10" fill={c} opacity={0.7} />
        <Rect x="36" y="17" width="28" height="10" fill={c} opacity={0.4} />
        <Path d="M40 10 H52 M46 6 L52 10 L46 14" fill="none" stroke={shellDk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    windowFixed: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Rect x="10" y="8" width="40" height="36" rx="2" fill={glass} opacity={0.6} />
        <Rect x="10" y="8" width="40" height="36" rx="2" fill="none" stroke={shellDk} strokeWidth={3} />
        <Line x1="30" y1="8" x2="30" y2="44" stroke={shellDk} strokeWidth={1.8} />
        <Line x1="10" y1="26" x2="50" y2="26" stroke={shellDk} strokeWidth={1.8} />
      </Svg>
    ),
    windowSliding: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 60 52">
        <Rect x="10" y="8" width="40" height="36" rx="2" fill={glass} opacity={0.6} />
        <Rect x="10" y="8" width="40" height="36" rx="2" fill="none" stroke={shellDk} strokeWidth={3} />
        <Line x1="30" y1="8" x2="30" y2="44" stroke={shellDk} strokeWidth={2.4} />
      </Svg>
    ),
    windowBay: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 68 48">
        <Path d="M10 12 H58 L48 40 H20 Z" fill={glass} opacity={0.55} />
        <Path d="M10 12 H58 L48 40 H20 Z" fill="none" stroke={shellDk} strokeWidth={3} strokeLinejoin="round" />
        <Line x1="20" y1="40" x2="14" y2="12" stroke={shellDk} strokeWidth={1.6} />
        <Line x1="48" y1="40" x2="54" y2="12" stroke={shellDk} strokeWidth={1.6} />
      </Svg>
    ),

    // ---- Seating --------------------------------------------------------
    sofa: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 50">
        <Rect x="6" y="18" width="68" height="24" rx="8" fill={c} />
        <Rect x="2" y="24" width="12" height="22" rx="5" fill={press} />
        <Rect x="66" y="24" width="12" height="22" rx="5" fill={press} />
      </Svg>
    ),
    sectional: (
      <Svg width={size} height={size * 0.72} viewBox="0 0 80 58">
        <Rect x="6" y="14" width="40" height="24" rx="7" fill={c} />
        <Rect x="6" y="34" width="68" height="20" rx="7" fill={c} />
        <Rect x="2" y="18" width="10" height="34" rx="4" fill={press} />
        <Rect x="66" y="38" width="10" height="16" rx="4" fill={press} />
      </Svg>
    ),
    chair: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 56 60">
        <Rect x="14" y="8" width="28" height="26" rx="6" fill={c} />
        <Rect x="14" y="34" width="28" height="10" rx="3" fill={press} />
        <Rect x="16" y="44" width="4" height="12" fill={wood} />
        <Rect x="36" y="44" width="4" height="12" fill={wood} />
      </Svg>
    ),
    stool: (
      <Svg width={size * 0.7} height={size * 0.8} viewBox="0 0 56 50">
        <Ellipse cx="28" cy="16" rx="18" ry="7" fill={c} />
        <Rect x="16" y="16" width="4" height="28" fill={steelDk} />
        <Rect x="36" y="16" width="4" height="28" fill={steelDk} />
        <Rect x="24" y="30" width="8" height="3" fill={steel} />
      </Svg>
    ),
    bench: (
      <Svg width={size} height={size * 0.55} viewBox="0 0 80 44">
        <Rect x="6" y="16" width="68" height="10" rx="4" fill={c} />
        <Rect x="10" y="26" width="5" height="14" fill={wood} />
        <Rect x="65" y="26" width="5" height="14" fill={wood} />
      </Svg>
    ),

    // ---- Tables ---------------------------------------------------------
    table: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 76 46">
        <Rect x="8" y="10" width="60" height="8" rx="3" fill={wood} />
        <Rect x="12" y="18" width="6" height="24" fill={wood} />
        <Rect x="58" y="18" width="6" height="24" fill={wood} />
      </Svg>
    ),
    roundTable: (
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 60 60">
        <Circle cx="30" cy="24" r="20" fill={wood} />
        <Circle cx="30" cy="24" r="20" fill="#000" opacity={0.06} />
        <Rect x="27" y="38" width="6" height="16" fill={wood} />
      </Svg>
    ),
    nightstand: (
      <Svg width={size * 0.7} height={size * 0.75} viewBox="0 0 56 48">
        <Rect x="10" y="8" width="36" height="32" rx="4" fill={wood} />
        <Line x1="10" y1="24" x2="46" y2="24" stroke={soft} strokeWidth={2} />
        <Circle cx="28" cy="16" r="1.8" fill={soft} />
        <Circle cx="28" cy="32" r="1.8" fill={soft} />
      </Svg>
    ),
    desk: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 48">
        <Rect x="6" y="12" width="68" height="8" rx="2" fill={wood} />
        <Rect x="48" y="20" width="22" height="22" rx="3" fill={wood} />
        <Line x1="48" y1="31" x2="70" y2="31" stroke={soft} strokeWidth={2} />
        <Rect x="12" y="20" width="5" height="22" fill={wood} />
      </Svg>
    ),

    // ---- Bedroom --------------------------------------------------------
    bed: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="6" y="24" width="68" height="20" rx="5" fill={c} />
        <Rect x="10" y="14" width="26" height="14" rx="4" fill={soft} />
        <Circle cx="70" cy="20" r="6" fill={soft} />
      </Svg>
    ),

    // ---- Storage --------------------------------------------------------
    bookshelf: (
      <Svg width={size * 0.75} height={size} viewBox="0 0 60 60">
        <Rect x="10" y="4" width="40" height="52" rx="3" fill={wood} />
        <Line x1="10" y1="20" x2="50" y2="20" stroke={soft} strokeWidth={2} />
        <Line x1="10" y1="34" x2="50" y2="34" stroke={soft} strokeWidth={2} />
        <Line x1="10" y1="48" x2="50" y2="48" stroke={soft} strokeWidth={2} />
        <Rect x="14" y="8" width="4" height="10" fill={c} />
        <Rect x="20" y="8" width="4" height="10" fill={press} />
      </Svg>
    ),
    wardrobe: (
      <Svg width={size * 0.72} height={size} viewBox="0 0 58 60">
        <Rect x="10" y="4" width="38" height="52" rx="3" fill={wood} />
        <Line x1="29" y1="6" x2="29" y2="54" stroke={soft} strokeWidth={2} />
        <Circle cx="25" cy="30" r="1.8" fill={soft} />
        <Circle cx="33" cy="30" r="1.8" fill={soft} />
      </Svg>
    ),
    dresser: (
      <Svg width={size} height={size * 0.65} viewBox="0 0 80 52">
        <Rect x="10" y="8" width="60" height="36" rx="3" fill={wood} />
        <Line x1="40" y1="10" x2="40" y2="42" stroke={soft} strokeWidth={1.6} />
        <Line x1="10" y1="26" x2="70" y2="26" stroke={soft} strokeWidth={1.6} />
        <Circle cx="25" cy="18" r="1.6" fill={soft} />
        <Circle cx="55" cy="18" r="1.6" fill={soft} />
      </Svg>
    ),
    tvStand: (
      <Svg width={size} height={size * 0.5} viewBox="0 0 80 40">
        <Rect x="8" y="14" width="64" height="18" rx="3" fill={wood} />
        <Line x1="40" y1="16" x2="40" y2="30" stroke={soft} strokeWidth={1.6} />
        <Rect x="30" y="4" width="20" height="4" rx="2" fill={steelDk} />
      </Svg>
    ),
    cabinet: (
      <Svg width={size * 0.8} height={size} viewBox="0 0 64 60">
        <Rect x="10" y="6" width="44" height="48" rx="3" fill={wood} />
        <Line x1="32" y1="8" x2="32" y2="52" stroke={soft} strokeWidth={2} />
        <Circle cx="28" cy="30" r="1.8" fill={soft} />
        <Circle cx="36" cy="30" r="1.8" fill={soft} />
      </Svg>
    ),

    // ---- Kitchen / appliances ------------------------------------------
    island: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="8" y="12" width="64" height="34" rx="4" fill={c} />
        <Rect x="8" y="12" width="64" height="8" rx="4" fill={steel} />
        <Circle cx="24" cy="33" r="4" fill={glass} />
      </Svg>
    ),
    counter: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 48">
        <Rect x="6" y="14" width="68" height="10" rx="3" fill={steel} />
        <Rect x="6" y="24" width="68" height="18" rx="2" fill={wood} />
        <Line x1="40" y1="24" x2="40" y2="42" stroke={soft} strokeWidth={1.4} />
      </Svg>
    ),
    stove: (
      <Svg width={size * 0.85} height={size} viewBox="0 0 68 60">
        <Rect x="10" y="6" width="48" height="48" rx="4" fill={steelDk} />
        <Rect x="14" y="24" width="40" height="26" rx="3" fill={glass} />
        <Circle cx="22" cy="15" r="3" fill={c} />
        <Circle cx="34" cy="15" r="3" fill={steel} />
        <Circle cx="46" cy="15" r="3" fill={steel} />
      </Svg>
    ),
    fridge: (
      <Svg width={size * 0.75} height={size} viewBox="0 0 58 60">
        <Rect x="12" y="4" width="34" height="52" rx="4" fill={steel} />
        <Line x1="12" y1="24" x2="46" y2="24" stroke={steelDk} strokeWidth={2} />
        <Rect x="40" y="12" width="3" height="8" rx="1.5" fill={steelDk} />
        <Rect x="40" y="30" width="3" height="10" rx="1.5" fill={steelDk} />
      </Svg>
    ),
    sink: (
      <Svg width={size * 0.85} height={size * 0.7} viewBox="0 0 68 52">
        <Rect x="8" y="14" width="52" height="30" rx="4" fill={steel} />
        <Ellipse cx="34" cy="30" rx="16" ry="9" fill={glass} />
        <Path d="M34 14 q0 -8 8 -8" stroke={steelDk} strokeWidth={2.4} fill="none" />
      </Svg>
    ),

    // ---- Bath -----------------------------------------------------------
    bathtub: (
      <Svg width={size} height={size * 0.55} viewBox="0 0 80 44">
        <Rect x="8" y="12" width="64" height="24" rx="12" fill={steel} />
        <Rect x="14" y="16" width="52" height="16" rx="8" fill={glass} />
        <Circle cx="18" cy="20" r="1.8" fill={steelDk} />
      </Svg>
    ),
    shower: (
      <Svg width={size * 0.8} height={size} viewBox="0 0 64 60">
        <Rect x="10" y="6" width="44" height="48" rx="4" fill={glass} opacity={0.7} />
        <Rect x="10" y="6" width="44" height="48" rx="4" fill="none" stroke={steelDk} strokeWidth={2} />
        <Circle cx="20" cy="16" r="4" fill={steel} />
        <Line x1="20" y1="20" x2="20" y2="30" stroke={steel} strokeWidth={1.6} strokeDasharray="2 3" />
      </Svg>
    ),
    toilet: (
      <Svg width={size * 0.6} height={size} viewBox="0 0 48 60">
        <Rect x="14" y="6" width="20" height="16" rx="3" fill={steel} />
        <Ellipse cx="24" cy="38" rx="15" ry="16" fill={steel} />
        <Ellipse cx="24" cy="38" rx="9" ry="10" fill={glass} />
      </Svg>
    ),

    // ---- Lighting -------------------------------------------------------
    lamp: (
      <Svg width={size * 0.85} height={size} viewBox="0 0 70 60">
        <Ellipse cx="35" cy="46" rx="30" ry="7" fill={wood} opacity={0.5} />
        <Rect x="30" y="8" width="10" height="38" rx="3" fill={wood} />
        <Ellipse cx="35" cy="8" rx="24" ry="8" fill={c} />
      </Svg>
    ),
    pendant: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 56 60">
        <Line x1="28" y1="2" x2="28" y2="24" stroke={steelDk} strokeWidth={2} />
        <Path d="M12 40 L28 24 L44 40 Z" fill={c} />
        <Ellipse cx="28" cy="40" rx="16" ry="4" fill={press} />
      </Svg>
    ),

    // ---- Decor ----------------------------------------------------------
    plant: (
      <Svg width={size * 0.6} height={size} viewBox="0 0 46 60">
        <Circle cx="23" cy="20" r="16" fill={green} />
        <Circle cx="14" cy="26" r="9" fill={green} opacity={0.85} />
        <Circle cx="32" cy="26" r="9" fill={green} opacity={0.85} />
        <Path d="M14 38 H32 L29 54 H17 Z" fill={press} />
      </Svg>
    ),
    planter: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 48">
        <Path d="M12 22 H68 L62 44 H18 Z" fill={press} />
        <Circle cx="30" cy="16" r="9" fill={green} />
        <Circle cx="48" cy="14" r="10" fill={green} />
      </Svg>
    ),
    rug: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="8" y="10" width="64" height="36" rx="4" fill={c} />
        <Rect x="14" y="16" width="52" height="24" rx="2" fill="none" stroke={soft} strokeWidth={2} />
        <Rect x="22" y="22" width="36" height="12" fill={press} opacity={0.5} />
      </Svg>
    ),
    mirror: (
      <Svg width={size * 0.55} height={size} viewBox="0 0 44 60">
        <Rect x="10" y="4" width="24" height="52" rx="12" fill={steelDk} />
        <Rect x="13" y="7" width="18" height="46" rx="9" fill={glass} />
      </Svg>
    ),
    tv: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="8" y="8" width="64" height="36" rx="3" fill="#1B1A17" />
        <Rect x="11" y="11" width="58" height="30" rx="2" fill={glass} opacity={0.6} />
        <Rect x="34" y="44" width="12" height="4" fill={steelDk} />
      </Svg>
    ),

    // ---- Retail / Shop fixtures ----------------------------------------
    rack: (
      <Svg width={size} height={size} viewBox="0 0 70 60">
        <Line x1="10" y1="12" x2="60" y2="12" stroke={steelDk} strokeWidth={2.4} />
        <Rect x="9" y="12" width="2" height="42" fill={steel} />
        <Rect x="59" y="12" width="2" height="42" fill={steel} />
        <Path d="M20 14 v10 M28 14 v14 M36 14 v10 M44 14 v14 M52 14 v10" stroke={c} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    ),
    roundRack: (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="20" r="18" fill="none" stroke={steelDk} strokeWidth={2.4} />
        <Path d="M14 20 v8 M22 20 v10 M30 20 v11 M38 20 v10 M46 20 v8" stroke={c} strokeWidth={3.5} strokeLinecap="round" />
        <Rect x="28" y="20" width="4" height="34" fill={steel} />
      </Svg>
    ),
    wallShelf: (
      <Svg width={size} height={size * 0.55} viewBox="0 0 80 44">
        <Rect x="8" y="10" width="64" height="4" fill={steelDk} />
        <Path d="M18 14 v8 M30 14 v10 M42 14 v8 M54 14 v10 M66 14 v8" stroke={c} strokeWidth={3.5} strokeLinecap="round" />
      </Svg>
    ),
    gondola: (
      <Svg width={size * 0.85} height={size} viewBox="0 0 64 60">
        <Rect x="26" y="6" width="4" height="48" fill={steelDk} />
        <Rect x="8" y="14" width="48" height="4" fill={steel} />
        <Rect x="8" y="26" width="48" height="4" fill={steel} />
        <Rect x="8" y="38" width="48" height="4" fill={steel} />
        <Rect x="10" y="18" width="6" height="6" fill={c} />
        <Rect x="18" y="18" width="6" height="6" fill={press} />
        <Rect x="40" y="30" width="6" height="6" fill={c} />
        <Rect x="32" y="42" width="6" height="6" fill={press} />
      </Svg>
    ),
    shelfUnit: (
      <Svg width={size * 0.8} height={size} viewBox="0 0 60 60">
        <Rect x="10" y="4" width="40" height="52" rx="2" fill="none" stroke={steelDk} strokeWidth={2.5} />
        <Line x1="10" y1="18" x2="50" y2="18" stroke={steel} strokeWidth={2.5} />
        <Line x1="10" y1="32" x2="50" y2="32" stroke={steel} strokeWidth={2.5} />
        <Line x1="10" y1="46" x2="50" y2="46" stroke={steel} strokeWidth={2.5} />
        <Rect x="14" y="8" width="7" height="8" fill={c} />
        <Rect x="30" y="22" width="7" height="8" fill={press} />
      </Svg>
    ),
    displayTable: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="10" y="18" width="60" height="8" rx="2" fill={wood} />
        <Rect x="16" y="26" width="6" height="24" fill={wood} />
        <Rect x="58" y="26" width="6" height="24" fill={wood} />
        <Rect x="30" y="8" width="8" height="10" rx="2" fill={c} />
        <Rect x="44" y="6" width="8" height="12" rx="2" fill={press} />
      </Svg>
    ),
    displayCase: (
      <Svg width={size} height={size * 0.7} viewBox="0 0 80 56">
        <Rect x="10" y="10" width="60" height="24" rx="2" fill={glass} opacity={0.7} />
        <Rect x="10" y="10" width="60" height="24" rx="2" fill="none" stroke={steelDk} strokeWidth={2} />
        <Line x1="40" y1="10" x2="40" y2="34" stroke={steelDk} strokeWidth={1.5} />
        <Rect x="10" y="34" width="60" height="16" rx="2" fill={wood} />
      </Svg>
    ),
    checkout: (
      <Svg width={size} height={size * 0.75} viewBox="0 0 80 60">
        <Rect x="10" y="24" width="60" height="30" rx="3" fill={wood} />
        <Rect x="10" y="20" width="60" height="6" rx="2" fill={steel} />
        <Rect x="46" y="6" width="20" height="16" rx="2" fill={steelDk} />
        <Rect x="49" y="9" width="14" height="7" fill={glass} />
        <Circle cx="24" cy="40" r="4" fill={c} />
      </Svg>
    ),
    mannequin: (
      <Svg width={size * 0.55} height={size} viewBox="0 0 44 60">
        <Circle cx="22" cy="10" r="6" fill={steel} />
        <Path d="M22 16 L33 30 L28 44 L16 44 L11 30 Z" fill={steel} />
        <Rect x="20" y="44" width="4" height="10" fill={steelDk} />
        <Ellipse cx="22" cy="56" rx="10" ry="3" fill={steelDk} />
      </Svg>
    ),
    fittingRoom: (
      <Svg width={size} height={size * 0.85} viewBox="0 0 72 60">
        <Rect x="10" y="8" width="52" height="46" rx="3" fill="none" stroke={steelDk} strokeWidth={2.5} />
        <Line x1="36" y1="10" x2="36" y2="20" stroke={steel} strokeWidth={2} />
        <Path d="M36 20 q-10 4 -14 34" stroke={c} strokeWidth={3} fill="none" />
        <Path d="M36 20 q10 4 14 34" stroke={c} strokeWidth={3} fill="none" />
      </Svg>
    ),
    coolerUpright: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 56 60">
        <Rect x="10" y="4" width="36" height="52" rx="3" fill={glass} opacity={0.65} />
        <Rect x="10" y="4" width="36" height="52" rx="3" fill="none" stroke={steelDk} strokeWidth={2.5} />
        <Line x1="10" y1="20" x2="46" y2="20" stroke={steel} strokeWidth={2} />
        <Line x1="10" y1="34" x2="46" y2="34" stroke={steel} strokeWidth={2} />
        <Rect x="15" y="8" width="5" height="9" fill={c} />
        <Rect x="30" y="23" width="5" height="9" fill={press} />
      </Svg>
    ),
    freezer: (
      <Svg width={size} height={size * 0.6} viewBox="0 0 80 48">
        <Rect x="8" y="14" width="64" height="28" rx="3" fill={steel} />
        <Rect x="10" y="12" width="60" height="8" rx="3" fill={glass} opacity={0.7} />
        <Rect x="10" y="12" width="60" height="8" rx="3" fill="none" stroke={steelDk} strokeWidth={1.6} />
        <Line x1="40" y1="12" x2="40" y2="20" stroke={steelDk} strokeWidth={1.4} />
      </Svg>
    ),
    bin: (
      <Svg width={size} height={size * 0.65} viewBox="0 0 80 52">
        <Path d="M12 16 H68 L62 46 H18 Z" fill={wood} />
        <Rect x="16" y="10" width="48" height="8" rx="2" fill={press} />
        <Circle cx="30" cy="26" r="4" fill={c} />
        <Circle cx="44" cy="30" r="4" fill={green} />
        <Circle cx="52" cy="24" r="4" fill={c} />
      </Svg>
    ),
    basket: (
      <Svg width={size * 0.7} height={size} viewBox="0 0 56 60">
        <Path d="M12 22 H44 L40 52 H16 Z" fill={c} />
        <Path d="M18 22 q10 -14 20 0" stroke={press} strokeWidth={2.5} fill="none" />
        <Line x1="20" y1="30" x2="36" y2="30" stroke={soft} strokeWidth={1.5} />
        <Line x1="19" y1="40" x2="37" y2="40" stroke={soft} strokeWidth={1.5} />
      </Svg>
    ),
    sign: (
      <Svg width={size * 0.75} height={size} viewBox="0 0 60 60">
        <Rect x="12" y="6" width="36" height="26" rx="3" fill={c} />
        <Line x1="18" y1="14" x2="42" y2="14" stroke={soft} strokeWidth={2.5} />
        <Line x1="18" y1="20" x2="38" y2="20" stroke={soft} strokeWidth={2.5} />
        <Line x1="18" y1="26" x2="42" y2="26" stroke={soft} strokeWidth={2.5} />
        <Path d="M20 32 L18 54 M40 32 L42 54" stroke={steelDk} strokeWidth={2.5} />
      </Svg>
    ),

    // Heavy shipping crate / cargo box — used by premium storage & parking.
    crate: (
      <Svg width={size * 0.85} height={size * 0.8} viewBox="0 0 64 56">
        <Rect x="9" y="12" width="46" height="38" rx="2" fill={wood} />
        <Rect x="9" y="12" width="46" height="38" rx="2" fill="none" stroke={press} strokeWidth={2.6} />
        <Path d="M9 12 L55 50 M55 12 L9 50" stroke={press} strokeWidth={2.4} />
        <Rect x="9" y="12" width="46" height="9" fill={press} opacity={0.35} />
        <Rect x="9" y="41" width="46" height="9" fill={press} opacity={0.35} />
      </Svg>
    ),

    // ---- Outdoor / parking / landscape ---------------------------------
    car: (
      <Svg width={size} height={size * 0.5} viewBox="0 0 80 40">
        <Path d="M8 30 v-6 l6 -10 a4 4 0 0 1 3.4 -2 H54 a4 4 0 0 1 3.4 2 l6 10 v6 Z" fill={c} />
        <Path d="M18 14 L20 22 H60 L62 14 Z" fill={glass} opacity={0.8} />
        <Circle cx="22" cy="31" r="5" fill={steelDk} />
        <Circle cx="58" cy="31" r="5" fill={steelDk} />
      </Svg>
    ),
    tree: (
      <Svg width={size * 0.75} height={size} viewBox="0 0 60 60">
        <Circle cx="30" cy="24" r="18" fill={green} />
        <Circle cx="18" cy="30" r="11" fill={green} opacity={0.85} />
        <Circle cx="42" cy="30" r="11" fill={green} opacity={0.85} />
        <Rect x="26" y="38" width="8" height="18" rx="2" fill={press} />
      </Svg>
    ),
    lawn: (
      <Svg width={size} height={size * 0.65} viewBox="0 0 80 52">
        <Rect x="6" y="10" width="68" height="36" rx="4" fill={green} opacity={0.55} />
        <Path
          d="M14 40 v-8 M22 40 v-11 M30 40 v-8 M38 40 v-12 M46 40 v-8 M54 40 v-11 M62 40 v-8"
          stroke={green}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Svg>
    ),
  };

  return glyphs[kind] || glyphs.sofa;
}
