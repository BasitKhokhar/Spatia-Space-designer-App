import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';

// Generic centered empty/illustration state with optional CTA.
export default function EmptyState({ illustration, title, message, actionTitle, onAction, actionIcon, style }) {
  const { spacing } = useTheme();
  return (
    <View
      style={[
        { alignItems: 'center', paddingHorizontal: spacing.huge, paddingTop: 40 },
        style,
      ]}
    >
      {illustration}
      <Text variant="h2" align="center" style={{ marginTop: 28 }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 10 }}>
          {message}
        </Text>
      ) : null}
      {actionTitle ? (
        <Button
          title={actionTitle}
          icon={actionIcon}
          onPress={onAction}
          fullWidth={false}
          style={{ marginTop: 26 }}
        />
      ) : null}
    </View>
  );
}
