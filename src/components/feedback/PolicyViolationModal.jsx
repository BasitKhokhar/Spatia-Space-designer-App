import { useEffect, useRef } from 'react';
import { Modal, View, Pressable, Animated, Easing, ScrollView } from 'react-native';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { describeLockExpiry } from '@/utils/moderationErrors';

// Shown when the AI safety gate refuses a brief, or when the account is locked
// out after repeated refusals.
//
// The design goal is to be specific rather than stern. A user who wrote
// something careless needs to know WHICH answer was the problem and what rule
// it hit — a generic "your request was blocked" leaves them with no move except
// to try the same thing again. So this names the policies in plain language and
// lists the exact wizard answers that tripped them, and the primary action goes
// back to editing rather than out of the flow.
export default function PolicyViolationModal({ visible, presentation, onEdit, onRetry, onClose }) {
  const { colors, radius, shadows } = useTheme();

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

  if (!presentation) return null;

  const locked = presentation.type === 'locked' || Boolean(presentation.until);
  // A service error is not an accusation: no policies to list, and the way
  // out is to try again rather than to rewrite anything.
  const serviceIssue = presentation.type === 'toast';
  const expiry = describeLockExpiry(presentation.until);
  const policies = presentation.policies || [];
  const fields = presentation.fields || [];

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
                backgroundColor: colors.accentSoft,
                borderWidth: 8,
                borderColor: colors.accentTintBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={locked ? 'lock' : serviceIssue ? 'wifi-off' : 'warning'}
                size={34}
                color={colors.accent}
                strokeWidth={1.8}
              />
            </View>

            <Text variant="title" align="center" style={{ marginTop: 20 }}>
              {presentation.title}
            </Text>
            <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 10, lineHeight: 20 }}>
              {presentation.message}
            </Text>

            {expiry ? (
              <Text variant="bodySm" color="accent" align="center" style={{ marginTop: 8 }}>
                {expiry}
              </Text>
            ) : null}

            {/* Which rules, in words rather than API category keys. */}
            {policies.length ? (
              <View style={{ width: '100%', marginTop: 18, gap: 8 }}>
                {policies.map((p) => (
                  <View
                    key={p}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface2,
                      borderWidth: 1,
                      borderColor: colors.lineSoft,
                    }}
                  >
                    <Icon name="warning" size={15} color={colors.accent} strokeWidth={2} />
                    <Text variant="bodySm" style={{ flex: 1 }}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Which of their own answers caused it — the part that makes this
                fixable instead of merely refused. */}
            {fields.length ? (
              <View style={{ width: '100%', marginTop: 16 }}>
                <Text variant="label" color="ink3" style={{ marginBottom: 8 }}>
                  IN THESE ANSWERS
                </Text>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                  {fields.map((f) => (
                    <Text key={f.field} variant="bodySm" color="ink2" style={{ marginBottom: 4 }}>
                      • {f.label}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {!locked && presentation.guidance ? (
              <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 16, lineHeight: 19 }}>
                {presentation.guidance}
              </Text>
            ) : null}

            <View style={{ width: '100%', gap: 10, marginTop: 22 }}>
              {serviceIssue && presentation.retryable && onRetry ? (
                <Button title="Try again" icon="redo" iconPosition="left" onPress={onRetry} />
              ) : null}
              {!locked && !serviceIssue && onEdit ? <Button title="Edit my brief" onPress={onEdit} /> : null}
              {serviceIssue && !presentation.retryable && onEdit ? (
                <Button title="Edit my brief" onPress={onEdit} />
              ) : null}
              <Button
                title={locked || serviceIssue ? 'Close' : 'Cancel'}
                variant={locked ? 'primary' : 'ghost'}
                onPress={onClose}
              />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
