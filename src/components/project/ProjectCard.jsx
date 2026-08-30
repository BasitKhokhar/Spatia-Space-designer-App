import { View, Pressable } from 'react-native';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import CoverImage, { coverUriOf } from '@/components/graphics/CoverImage';
import { roomTypeById } from '@/data/roomTypes';
import { timeAgo, pluralize, formatArea } from '@/utils/format';

// Grid card for a saved project. The cover is the project's own image when it
// has one, else the bundled house render — a blank project reads as a real
// design rather than an empty sketch. Pass `onDelete` to show a delete
// affordance (a circular trash button on the cover); it fires without opening
// the card.
export default function ProjectCard({ project, onPress, onDelete, style }) {
  const area = formatArea(project.plan?.width, project.plan?.length);
  // Play requires AI-generated content to be disclosed as such. The badge is
  // that disclosure wherever a design is listed, not just at the moment it was
  // made — a card seen a month later still has to say where it came from.
  const isAi = project.source === 'ai';

  return (
    <Card onPress={onPress} padded={false} style={[{ overflow: 'hidden' }, style]}>
      <View>
        <CoverImage uri={coverUriOf(project)} height={96} accessibilityLabel={project.name} />
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(20,17,15,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={roomTypeById(project.roomType).icon} size={13} color="#fff" strokeWidth={2} />
        </View>
        {isAi ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 40,
              height: 26,
              paddingHorizontal: 9,
              borderRadius: 13,
              backgroundColor: 'rgba(20,17,15,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}
            >
              AI
            </Text>
          </View>
        ) : null}
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
        <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }} numberOfLines={1}>
          {pluralize(project.rooms, 'room')}
          {area ? ` · ${area}` : ''} · {timeAgo(project.updatedAt)}
        </Text>
      </View>
    </Card>
  );
}
