import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Right-side controls + floors drawer for the 3D viewer: quick actions (Share,
// Export, Reset view, Camera controls) and a per-floor visibility list.
export default function ViewerControlsDrawer({
  visible,
  onClose,
  floors = [],
  activeFloorId,
  isFloorVisible,
  onToggleFloor,
  onShare,
  onExport,
  onReset,
  onCameraControls,
}) {
  const { colors, radius, shadows, isDark } = useTheme();
  const panelW = 300;

  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, panelW] });
  // Show top floor first, like a building elevation.
  const ordered = [...floors].reverse();

  const ACTIONS = [
    { icon: 'share', label: 'Share', onPress: onShare },
    { icon: 'upload', label: 'Export', onPress: onExport },
    { icon: 'expand', label: 'Reset view', onPress: onReset },
    { icon: 'move', label: 'Camera controls', onPress: onCameraControls },
  ];

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: panelW,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderBottomLeftRadius: radius.xxl,
            transform: [{ translateX }],
          },
          shadows.e3,
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 }}>
            <Text variant="title">View</Text>
            <Pressable
              onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={16} color={colors.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Actions */}
            {ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => { a.onPress?.(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 52 }}
              >
                <Icon name={a.icon} size={19} color={colors.ink2} strokeWidth={1.9} />
                <Text variant="body" style={{ color: colors.ink }}>{a.label}</Text>
              </Pressable>
            ))}

            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 8, marginHorizontal: 16 }} />

            <Text variant="label" color="ink3" style={{ paddingHorizontal: 20, marginBottom: 6 }}>
              FLOORS
            </Text>
            {ordered.map((f) => {
              const on = isFloorVisible ? isFloorVisible(f.id) : true;
              const active = f.id === activeFloorId;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => onToggleFloor?.(f.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, height: 50 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: on ? colors.accent : colors.line,
                      backgroundColor: on ? colors.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? <Icon name="check" size={13} color="#fff" strokeWidth={3} /> : null}
                  </View>
                  <Text variant="body" style={{ flex: 1, color: colors.ink, fontWeight: active ? '800' : '500' }}>
                    {f.name}
                  </Text>
                  {active ? (
                    <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>EDITING</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
