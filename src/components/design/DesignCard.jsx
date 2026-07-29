import { View, Pressable, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import TemplateThumbnail from '@/components/graphics/TemplateThumbnail';
import { useTheme } from '@/theme/useTheme';

// Small pill drawn over the preview (floor count, price, …). Dark glass so it
// reads on both a photo and the generated sketch.
function Badge({ children, tone = 'glass' }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: tone === 'accent' ? colors.accent : 'rgba(18,15,13,0.62)',
      }}
    >
      {children}
    </View>
  );
}

// One premade design in a browse grid. Shows the design's own preview (the
// authored image when the backend has one, else a sketch of its real geometry),
// its size, and what it costs if it's premium. Used by Explore and the category
// flow so a design looks identical wherever the user meets it.
export default function DesignCard({
  template,
  locked = false,
  busy = false,
  onPress,
  previewHeight = 118,
  style,
}) {
  const { colors, radius, shadows } = useTheme();
  const t = template;
  const w = t.dimensions?.width;
  const l = t.dimensions?.length;
  const floors = t.stories || 1;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <View
        style={[
          {
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.lineSoft,
          },
          shadows.e1,
        ]}
      >
        <View style={{ height: previewHeight }}>
          {t.imageUrl ? (
            <Image
              source={{ uri: t.imageUrl }}
              style={{ height: previewHeight, width: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <TemplateThumbnail template={t} height={previewHeight} />
          )}

          {/* Scrim so the size line stays legible over any preview. */}
          <LinearGradient
            colors={['transparent', 'rgba(16,14,12,0.62)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52 }}
            pointerEvents="none"
          />

          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            {floors > 1 ? (
              <Badge>
                <Icon name="layers" size={11} color="#fff" strokeWidth={2.2} />
                <Text variant="label" style={{ color: '#fff', fontSize: 11 }}>
                  {floors}
                </Text>
              </Badge>
            ) : (
              <View />
            )}
            {locked ? (
              <Badge tone="accent">
                <Icon name="lock" size={11} color={colors.onAccent} strokeWidth={2.2} />
                <Text variant="label" color="onAccent" style={{ fontSize: 11 }}>
                  {t.cost}
                </Text>
              </Badge>
            ) : null}
          </View>

          {w && l ? (
            <Text
              variant="label"
              style={{ position: 'absolute', left: 10, bottom: 8, color: '#F5EFE9', fontSize: 11 }}
            >
              {w}m × {l}m
            </Text>
          ) : null}

          {busy ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.overlay,
              }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
          <Text variant="titleSm" numberOfLines={1}>
            {t.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <Text variant="bodySm" color="ink3" numberOfLines={1} style={{ flex: 1 }}>
              {t.rooms} {t.rooms === 1 ? 'room' : 'rooms'}
              {floors > 1 ? ` · ${floors} floors` : ''}
            </Text>
            {/* Every design is a starting point, not a finished thing. */}
            <Icon name="pencil" size={12} color={colors.ink3} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
