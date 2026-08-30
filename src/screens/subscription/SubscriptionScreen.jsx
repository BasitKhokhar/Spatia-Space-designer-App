import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { accent } from '@/theme/colors';
import { useCreditsStore } from '@/store/useCreditsStore';
import { isRemote } from '@/services/api/client';
import { billingApi } from '@/services/api/billingApi';
import { usePlayBilling } from '@/hooks/usePlayBilling';
import {
  displayPriceForPlan,
  tierForPlan,
  periodLabel,
  isLifetimePlan,
  playManageSubscriptionUrl,
  FALLBACK_PLANS,
} from '@/services/billing/playBilling';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SubscriptionScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const refreshCredits = useCreditsStore((s) => s.refresh);
  const storeTier = useCreditsStore((s) => s.tier);

  const [status, setStatus] = useState(null);
  const [active, setActive] = useState(null);
  const [serverPlans, setServerPlans] = useState(null);
  const [loading, setLoading] = useState(isRemote());

  const loadAll = () => {
    if (!isRemote()) return;
    setLoading(true);
    Promise.all([
      billingApi.myStatus().catch((e) => { console.log('[BillingApi] my-status FAILED:', e?.message); return null; }),
      billingApi.myActive().catch((e) => { console.log('[BillingApi] my-active FAILED:', e?.message); return null; }),
      billingApi.plans().catch((e) => { console.log('[BillingApi] plans FAILED:', e?.message); return null; }),
    ]).then(([s, a, p]) => {
      console.log('[BillingApi] my-status payload:', JSON.stringify(s, null, 2));
      console.log('[BillingApi] my-active payload:', JSON.stringify(a, null, 2));
      console.log('[BillingApi] plans payload:', JSON.stringify(p, null, 2));
      setStatus(s);
      setActive(a);
      const list = Array.isArray(p) ? p : p?.plans || p?.data || null;
      console.log('[BillingApi] plans resolved list:', Array.isArray(list) ? `${list.length} plan(s)` : list);
      setServerPlans(list);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const basePlans = useMemo(() => {
    const list = (serverPlans && serverPlans.length ? serverPlans : FALLBACK_PLANS)
      .filter((p) => p.isActive !== false)
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    return list;
  }, [serverPlans]);

  const { storeSubs, storeProducts, busy: billingBusy, purchase, restore } = usePlayBilling({
    plans: basePlans,
    onEntitlementChange: async () => {
      await refreshCredits();
      loadAll();
    },
    onError: (message) => Alert.alert('Purchase', message),
    onSuccess: () => {},
  });

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

  const tier = status?.tier || storeTier || 'free';
  const currentPlan = plans.find((p) => p.code === status?.currentPlanCode) || plans.find((p) => p.tier === tier);
  const isPremiumTier = isRemote() && tier !== 'free';
  const lifetime = currentPlan ? isLifetimePlan(currentPlan) : false;
  const autoRenewing = active?.playStoreAutoRenewing === true;
  const expiryLabel = formatDate(status?.subscriptionExpiry);
  const isGooglePurchase = active?.paymentProvider === 'GOOGLE_PLAY';

  const busy = billingBusy;

  const copyLicenseKey = async () => {
    if (!status?.licenseKey) return;
    await Clipboard.setStringAsync(status.licenseKey);
    Alert.alert('Copied', 'Your licence key is on the clipboard.');
  };

  const manageOnPlay = () => {
    const sku = active?.plan?.playStoreProductId || currentPlan?.playStoreProductId;
    Linking.openURL(playManageSubscriptionUrl(sku));
  };

  const subscribe = async (plan) => {
    if (plan.tier === 'free' || plan.tier === tier) return;

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
    <Screen edges={['top', 'bottom']}>
      <HeaderBar title="Subscription" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {isPremiumTier ? (
              <LinearGradient
                colors={[accent.a400, accent.a700]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[{ borderRadius: radius.xl, padding: 20, marginTop: 16 }, shadows.e3]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="gem" size={18} color="#fff" strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 }}>
                        YOUR PLAN
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Sora_800ExtraBold' }}>
                        {currentPlan?.name || status?.currentPlanCode || 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.5 }}>ACTIVE</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 16 }} />

                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'Manrope_600SemiBold' }}>
                  {lifetime
                    ? 'Lifetime access — never expires'
                    : expiryLabel
                      ? `${autoRenewing ? 'Renews' : 'Expires'} on ${expiryLabel}`
                      : 'Active subscription'}
                </Text>

                {status?.licenseKey ? (
                  <Pressable
                    onPress={copyLicenseKey}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}
                  >
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5, fontFamily: 'Manrope_700Bold', letterSpacing: 0.4 }}>LICENCE KEY</Text>
                      <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: 2 }}>{status.licenseKey}</Text>
                    </View>
                    <Icon name="duplicate" size={16} color="#fff" strokeWidth={2} />
                  </Pressable>
                ) : null}

                {isGooglePurchase && !lifetime ? (
                  <Pressable
                    onPress={manageOnPlay}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 13.5, fontFamily: 'Manrope_700Bold' }}>Manage on Google Play</Text>
                    <Icon name="arrow-right" size={15} color="#fff" strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </LinearGradient>
            ) : (
              <View
                style={{
                  marginTop: 16, borderRadius: radius.xl, padding: 20,
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="gem" size={18} color={colors.accent} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.5 }} color="ink3">
                      YOUR PLAN
                    </Text>
                    <Text style={{ fontSize: 20, fontFamily: 'Sora_800ExtraBold' }}>Free</Text>
                  </View>
                </View>
                <Text variant="bodySm" color="ink2" style={{ marginTop: 14 }}>
                  Upgrade to unlock the full item library, remove ads, and get unlimited downloads.
                </Text>
              </View>
            )}

            <Text variant="title" style={{ marginTop: 28, marginBottom: 4 }}>Available Plans</Text>
            <Text variant="bodySm" color="ink3" style={{ marginBottom: 14 }}>
              Live pricing from Google Play.
            </Text>

            <View style={{ gap: 12 }}>
              {plans.map((plan) => {
                const isCurrent = plan.tier === tier && (plan.tier !== 'free' || tier === 'free');
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
                      disabled={isCurrent || plan.tier === 'free' || busy}
                      style={{
                        marginTop: 14,
                        height: 46,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: busy && !isCurrent ? 0.6 : 1,
                        backgroundColor: isCurrent || plan.tier === 'free' ? colors.surface2 : colors.accent,
                      }}
                    >
                      <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14.5, color: isCurrent || plan.tier === 'free' ? colors.ink3 : '#fff' }}>
                        {isCurrent ? 'Current plan' : plan.tier === 'free' ? 'Included' : `Get ${plan.name}`}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Text
              variant="bodySm"
              color="accent"
              align="center"
              style={{ marginTop: 20, fontFamily: 'Manrope_700Bold' }}
              onPress={busy ? undefined : onRestore}
            >
              Restore purchases
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
