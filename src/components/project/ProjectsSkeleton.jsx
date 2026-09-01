import { View } from 'react-native';

import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/useTheme';

// Mirrors ProjectsScreen's grid (47%-wide cards: 96px cover + two text lines)
// so the loading state sits exactly where the real cards will land.
export default function ProjectsSkeleton() {
  const { radius } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 20,
        gap: 14,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ width: '47%', borderRadius: radius.lg, overflow: 'hidden' }}>
          <Skeleton height={96} radius={0} />
          <View style={{ padding: 12, gap: 6 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
