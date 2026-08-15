import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { showRewardedAd } from '@/services/ads/admob';
import { isRemote } from '@/services/api/client';
import { billingApi } from '@/services/api/billingApi';
import { REVENUECAT_ANDROID_API_KEY } from '@/constants/config';
import { getOfferingPackages, purchasePackage, restorePurchases } from '@/services/billing/revenueCat';

// The three plans the app ships with. Server values (price/features) override
// these by `code` when a backend is attached; this is the offline fallback and
// the canonical ordering/marketing copy.
const PLAN_DEFS = [
  {
    code: 'FREE', tier: 'free', name: 'Free', price: 0, period: '',
    features: ['Basic items free', 'Unlock premium items with credits', 'Earn credits by watching ads'],
  },
  {
    code: 'BASIC', tier: 'basic', name: 'Basic', price: 4.99, period: '/mo', highlight: true,
    features: ['Everything in Free', 'All premium items unlocked', 'No ads', '100 download credits'],
  },
  {
    code: 'PREMIUM', tier: 'premium', name: 'Premium', price: 9.99, period: '/mo',
    features: ['Everything in Basic', 'Unlimited downloads', 'Unlimited editing', 'Priority support'],
  },
];

export default function PaywallScreen({ navigation, route }) {
  const { colors, radius, shadows } = useTheme();
  const needed = route.params?.needed;
  const balance = useCreditsStore((s) => s.balance);
  const tier = useCreditsStore((s) => s.tier);
  const earnFromAd = useCreditsStore((s) => s.earnFromAd);
  const canWatchAd = useCreditsStore((s) => s.canWatchAd);
  const refreshCredits = useCreditsStore((s) => s.refresh);
  const [busy, setBusy] = useState(false);
  const [serverPlans, setServerPlans] = useState(null);
  const [rcPackages, setRcPackages] = useState([]);

  // Pull live plan pricing/features when a backend is attached.
  useEffect(() => {
    if (!isRemote()) return;
    let alive = true;
    billingApi.plans()
      .then((res) => { if (alive) setServerPlans(Array.isArray(res) ? res : res?.plans || res?.data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Pull live RevenueCat offerings (empty until the RC dashboard is linked to
  // Play Console — see the "unavailable" fallback in subscribe() below).
  useEffect(() => {
    let alive = true;
    getOfferingPackages().then((pkgs) => { if (alive) setRcPackages(pkgs); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Merge server plan data (description/features) and RevenueCat's live store
  // price into the fixed Free/Basic/Premium ladder by code/tier.
  const plans = useMemo(() => {
    const byCode = serverPlans ? Object.fromEntries(serverPlans.map((p) => [p.code, p])) : {};
    const byTier = Object.fromEntries(rcPackages.map((p) => [p.identifier, p]));
    return PLAN_DEFS.map((def) => {
      const s = byCode[def.code];
      const rcPackage = byTier[def.tier];
      return {
        ...def,
        price: s && typeof s.price === 'number' ? s.price : def.price,
        features: s && Array.isArray(s.features) && s.features.length ? s.features : def.features,
        name: (s && s.name) || def.name,
        rcPackage,
        priceString: rcPackage?.product?.priceString,
      };
    });
  }, [serverPlans, rcPackages]);

  const watch = async () => {
    if (!canWatchAd()) return;
    setBusy(true);
    const earned = await showRewardedAd();
    if (earned) await earnFromAd();
    setBusy(false);
  };

  const subscribe = async (plan) => {
    if (plan.tier === 'free' || plan.tier === tier) return;

    // No RevenueCat key configured yet (dashboard not linked to Play Console)
    // — fall back to a __DEV__-only local preview so gating can still be
    // exercised end-to-end; guide the user otherwise.
    if (!REVENUECAT_ANDROID_API_KEY) {
      if (__DEV__) {
        Alert.alert(
          `Preview ${plan.name}?`,
          'Development preview applies this plan locally so you can test gating. Real purchases go through Google Play.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Preview ${plan.name}`,
              onPress: async () => { useCreditsStore.getState().setTier(plan.tier); await refreshCredits(); navigation.goBack(); },
            },
          ]
        );
      } else {
        Alert.alert('Subscribe', `${plan.name} will be available through Google Play shortly.`);
      }
      return;
    }

    if (!plan.rcPackage) {
      Alert.alert('Unavailable', 'This plan is not available for purchase right now.');
      return;
    }

    setBusy(true);
    try {
      await purchasePackage(plan.rcPackage);
      await billingApi.revenueCatSync();
      await refreshCredits();
      navigation.goBack();
    } catch (err) {
      if (!err?.userCancelled) Alert.alert('Purchase failed', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      await billingApi.revenueCatSync();
      await refreshCredits();
    } catch (err) {
      Alert.alert('Restore failed', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, gap: 12 }}>
          {plans.map((plan) => {
            const current = plan.tier === tier;
            const highlight = plan.highlight;
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
                    {plan.priceString || (plan.price ? `$${plan.price}` : 'Free')}
                    <Text variant="caption" color="ink3">{plan.period}</Text>
                  </Text>
                </View>

                <View style={{ marginTop: 12, gap: 7 }}>
                  {plan.features.map((f) => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Icon name="check" size={15} color={colors.success} strokeWidth={2.4} />
                      <Text variant="bodySm" color="ink2">{f}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => subscribe(plan)}
                  disabled={current || plan.tier === 'free'}
                  style={{
                    marginTop: 14,
                    height: 46,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: current ? colors.surface2 : plan.tier === 'free' ? colors.surface2 : colors.accent,
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

        {REVENUECAT_ANDROID_API_KEY ? (
          <Text
            variant="bodySm"
            color="accent"
            align="center"
            style={{ marginTop: 14, fontFamily: 'Manrope_700Bold' }}
            onPress={busy ? undefined : restore}
          >
            Restore purchases
          </Text>
        ) : null}

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
