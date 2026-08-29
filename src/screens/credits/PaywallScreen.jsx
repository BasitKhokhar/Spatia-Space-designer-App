import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { showRewardedAd } from '@/services/ads/admob';
import { isRemote } from '@/services/api/client';
import { billingApi } from '@/services/api/billingApi';
import { usePlayBilling } from '@/hooks/usePlayBilling';
import { displayPriceForPlan, isLifetimePlan } from '@/services/billing/playBilling';

// Offline/first-paint fallback only. When a backend is attached the ladder is
// whatever /billing/plans returns, so pricing and copy can change from the
// admin dashboard without shipping an app update.
const FALLBACK_PLANS = [
  {
    code: 'FREE', name: 'Free', price: 0, currency: 'USD',
    features: ['Basic items free', 'Unlock premium items with credits', 'Earn credits by watching ads'],
  },
  {
    code: 'BASIC', name: 'Basic', price: 4.99, currency: 'USD', unlocksAllPremium: true, adsDisabled: true,
    features: ['Everything in Free', 'All premium items unlocked', 'No ads', '100 download credits'],
  },
  {
    code: 'PREMIUM', name: 'Premium', price: 9.99, currency: 'USD', isUnlimited: true, unlocksAllPremium: true, adsDisabled: true,
    features: ['Everything in Basic', 'Unlimited downloads', 'Unlimited editing', 'Priority support'],
  },
];

// Mirrors the backend's tier derivation (routes/billingRoutes.js#my-status) so
// the "Current plan" badge lands on the right card.
function tierForPlan(plan) {
  if (plan.isUnlimited) return 'premium';
  if (plan.unlocksAllPremium) return 'basic';
  return 'free';
}

function periodLabel(plan) {
  if (isLifetimePlan(plan)) return '';
  if (!plan.durationDays) return '';
  if (plan.durationDays >= 360) return '/yr';
  if (plan.durationDays >= 175) return '/6mo';
  return '/mo';
}

export default function PaywallScreen({ navigation, route }) {
  const { colors, radius, shadows } = useTheme();
  const needed = route.params?.needed;
  const balance = useCreditsStore((s) => s.balance);
  const tier = useCreditsStore((s) => s.tier);
  const earnFromAd = useCreditsStore((s) => s.earnFromAd);
  const canWatchAd = useCreditsStore((s) => s.canWatchAd);
  const refreshCredits = useCreditsStore((s) => s.refresh);

  const [adBusy, setAdBusy] = useState(false);
  const [serverPlans, setServerPlans] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(isRemote());

  // Live plans from the backend — the source of truth for what's on sale.
  useEffect(() => {
    if (!isRemote()) return undefined;
    let alive = true;
    billingApi.plans()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : res?.plans || res?.data || null;
        setServerPlans(list);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingPlans(false); });
    return () => { alive = false; };
  }, []);

  const basePlans = useMemo(() => {
    const list = (serverPlans && serverPlans.length ? serverPlans : FALLBACK_PLANS)
      .filter((p) => p.isActive !== false)
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    return list;
  }, [serverPlans]);

  const { storeSubs, storeProducts, busy: billingBusy, purchase, restore } = usePlayBilling({
    plans: basePlans,
    // The backend has already written the entitlement by the time this runs;
    // refresh() pulls it back so the UI reflects the server, never a local guess.
    onEntitlementChange: refreshCredits,
    onError: (message) => Alert.alert('Purchase', message),
    onSuccess: () => navigation.goBack(),
  });

  // Overlay Google's own formatted price (correct currency for the user's
  // region) on top of the plan's stored USD figure.
  const plans = useMemo(
    () => basePlans.map((plan) => ({
      ...plan,
      tier: tierForPlan(plan),
      displayPrice: displayPriceForPlan(plan, { storeSubs, storeProducts }),
      period: periodLabel(plan),
      featureList: Array.isArray(plan.features) && plan.features.length
        ? plan.features
        : (FALLBACK_PLANS.find((f) => f.code === plan.code)?.features || []),
    })),
    [basePlans, storeSubs, storeProducts]
  );

  const busy = adBusy || billingBusy;

  const watch = async () => {
    if (!canWatchAd()) return;
    setAdBusy(true);
    const earned = await showRewardedAd();
    if (earned) await earnFromAd();
    setAdBusy(false);
  };

  const subscribe = async (plan) => {
    if (plan.tier === 'free' || plan.tier === tier) return;

    // No Play product mapped yet (a plan authored in the dashboard before its
    // Play Console product exists). In dev, allow previewing the gating.
    if (!plan.playStoreProductId) {
      if (__DEV__ && !isRemote()) {
        Alert.alert(
          `Preview ${plan.name}?`,
          'Applies this plan locally so you can test gating. Real purchases go through Google Play.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Preview ${plan.name}`,
              onPress: async () => {
                useCreditsStore.getState().setTier(plan.tier);
                await refreshCredits();
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Subscribe', `${plan.name} will be available through Google Play shortly.`);
      }
      return;
    }

    await purchase(plan);
  };

  const onRestore = async () => {
    const count = await restore();
    Alert.alert(
      'Restore purchases',
      count > 0
        ? `Restored ${count} purchase${count === 1 ? '' : 's'}.`
        : 'No previous purchases were found for this Google account.'
    );
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
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 28,
            maxHeight: '90%',
          },
          shadows.e3,
        ]}
      >
        <View style={{ width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 }} />

        <Text variant="h2" align="center">Choose your plan</Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 6 }}>
          {needed
            ? `You need ${needed} credits — upgrade for premium items or keep earning free credits.`
            : 'Unlock the full library and remove ads.'}
        </Text>

        {loadingPlans ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 32 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, gap: 12 }}>
            {plans.map((plan) => {
              const current = plan.tier === tier;
              const highlight = plan.code === 'BASIC';
              return (
                <View
                  key={plan.code}
                  style={{
                    borderWidth: highlight ? 1.5 : 1,
                    borderColor: highlight ? colors.accent : colors.lineSoft,
                    backgroundColor: highlight ? colors.accentTintBg : colors.surface,
                    borderRadius: radius.lg,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="title">{plan.name}</Text>
                      {highlight ? (
                        <View style={{ backgroundColor: colors.accent, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.5 }}>POPULAR</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="title">
                      {plan.displayPrice || (plan.price ? `$${plan.price}` : 'Free')}
                      <Text variant="caption" color="ink3">{plan.period}</Text>
                    </Text>
                  </View>

                  {plan.description ? (
                    <Text variant="bodySm" color="ink3" style={{ marginTop: 4 }}>{plan.description}</Text>
                  ) : null}

                  <View style={{ marginTop: 12, gap: 7 }}>
                    {plan.featureList.map((f) => (
                      <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="check" size={15} color={colors.success} strokeWidth={2.4} />
                        <Text variant="bodySm" color="ink2">{f}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => subscribe(plan)}
                    disabled={current || plan.tier === 'free' || busy}
                    style={{
                      marginTop: 14,
                      height: 46,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: busy && !current ? 0.6 : 1,
                      backgroundColor: current || plan.tier === 'free' ? colors.surface2 : colors.accent,
                    }}
                  >
                    <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14.5, color: current || plan.tier === 'free' ? colors.ink3 : '#fff' }}>
                      {current ? 'Current plan' : plan.tier === 'free' ? 'Included' : `Get ${plan.name}`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {/* Keep earning free credits (retains the original watch-ad path). */}
            {tier === 'free' ? (
              <Pressable
                onPress={watch}
                disabled={busy || !canWatchAd()}
                style={{
                  borderWidth: 1, borderColor: colors.lineSoft, borderRadius: radius.md, padding: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 12, opacity: canWatchAd() ? 1 : 0.5,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.dangerSoftLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={17} color={colors.danger} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" style={{ fontFamily: 'Manrope_700Bold' }}>Watch an ad</Text>
                  <Text variant="bodySm" color="ink3">+1 credit · you have {balance}</Text>
                </View>
                {busy ? <ActivityIndicator color={colors.accent} /> : <Text variant="bodySm" color="accent" style={{ fontFamily: 'Manrope_700Bold' }}>Watch</Text>}
              </Pressable>
            ) : null}
          </ScrollView>
        )}

        <Text
          variant="bodySm"
          color="accent"
          align="center"
          style={{ marginTop: 14, fontFamily: 'Manrope_700Bold' }}
          onPress={busy ? undefined : onRestore}
        >
          Restore purchases
        </Text>

        <Text
          variant="bodySm"
          color="ink3"
          align="center"
          style={{ marginTop: 10, fontFamily: 'Manrope_700Bold' }}
          onPress={() => navigation.goBack()}
        >
          Maybe later
        </Text>
      </View>
    </View>
  );
}
