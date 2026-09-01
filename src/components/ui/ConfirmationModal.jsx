import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Button from './Button';
import Icon from '@/components/icons/Icon';

// Shared confirm/cancel popup — icon in a soft circular badge, title + message,
// then a cancel/confirm button pair. Replaces Alert.alert() for destructive or
// otherwise "are you sure" actions (logout, delete account, ...) app-wide.
export default function ConfirmationModal({
  visible,
  icon = 'warning',
  danger = false,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}) {
  const { colors, radius, shadows } = useTheme();
  const tint = danger ? colors.dangerDark : colors.accent;
  const badgeBg = danger ? colors.dangerSoftLight : colors.accentSoft;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={loading ? undefined : onClose}
        style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: 20,
              alignItems: 'center',
            },
            shadows.e3,
          ]}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.xxl,
              backgroundColor: badgeBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={32} color={tint} strokeWidth={1.8} />
          </View>

          <Text variant="h2" align="center" style={{ marginTop: 18 }}>
            {title}
          </Text>
          {message ? (
            <Text variant="body" color="ink2" align="center" style={{ marginTop: 8 }}>
              {message}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
            <Button title={cancelLabel} variant="secondary" size="md" onPress={onClose} disabled={loading} style={{ flex: 1 }} />
            <Button
              title={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              size="md"
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
