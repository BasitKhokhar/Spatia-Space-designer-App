import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { useToast } from '@/store/useToast';

// Global toast surface, mounted once at the app root.
//
// Rendered as its own transparent Modal rather than a plain overlay View: a
// sibling View would render behind any other open RN <Modal> (the unlock
// sheet, the "not enough credits" dialog — exactly where a rewarded-ad toast
// needs to appear), because Modal presents in its own native window on top of
// the normal view hierarchy. Only mounted natively while a toast exists
// (`visible` tracks the toast, not a constant true), so it never intercepts
// touches the rest of the time.
export default function ToastHost() {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast((s) => s.toast);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [toast?.id, opacity, translateY]);

  if (!toast) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              bottom: insets.bottom + 24,
              backgroundColor: colors.ink,
              borderRadius: radius.lg,
              opacity,
              transform: [{ translateY }],
            },
            shadows.e3,
          ]}
        >
          <Text
            color="bg"
            align="center"
            style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13.5 }}
          >
            {toast.message}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
});
