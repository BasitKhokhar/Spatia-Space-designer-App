import { View, Pressable } from 'react-native';
import Svg, { Rect, Circle, Defs, Pattern, Line } from 'react-native-svg';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import Stepper from '@/components/ui/Stepper';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { formatLength, formatArea, areaM2 } from '@/domain/units';
import { OptionCard, CounterRow, CustomEntry, CustomTag, StepSection } from './components/WizardControls';

// ---------------------------------------------------------------------------
// The individual wizard steps. Each is a plain component taking the brief store
// slice it needs — the shell, progress and navigation all live in
// AiWizardScreen, so these stay focused on the one question they ask.
//
// Every step offers a free-text alternative. That is deliberate and consistent:
// the fixed lists cover the common case quickly, and the text box means an
// unusual requirement is never a dead end.
// ---------------------------------------------------------------------------

// ── 1. What are we designing ───────────────────────────────────────────────
export function SpaceTypeStep({ spaceTypes, value, custom, onSelect, onCustom }) {
  return (
    <View style={{ gap: 10 }}>
      {spaceTypes.map((t) => (
        <OptionCard
          key={t.key}
          icon={t.icon}
          title={t.label}
          subtitle={t.blurb}
          selected={value === t.key}
          onPress={() => onSelect(t)}
          compact
        />
      ))}

      <StepSection title="Not listed?" hint="Describe it and we'll design for it.">
        {custom ? (
          <CustomTag label={custom} onRemove={() => onCustom('')} />
        ) : (
          <CustomEntry placeholder="e.g. a car showroom with a service bay" onSubmit={onCustom} />
        )}
      </StepSection>
    </View>
  );
}

// ── 2. The plot ────────────────────────────────────────────────────────────
export function PlotStep({ width, length, unit, onUnit, onWidth, onLength }) {
  const { colors, radius, isDark } = useTheme();
  const dotColor = isDark ? '#3A342C' : '#CBB39F';

  // Keep the preview proportional so a 30x10 plot actually looks long.
  const ratio = width / length;
  const boxW = ratio >= 1 ? 190 : 190 * ratio;
  const boxH = ratio >= 1 ? 190 / ratio : 190;

  return (
    <View>
      <View
        style={{
          height: 236,
          borderRadius: radius.xl,
          overflow: 'hidden',
          backgroundColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 342 236" style={{ position: 'absolute' }}>
          <Defs>
            <Pattern id="plotdots" width="20" height="20" patternUnits="userSpaceOnUse">
              <Circle cx="1.2" cy="1.2" r="1.2" fill={dotColor} />
            </Pattern>
          </Defs>
          <Rect width="342" height="236" fill="url(#plotdots)" />
          <Rect
            x={(342 - boxW) / 2}
            y={(236 - boxH) / 2}
            width={boxW}
            height={boxH}
            rx="4"
            fill={colors.accent}
            fillOpacity={isDark ? 0.08 : 0.12}
            stroke={colors.accent}
            strokeWidth={3}
          />
        </Svg>

        <View
          style={{
            position: 'absolute', bottom: 14, right: 14,
            backgroundColor: colors.accent, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10,
          }}
        >
          <Text variant="label" color="onAccent">
            {formatArea(areaM2(width, length), unit)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
        <Text variant="bodySm" color="ink2" style={{ fontWeight: '700' }}>
          Units
        </Text>
        <SegmentedControl
          options={[
            { value: 'meters', label: 'Meters' },
            { value: 'feet', label: 'Feet' },
          ]}
          value={unit}
          onChange={onUnit}
          style={{ width: 200 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
        <Stepper label="WIDTH" value={width} onChange={onWidth} step={0.5} min={2} max={200} />
        <Stepper label="LENGTH" value={length} onChange={onLength} step={0.5} min={2} max={200} />
      </View>

      <Text variant="bodySm" color="ink3" style={{ marginTop: 12 }}>
        {formatLength(width, unit)} × {formatLength(length, unit)} — the outer boundary of your plot.
      </Text>
    </View>
  );
}

// ── 3. Levels ──────────────────────────────────────────────────────────────
export function LevelsStep({ floorCount, hasBasement, hasRoof, maxFloors, onChange }) {
  const { colors, radius } = useTheme();

  const Toggle = ({ label, hint, icon, on, onPress }) => (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
        borderRadius: radius.lg, borderWidth: 1.5,
        borderColor: on ? colors.accent : colors.line,
        backgroundColor: on ? colors.accentTintBg : colors.surface,
      }}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: radius.md,
          backgroundColor: on ? colors.accent : colors.accentSoft,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={19} color={on ? '#fff' : colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSm">{label}</Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>{hint}</Text>
      </View>
      <View
        style={{
          width: 46, height: 28, borderRadius: 14, padding: 3,
          backgroundColor: on ? colors.accent : colors.line,
          alignItems: on ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
      </View>
    </Pressable>
  );

  const total = floorCount + (hasBasement ? 1 : 0) + (hasRoof ? 1 : 0);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Stepper
          label="FLOORS ABOVE GROUND"
          value={floorCount}
          onChange={(v) => onChange({ floorCount: Math.round(v) })}
          step={1}
          min={1}
          max={maxFloors}
        />
      </View>

      <Toggle
        label="Basement"
        hint="An extra level below ground."
        icon="layers"
        on={hasBasement}
        onPress={() => onChange({ hasBasement: !hasBasement })}
      />
      <Toggle
        label="Roof / Terrace"
        hint="An open top level."
        icon="sun"
        on={hasRoof}
        onPress={() => onChange({ hasRoof: !hasRoof })}
      />

      <View style={{ padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface2, marginTop: 6 }}>
        <Text variant="bodySm" color="ink2">
          You'll fill in the rooms for {total === 1 ? 'this level' : `each of these ${total} levels`} next — and you
          can copy one level's answers to the next.
        </Text>
      </View>
    </View>
  );
}

// ── 4. Orientation & entrance ──────────────────────────────────────────────
const SIDES = [
  { key: 'north', label: 'North (top)' },
  { key: 'east', label: 'East (right)' },
  { key: 'south', label: 'South (bottom)' },
  { key: 'west', label: 'West (left)' },
];

export function OrientationStep({ entranceSide, roadSide, cornerPlot, onChange }) {
  const { colors, radius, isDark } = useTheme();

  // Tap a side of the plot to set the entrance — much faster to understand than
  // a list of compass directions.
  const SidePad = ({ side, style }) => {
    const on = entranceSide === side;
    return (
      <Pressable
        onPress={() => onChange({ entranceSide: side })}
        style={[
          {
            position: 'absolute',
            backgroundColor: on ? colors.accent : colors.surface,
            borderWidth: 1.5,
            borderColor: on ? colors.accent : colors.line,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Icon name="door" size={16} color={on ? '#fff' : colors.ink3} />
      </Pressable>
    );
  };

  return (
    <View>
      <View
        style={{
          height: 236,
          borderRadius: radius.xl,
          backgroundColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width="160" height="120" style={{ position: 'absolute' }}>
          <Rect
            width="160" height="120" rx="4"
            fill={colors.accent} fillOpacity={isDark ? 0.08 : 0.12}
            stroke={colors.accent} strokeWidth={2.5}
          />
          <Line x1="0" y1="60" x2="160" y2="60" stroke={colors.line} strokeWidth={1} strokeDasharray="4 4" />
          <Line x1="80" y1="0" x2="80" y2="120" stroke={colors.line} strokeWidth={1} strokeDasharray="4 4" />
        </Svg>

        <SidePad side="north" style={{ top: 38, width: 40, height: 26 }} />
        <SidePad side="south" style={{ bottom: 38, width: 40, height: 26 }} />
        <SidePad side="west" style={{ left: 62, width: 26, height: 40 }} />
        <SidePad side="east" style={{ right: 62, width: 26, height: 40 }} />

        <Text variant="label" color="ink3" style={{ position: 'absolute', top: 12 }}>
          TAP A SIDE FOR THE MAIN ENTRANCE
        </Text>
      </View>

      <StepSection title="Road-facing side" hint="Which side does the street run along?">
        <View style={{ gap: 8 }}>
          {SIDES.map((s) => (
            <OptionCard
              key={s.key}
              title={s.label}
              selected={roadSide === s.key}
              onPress={() => onChange({ roadSide: s.key })}
              compact
            />
          ))}
        </View>
      </StepSection>

      <StepSection title="Plot position">
        <OptionCard
          icon="polygon"
          title="Corner plot"
          subtitle="Two sides face a road — allows windows and access on both."
          selected={cornerPlot}
          onPress={() => onChange({ cornerPlot: !cornerPlot })}
          compact
        />
      </StepSection>
    </View>
  );
}

// ── 5. Per-floor programme (one step per level) ────────────────────────────
export function FloorStep({ floor, index, spaceType, previousName, onCopyPrevious, onPurpose, onRoom, onAddCustom, onRemoveCustom, onNotes }) {
  const { colors, radius } = useTheme();
  const rooms = spaceType?.rooms || [];
  const purposes = spaceType?.floorPurposes || [];

  return (
    <View>
      {/* The copy button is pinned above everything: on a repeating building
          (a plaza's shop floors, an apartment block) it turns this whole step
          into a single tap. */}
      {previousName ? (
        <Pressable
          onPress={onCopyPrevious}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 14, borderRadius: radius.lg,
            borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent,
            backgroundColor: colors.accentTintBg, marginBottom: 18,
          }}
        >
          <Icon name="duplicate" size={19} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="titleSm" color="accent">Copy from {previousName}</Text>
            <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
              Same rooms and notes — edit anything after.
            </Text>
          </View>
        </Pressable>
      ) : null}

      {purposes.length ? (
        <StepSection title="What is this level for?" style={{ marginTop: 0 }}>
          <View style={{ gap: 8 }}>
            {purposes.map((p) => (
              <OptionCard
                key={p}
                title={p}
                selected={floor.purpose === p}
                onPress={() => onPurpose(floor.purpose === p ? '' : p)}
                compact
              />
            ))}
          </View>
        </StepSection>
      ) : null}

      <StepSection title="Rooms on this level" hint="Set how many of each you need. Leave at 0 to skip.">
        <View style={{ gap: 8 }}>
          {rooms.map((r) => (
            <CounterRow
              key={r.type}
              icon={r.icon}
              label={r.label}
              value={floor.rooms[r.type] ?? 0}
              max={r.max}
              onChange={(v) => onRoom(r.type, v)}
            />
          ))}
        </View>
      </StepSection>

      <StepSection title="Anything else on this level?" hint="Describe a space that isn't in the list.">
        <View style={{ gap: 8 }}>
          {floor.customSpaces.map((c, i) => (
            <CustomTag key={`${c}-${i}`} label={c} onRemove={() => onRemoveCustom(i)} />
          ))}
          <CustomEntry placeholder="e.g. a home theatre off the lounge" onSubmit={onAddCustom} />
        </View>
      </StepSection>

      <StepSection title="Notes for this level" hint="Optional — anything specific about how it should work.">
        {floor.notes ? (
          <CustomTag label={floor.notes} onRemove={() => onNotes('')} />
        ) : (
          <CustomEntry
            placeholder="e.g. keep the guest area away from the bedrooms"
            onSubmit={onNotes}
            buttonLabel="Save"
            multiline
          />
        )}
      </StepSection>
    </View>
  );
}

// ── 6. Furnishing ──────────────────────────────────────────────────────────
export function FurnishingStep({ levels, value, onChange }) {
  const icons = { essential: 'square', full: 'grid', luxury: 'star' };
  return (
    <View style={{ gap: 10 }}>
      {levels.map((l) => (
        <OptionCard
          key={l.key}
          icon={icons[l.key] || 'grid'}
          title={l.label}
          subtitle={l.hint}
          selected={value === l.key}
          onPress={() => onChange(l.key)}
        />
      ))}
    </View>
  );
}

// ── 7. Style ───────────────────────────────────────────────────────────────
export function StyleStep({ styles, value, onChange }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {styles.map((s) => (
        <Pressable
          key={s.key}
          onPress={() => onChange(s.key)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
            borderRadius: radius.lg, borderWidth: 1.5,
            borderColor: value === s.key ? colors.accent : colors.line,
            backgroundColor: value === s.key ? colors.accentTintBg : colors.surface,
          }}
        >
          {/* Swatch of the finish this style actually applies, so the choice
              shows its consequence instead of just naming it. */}
          <View
            style={{
              width: 44, height: 44, borderRadius: radius.md,
              backgroundColor: s.wall, borderWidth: 1, borderColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16, backgroundColor: FLOOR_SWATCH[s.floor] || '#C8A87A' }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSm">{s.label}</Text>
            <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>{s.hint}</Text>
          </View>
          {value === s.key ? <Icon name="check" size={20} color={colors.accent} strokeWidth={2.6} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

// Approximate 2D colours of each floor finish, mirroring FLOOR_MATERIALS in
// src/data/materials.js — only used for the swatch above.
const FLOOR_SWATCH = {
  oak: '#C8A87A', walnut: '#8A6250', ash: '#D8CBB4', tile: '#D3D8DC',
  marble: '#EDEAE3', concrete: '#B4B0A8', carpet: '#A98E7E', terracotta: '#C77B52',
};

// ── 8. Requirements ────────────────────────────────────────────────────────
export function RequirementsStep({ chips, selected, extras, notes, onToggle, onAddExtra, onRemoveExtra, onNotes }) {
  return (
    <View>
      <View style={{ gap: 8 }}>
        {chips.map((c) => (
          <OptionCard
            key={c.key}
            title={c.label}
            selected={selected.includes(c.key)}
            onPress={() => onToggle(c.key)}
            compact
          />
        ))}
      </View>

      <StepSection title="Your own requirements" hint="Anything else the design must do.">
        <View style={{ gap: 8 }}>
          {extras.map((e, i) => (
            <CustomTag key={`${e}-${i}`} label={e} onRemove={() => onRemoveExtra(i)} />
          ))}
          <CustomEntry placeholder="e.g. the kitchen must not face the street" onSubmit={onAddExtra} />
        </View>
      </StepSection>

      <StepSection title="Describe your dream space" hint="In your own words. This carries the most weight.">
        {notes ? (
          <CustomTag label={notes} onRemove={() => onNotes('')} />
        ) : (
          <CustomEntry
            placeholder="Tell us how you want to live in this space…"
            onSubmit={onNotes}
            buttonLabel="Save"
            multiline
          />
        )}
      </StepSection>
    </View>
  );
}

// ── 9. Review ──────────────────────────────────────────────────────────────
export function ReviewStep({ rows, cost, isFree, balance, onJump }) {
  const { colors, radius } = useTheme();

  return (
    <View>
      <View
        style={{
          padding: 18, borderRadius: radius.lg,
          backgroundColor: isFree ? colors.accentTintBg : colors.surface2,
          borderWidth: isFree ? 1.5 : 0, borderColor: colors.accent,
          flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
        }}
      >
        <Icon name={isFree ? 'star' : 'cube'} size={22} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text variant="titleSm">{isFree ? 'Your first design is free' : `${cost} credits`}</Text>
          <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
            {isFree
              ? 'Generate it and see what we come up with — no credits used.'
              : `You have ${balance} credits. Watch an ad to earn more any time.`}
          </Text>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        {rows.map((row, i) => (
          <Pressable
            key={`${row.label}-${i}`}
            onPress={row.step != null ? () => onJump(row.step) : undefined}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              paddingVertical: 13, paddingHorizontal: 14,
              borderRadius: radius.md,
              backgroundColor: i % 2 ? 'transparent' : colors.surface,
            }}
          >
            <Text variant="bodySm" color="ink3" style={{ width: 104 }}>
              {row.label}
            </Text>
            <Text variant="bodySm" style={{ flex: 1, fontWeight: '600' }}>
              {row.value}
            </Text>
            {row.step != null ? <Icon name="pencil" size={15} color={colors.ink3} /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
