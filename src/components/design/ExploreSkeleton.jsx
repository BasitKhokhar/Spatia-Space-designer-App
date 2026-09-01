import { View } from 'react-native';

import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/useTheme';

// Mirrors ExploreScreen's real layout 1:1 (header, category rail, featured
// card, grid) so the swap from loading → loaded never shifts anything.
export default function ExploreSkeleton() {
  const { radius } = useTheme();

  return (
    <View>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={90} height={24} />
            <Skeleton width={220} height={14} />
          </View>
          <Skeleton width={64} height={44} radius={radius.md} />
        </View>
      </View>

      {/* Category rail */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 20 }}>
        {[96, 84, 104, 78].map((w, i) => (
          <Skeleton key={i} width={w} height={44} radius={radius.pill} />
        ))}
      </View>

      {/* Section title */}
      <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 6 }}>
        <Skeleton width={140} height={20} />
        <Skeleton width={180} height={13} />
      </View>

      {/* Featured card */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <Skeleton height={186} radius={radius.lg} />
      </View>

      {/* Grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          marginTop: 14,
          rowGap: 14,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={118} radius={radius.lg} style={{ width: '47.5%' }} />
        ))}
      </View>
    </View>
  );
}
