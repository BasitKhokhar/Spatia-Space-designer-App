import { View } from 'react-native';

import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/useTheme';

// Mirrors SubscriptionScreen's real layout — plan-status hero, section
// title, then plan cards — so the skeleton occupies exactly where the
// fetched content will land instead of a generic centered spinner.
export default function SubscriptionSkeleton() {
  const { colors, radius, shadows } = useTheme();

  return (
    <View>
      <View
        style={[
          {
            marginTop: 16, borderRadius: radius.xl, padding: 20,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft,
          },
          shadows.e2,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Skeleton width={38} height={38} radius={12} />
          <View style={{ gap: 6 }}>
            <Skeleton width={70} height={10} />
            <Skeleton width={110} height={18} />
          </View>
        </View>
        <Skeleton width="90%" height={13} style={{ marginTop: 16 }} />
        <Skeleton width="60%" height={13} style={{ marginTop: 8 }} />
      </View>

      <Skeleton width={140} height={18} style={{ marginTop: 28, marginBottom: 10 }} />
      <Skeleton width={180} height={13} style={{ marginBottom: 14 }} />

      <View style={{ gap: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={[
              {
                borderRadius: radius.xl, padding: 18,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft,
              },
              shadows.e2,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton width={40} height={40} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="75%" height={12} />
              </View>
            </View>

            <Skeleton width={100} height={30} style={{ marginTop: 18 }} />

            <View style={{ height: 1, backgroundColor: colors.lineSoft, marginVertical: 16 }} />

            <View style={{ gap: 10 }}>
              {Array.from({ length: 3 }).map((__, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Skeleton width={20} height={20} radius={6} />
                  <Skeleton width={`${70 - j * 12}%`} height={12} />
                </View>
              ))}
            </View>

            <Skeleton height={48} radius={radius.md} style={{ marginTop: 18 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
