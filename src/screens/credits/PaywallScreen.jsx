import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { showRewardedAd } from '@/services/ads/admob';

export default function PaywallScreen({ navigation, route }) {
  const { colors, radius, shadows } = useTheme();
  const needed = route.params?.needed ?? 5;
  const balance = useCreditsStore((s) => s.balance);
  const earnFromAd = useCreditsStore((s) => s.earnFromAd);
  const canWatchAd = useCreditsStore((s) => s.canWatchAd);
  const [busy, setBusy] = useState(false);

  const watch = async () => {
    if (!canWatchAd()) return;
    setBusy(true);
    const earned = await showRewardedAd();
    if (earned) earnFromAd();
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={() => navigation.goBack()} />
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 34,
          },
          shadows.e3,
        ]}
      >
        <View style={{ width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 }} />

        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24 }}>🪙</Text>
          </View>
          <Text variant="h2" align="center" style={{ marginTop: 14 }}>
            Not enough credits
          </Text>
          <Text variant="body" color="ink2" align="center" style={{ marginTop: 8 }}>
            You need {needed} credits for this export. You have {balance}.
          </Text>
        </View>

        <View style={{ marginTop: 22, gap: 10 }}>
          <Pressable
            onPress={watch}
            disabled={busy}
            style={{
              borderWidth: 1,
              borderColor: colors.lineSoft,
              borderRadius: radius.md,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.dangerSoftLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>🎬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>
                Watch an ad
              </Text>
              <Text variant="bodySm" color="ink3">
                +1 credit · free
              </Text>
            </View>
            <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
              {busy ? '…' : 'Watch'}
            </Text>
          </Pressable>

          <View
            style={{
              borderWidth: 1.5,
              borderColor: colors.accent,
              backgroundColor: colors.accentTintBg,
              borderRadius: radius.md,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>🪙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>
                Credit Pack — 10
              </Text>
              <Text variant="bodySm" color="ink3">
                Watch 3 ads to unlock
              </Text>
            </View>
            <View style={{ backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Text variant="bodySm" color="onAccent" style={{ fontWeight: '700' }}>
                Unlock
              </Text>
            </View>
          </View>
        </View>

        <LinearGradient
          colors={['#24211C', '#0F0E0C']}
          style={{ marginTop: 20, borderRadius: radius.lg, padding: 18, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: colors.accent, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>COMING SOON</Text>
          </View>
          <Text style={{ color: '#F4F1EA', fontFamily: 'Sora_700Bold', fontSize: 17 }}>HomePlanner Unlimited</Text>
          <Text style={{ color: '#ADA79B', fontSize: 13, marginTop: 6, lineHeight: 18 }}>
            Unlimited exports, no ads, premium catalog. Join the waitlist.
          </Text>
        </LinearGradient>

        <Text
          variant="bodySm"
          color="ink3"
          align="center"
          style={{ marginTop: 18, fontWeight: '700' }}
          onPress={() => navigation.goBack()}
        >
          Maybe later
        </Text>
      </View>
    </View>
  );
}
