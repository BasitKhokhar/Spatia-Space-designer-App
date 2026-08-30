import { View, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useRewardedFlow } from '@/hooks/useRewardedFlow';

function ProgressRing({ watched, total }) {
  const { colors } = useTheme();
  const size = 110;
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, watched / total);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.lineSoft} strokeWidth={14} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={14}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 36 }}>🪙</Text>
    </View>
  );
}

export default function EarnCreditsScreen({ navigation }) {
  const { colors } = useTheme();
  const balance = useCreditsStore((s) => s.balance);
  const adsWatchedToday = useCreditsStore((s) => s.adsWatchedToday);
  // Cap and reward come from the store, not the local CREDITS constants: the
  // backend is authoritative for both, so reading the constants would make this
  // screen promise numbers the server does not honour.
  const { busy, canWatch, adsRemaining, dailyAdCap, perAd, watch } = useRewardedFlow();

  const remaining = adsRemaining;

  const onWatch = async () => {
    if (!canWatch) return;
    await watch();
  };

  return (
    <Screen padded>
      <View style={{ alignItems: 'flex-end', paddingTop: 8 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={17} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <ProgressRing watched={adsWatchedToday} total={dailyAdCap} />
        <Text variant="h2" align="center" style={{ marginTop: 28 }}>
          Watch & earn
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
          Watch a short 15-second ad to earn{' '}
          <Text variant="body" color="ink" style={{ fontWeight: '700' }}>
            +{perAd} credit{perAd === 1 ? '' : 's'}
          </Text>
          , instantly added to your balance.
        </Text>
      </View>

      <View
        style={{
          marginTop: 26,
          borderRadius: 16,
          padding: 16,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Text variant="bodySm" color="ink2" style={{ fontWeight: '700' }}>
          Current balance
        </Text>
        <Text style={{ fontSize: 16 }}>🪙</Text>
        <Text variant="title">{balance} credits</Text>
      </View>

      <View style={{ marginTop: 'auto', marginBottom: 34 }}>
        <Button
          title={remaining > 0 ? `Watch Ad — Earn ${perAd} Credit${perAd === 1 ? '' : 's'}` : 'Daily limit reached'}
          icon="play"
          iconPosition="left"
          onPress={onWatch}
          loading={busy}
          disabled={!canWatch}
        />
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 14 }}>
          {remaining} of {dailyAdCap} ads left today
        </Text>
      </View>
    </Screen>
  );
}
