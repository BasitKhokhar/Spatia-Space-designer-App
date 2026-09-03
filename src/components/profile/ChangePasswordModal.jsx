import { useState } from 'react';
import { Modal, Pressable, View, KeyboardAvoidingView, Platform } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { authApi } from '@/services/api/authApi';

const MIN_LENGTH = 8;

// Centered "Change Password" dialog reached from the Profile form's password
// row. Mirrors ConfirmationModal's overlay/card chrome so it matches the rest
// of the app's modals rather than introducing a new visual language.
export default function ChangePasswordModal({ visible, onClose, onSuccess }) {
  const { colors, radius, shadows } = useTheme();
  const [previousPassword, setPreviousPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPreviousPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!previousPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.updatePassword(previousPassword, newPassword);
      reset();
      onSuccess?.();
    } catch (e) {
      setError(e?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable
        onPress={handleClose}
        style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
          <Pressable
            onPress={() => {}}
            style={[
              { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24 },
              shadows.e3,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text variant="h2">Change Password</Text>
              <Pressable onPress={handleClose} hitSlop={10} disabled={loading}>
                <Icon name="close" size={22} color={colors.ink2} strokeWidth={2} />
              </Pressable>
            </View>

            <Input
              label="Current password"
              value={previousPassword}
              onChangeText={setPreviousPassword}
              placeholder="Enter current password"
              icon="lock"
              secureTextEntry
              autoComplete="current-password"
              style={{ marginBottom: 14 }}
            />
            <Input
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 8 characters"
              icon="lock"
              secureTextEntry
              autoComplete="new-password"
              style={{ marginBottom: 14 }}
            />
            <Input
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              icon="lock"
              secureTextEntry
              autoComplete="new-password"
              style={{ marginBottom: error ? 8 : 4 }}
            />

            {error ? (
              <Text variant="bodySm" color="dangerDark" style={{ marginBottom: 8 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button title="Cancel" variant="secondary" size="md" onPress={handleClose} disabled={loading} style={{ flex: 1 }} />
              <Button title="Update" size="md" onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
