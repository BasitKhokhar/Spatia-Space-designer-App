import { ScrollView, View } from 'react-native';

import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/useTheme';

const CARD_WIDTH = 168;

// Mirrors RecentProjectsRail's cards (168px wide, 96px cover) so Home's
// loading state lines up with the real rail once projects land.
export default function RecentProjectsSkeleton({ style }) {
  const { radius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={{ width: CARD_WIDTH, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Skeleton height={96} radius={0} />
          <View style={{ padding: 12, gap: 6 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
