import { View } from 'react-native';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import PlanThumbnail from '@/components/graphics/PlanThumbnail';
import { timeAgo, pluralize } from '@/utils/format';

// Grid card for a saved project.
export default function ProjectCard({ project, onPress, style }) {
  return (
    <Card onPress={onPress} padded={false} style={[{ overflow: 'hidden' }, style]}>
      <PlanThumbnail variant={project.variant} height={96} />
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
