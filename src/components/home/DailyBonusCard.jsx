import { View, Pressable, ActivityIndicator } from 'react-native';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useRewardedFlow } from '@/hooks/useRewardedFlow';

// "Watch a short ad, get credits" on the home screen.
//
// Every other rewarded entry point in the app sits inside a flow the user is
// already blocked in — they only ever see the offer at the moment they've been
// told no. This is the one place it's available before that happens, which is
// also why it's the surface that actually gets watched.
//
// Renders nothing for users whose plan removed ads, or once the daily cap is
// reached, so it never becomes a dead or nagging control.
export default function DailyBonusCard({ style }) {
  const { colors, radius } = useTheme();
  const { busy, canWatch, adsRemaining, dailyAdCap, perAd, watch } = useRewardedFlow();

  if (!canWatch) return null;

  const watched = Math.max(0, dailyAdCap - adsRemaining);

  return (
    <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, style]}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.creditSoft || colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>🪙</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSm">
          Free credits
        </Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
          Watch a short ad for +{perAd} credit{perAd === 1 ? '' : 's'} · {watched}/{dailyAdCap} today
        </Text>
      </View>
      <Pressable
        onPress={watch}
        disabled={busy}
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          opacity: busy ? 0.6 : pressed ? 0.85 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Icon name="play" size={15} color="#fff" strokeWidth={2.4} />
        )}
        <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 }}>
          {busy ? 'Loading' : 'Watch'}
        </Text>
      </Pressable>
    </Card>
  );
}
