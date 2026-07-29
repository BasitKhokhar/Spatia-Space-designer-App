import { useEffect, useRef } from 'react';
import { Modal, View, Pressable, Animated, Easing } from 'react-native';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import { useTheme } from '@/theme/useTheme';

// Shown when a paid action is blocked by an empty wallet — a centered card over
// a dimmed backdrop with the coin medallion, the exact shortfall, and the two
// ways out (buy a pack, or watch an ad). Deliberately a dialog and not a full
// screen: the user was mid-flow, and being told the price shouldn't cost them
// their place in it.
export default function NotEnoughCreditsModal({
  visible,
  cost = 0,
  balance = 0,
  title = 'Not enough credits',
  action = 'Designing with AI',
  onGetCredits,
  onEarnCredits,
  onClose,
}) {
  const { colors, radius, shadows } = useTheme();
  const short = Math.max(0, cost - balance);

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
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
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
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: colors.credit,
                borderWidth: 8,
                borderColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 34 }}>🪙</Text>
            </View>

            <Text variant="title" align="center" style={{ marginTop: 20 }}>
              {title}
            </Text>
            <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 10, lineHeight: 20 }}>
              {action} costs {cost} {cost === 1 ? 'credit' : 'credits'} and you have {balance}. Top up{' '}
              {short} more to continue.
            </Text>

            {/* The two numbers side by side — cheaper to read than the sentence. */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 18,
                width: '100%',
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                backgroundColor: colors.surface2,
                overflow: 'hidden',
              }}
            >
              <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
                <Text variant="label" color="ink3">
                  YOU HAVE
                </Text>
                <Text variant="titleSm" style={{ marginTop: 4 }}>
                  🪙 {balance}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.lineSoft }} />
              <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
                <Text variant="label" color="ink3">
                  YOU NEED
                </Text>
                <Text variant="titleSm" color="accent" style={{ marginTop: 4 }}>
                  🪙 {cost}
                </Text>
              </View>
            </View>

            <View style={{ width: '100%', gap: 10, marginTop: 22 }}>
              <Button title="Get credits" icon="star" iconPosition="left" onPress={onGetCredits} />
              {onEarnCredits ? (
                <Button
                  title="Watch an ad for free credits"
                  variant="secondary"
                  icon="play"
                  iconPosition="left"
                  onPress={onEarnCredits}
                />
              ) : null}
              <Button title="Not now" variant="ghost" onPress={onClose} />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
