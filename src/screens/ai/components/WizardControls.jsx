import { useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Shared controls for the AI brief wizard. Kept together because they are only
// meaningful as a set — the same card, counter and free-text row repeat on
// nearly every step, and consistency between them is most of what makes the
// flow feel considered.

// A large selectable card. Used for space types, styles and furnishing levels.
export function OptionCard({ icon, title, subtitle, selected, onPress, compact = false }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: compact ? 14 : 16,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? colors.accentTintBg : colors.surface,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: selected ? colors.accent : colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={20} color={selected ? '#fff' : colors.accent} strokeWidth={2} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text variant="titleSm">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {selected ? <Icon name="check" size={20} color={colors.accent} strokeWidth={2.6} /> : null}
    </Pressable>
  );
}

// A room-count row: icon, label, and a compact -/+ counter. This is the whole
// interaction on the per-floor step, so it has to be quick to tap repeatedly.
export function CounterRow({ icon, label, value, onChange, max = 20 }) {
  const { colors, radius, fonts } = useTheme();
  const active = value > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.lineSoft,
        backgroundColor: active ? colors.accentTintBg : colors.surface,
      }}
    >
      <Icon name={icon || 'square'} size={18} color={active ? colors.accent : colors.ink3} />
      <Text variant="bodySm" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>

      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        hitSlop={8}
        style={{
          width: 30, height: 30, borderRadius: 9,
          backgroundColor: value > 0 ? colors.accentSoft : colors.surface2,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="minus" size={17} color={value > 0 ? colors.accent : colors.ink3} strokeWidth={2.4} />
      </Pressable>

      <Text style={{ fontFamily: fonts.display, fontSize: 17, color: colors.ink, minWidth: 22, textAlign: 'center' }}>
        {value}
      </Text>

      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        hitSlop={8}
        style={{
          width: 30, height: 30, borderRadius: 9,
          backgroundColor: colors.accent,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="plus" size={17} color={colors.onAccent} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

// The "Something else…" escape hatch that appears on every step.
//
// This is the piece that keeps the wizard from boxing anyone in: whatever the
// user types is sent to the model word for word, so a request no fixed list
// anticipated still shapes the design.
export function CustomEntry({
  placeholder = 'Something else…',
  onSubmit,
  buttonLabel = 'Add',
  multiline = false,
}) {
  const { colors, radius, fonts } = useTheme();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <View
      style={{
        flexDirection: multiline ? 'column' : 'row',
        alignItems: multiline ? 'stretch' : 'center',
        gap: 10,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: focused ? colors.accent : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={multiline ? undefined : submit}
        returnKeyType="done"
        style={{
          flex: multiline ? undefined : 1,
          minHeight: multiline ? 76 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.ink,
          paddingVertical: multiline ? 6 : 0,
        }}
      />
      <Pressable
        onPress={submit}
        disabled={!value.trim()}
        style={{
          paddingHorizontal: 16,
          height: 36,
          borderRadius: radius.md,
          alignSelf: multiline ? 'flex-end' : 'auto',
          backgroundColor: value.trim() ? colors.accent : colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="label" color={value.trim() ? 'onAccent' : 'ink3'}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// A user-authored entry, shown after they add it so it can be removed.
export function CustomTag({ label, onRemove }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: colors.accentTintBg,
        borderWidth: 1,
        borderColor: colors.accent,
      }}
    >
      <Icon name="pencil" size={15} color={colors.accent} />
      <Text variant="bodySm" style={{ flex: 1 }}>
        {label}
      </Text>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Icon name="close" size={16} color={colors.ink3} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

// Section heading inside a step.
export function StepSection({ title, hint, children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginTop: 22 }, style]}>
      <Text variant="label" color="ink3" style={{ marginBottom: 10 }}>
        {title.toUpperCase()}
      </Text>
      {hint ? (
        <Text variant="bodySm" color="ink2" style={{ marginTop: -4, marginBottom: 10 }}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
