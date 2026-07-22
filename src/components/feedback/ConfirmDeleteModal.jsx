import { useEffect, useRef } from 'react';
import { Modal, View, Pressable, Animated, Easing } from 'react-native';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Premium warning dialog for destructive actions (project delete, etc.).
// Centered card over a dimmed backdrop with a circular danger icon, a title, a
// professional supporting line, and Cancel / Confirm actions. Fully controlled:
// the parent owns `visible` and supplies `onCancel` / `onConfirm`.
export default function ConfirmDeleteModal({
  visible,
  title = 'Delete this project?',
  message = 'This permanently removes the project and all of its floor plans. This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  icon = 'trash',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { colors, radius, shadows, isDark } = useTheme();
  const medallionBg = isDark ? colors.dangerSoftDark : colors.dangerSoftLight;
  const medallionRing = isDark ? colors.dangerBorderDark : colors.dangerBorderLight;

  // Subtle scale/opacity entrance so the card feels lifted, not abrupt.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      {/* Backdrop — tapping outside cancels. */}
      <Pressable
        onPress={busy ? undefined : onCancel}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        {/* Card — stop propagation so taps inside don't dismiss. */}
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 380 }}>
          <Animated.View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radius.xxl,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: 22,
                alignItems: 'center',
                opacity: anim,
                transform: [{ scale }],
              },
              shadows.e3,
            ]}
          >
            {/* Icon medallion with a soft danger ring. */}
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: medallionBg,
                borderWidth: 8,
                borderColor: medallionRing,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} size={38} color={colors.dangerDark} strokeWidth={1.9} />
            </View>

            <Text variant="title" align="center" style={{ marginTop: 20 }}>
              {title}
            </Text>
            <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 10, lineHeight: 20 }}>
              {message}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <View style={{ flex: 1 }}>
                <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={confirmLabel}
                  variant="danger"
                  icon={icon}
                  iconPosition="left"
                  loading={busy}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
