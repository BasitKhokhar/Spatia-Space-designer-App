import { View, Pressable } from 'react-native';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import PlanThumbnail from '@/components/graphics/PlanThumbnail';
import { timeAgo, pluralize } from '@/utils/format';

// Grid card for a saved project. Pass `onDelete` to show a delete affordance
// (a circular trash button on the thumbnail); it fires without opening the card.
export default function ProjectCard({ project, onPress, onDelete, style }) {
  return (
    <Card onPress={onPress} padded={false} style={[{ overflow: 'hidden' }, style]}>
      <View>
        <PlanThumbnail variant={project.variant} height={96} />
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            style={({ pressed }) => ({
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(20,17,15,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon name="trash" size={16} color="#fff" strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <Text variant="titleSm" numberOfLines={1}>
          {project.name}
        </Text>
        <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
          {pluralize(project.rooms, 'room')} · {timeAgo(project.updatedAt)}
        </Text>
      </View>
    </Card>
  );
}
