import { View } from 'react-native';

import Text from './Text';

// Row with a title and an optional trailing action (e.g. "See all").
export default function SectionHeader({ title, action, onAction, style }) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        style,
      ]}
    >
      <Text variant="title">{title}</Text>
      {action ? (
        <Text variant="label" color="accent" onPress={onAction}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}
