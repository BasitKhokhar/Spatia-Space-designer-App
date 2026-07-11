import { useState } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { CREDITS } from '@/constants/config';
import { showRewardedAd } from '@/services/ads/admob';

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
  const earnFromAd = useCreditsStore((s) => s.earnFromAd);
  const canWatchAd = useCreditsStore((s) => s.canWatchAd);
  const adsRemaining = useCreditsStore((s) => s.adsRemaining);
  const adsWatchedToday = useCreditsStore((s) => s.adsWatchedToday);
  const [busy, setBusy] = useState(false);

  const remaining = adsRemaining();

  const onWatch = async () => {
    if (!canWatchAd()) return;
    setBusy(true);
    const earned = await showRewardedAd();
    if (earned) earnFromAd();
    setBusy(false);
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
        <ProgressRing watched={adsWatchedToday} total={CREDITS.dailyAdCap} />
        <Text variant="h2" align="center" style={{ marginTop: 28 }}>
          Watch & earn
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
          Watch a short 15-second ad to earn{' '}
          <Text variant="body" color="ink" style={{ fontWeight: '700' }}>
            +{CREDITS.perAd} credit
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
          title={remaining > 0 ? `Watch Ad — Earn ${CREDITS.perAd} Credit` : 'Daily limit reached'}
          icon="play"
          iconPosition="left"
          onPress={onWatch}
          loading={busy}
          disabled={remaining === 0}
        />
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 14 }}>
          {remaining} of {CREDITS.dailyAdCap} ads left today
        </Text>
      </View>
    </Screen>
  );
}
