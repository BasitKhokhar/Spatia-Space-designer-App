import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import SubscriptionSkeleton from '@/components/subscription/SubscriptionSkeleton';
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
  getPlanOffers,
  savingsPercent,
  perMonthDisplayPrice,
  FALLBACK_PLANS,
} from '@/services/billing/playBilling';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Human-friendly countdown to a date — "12 days left" / "4 hours left" /
// "30 minutes left" — so the active-plan card reads like a live subscription
// status rather than a static date.
function getRemainingLabel(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return 'Expired';

  const DAY = 1000 * 60 * 60 * 24;
  const HOUR = 1000 * 60 * 60;
  const MIN = 1000 * 60;
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  const minutes = Math.floor((diff % HOUR) / MIN);

  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'} left`;
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
  return `${Math.max(minutes, 1)} ${minutes === 1 ? 'minute' : 'minutes'} left`;
}

export default function SubscriptionScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const refreshCredits = useCreditsStore((s) => s.refresh);
  const storeTier = useCreditsStore((s) => s.tier);

  const [status, setStatus] = useState(null);
  const [active, setActive] = useState(null);
  const [serverPlans, setServerPlans] = useState(null);
  const [loading, setLoading] = useState(isRemote());
  // Chosen billing cycle per plan code, for plans whose Play Console
  // subscription offers more than one (e.g. monthly vs. yearly).
  const [selectedCycles, setSelectedCycles] = useState({});
  // Celebration overlay shown right after a purchase verifies successfully.
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successPlanName, setSuccessPlanName] = useState(null);
  // Bumped every 30s purely to force the "X days/hours left" countdown to
  // re-render while this screen stays open.
  const [, setNowTick] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(id);
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
    onEntitlementChange: async () => {
      await refreshCredits();
      loadAll();
    },
    onError: (message) => Alert.alert('Purchase', message),
    onSuccess: (plan) => {
      setSuccessPlanName(plan?.name || 'Premium');
      setShowSuccessOverlay(true);
    },
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
  const remainingLabel = !lifetime ? getRemainingLabel(status?.subscriptionExpiry) : null;
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

  const subscribe = async (plan, cycle) => {
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

    await purchase(plan, cycle);
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
          <SubscriptionSkeleton />
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
                {!lifetime && remainingLabel ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_600SemiBold' }}>
                      {remainingLabel}
                    </Text>
                  </View>
                ) : null}

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

            <View style={{ gap: 16 }}>
              {plans.map((plan) => {
                const isFree = plan.tier === 'free';
                const isCurrent = plan.tier === tier && (plan.tier !== 'free' || tier === 'free');
                const highlight = plan.code === 'BASIC';

                // Live billing cycles Play Console actually has configured for
                // this plan's subscription (e.g. monthly + yearly). Empty
                // when the store hasn't returned that product yet.
                const offers = isFree ? [] : getPlanOffers(plan, storeSubs);
                const selectedCycle = selectedCycles[plan.code] || offers[0]?.cycle || 'monthly';
                const selectedOffer = offers.find((o) => o.cycle === selectedCycle) || offers[0] || null;

                // Until Play returns live offers, fall back to the DB's single
                // monthly price/period — same figure the app has always shown.
                const fallbackOffer = {
                  cycle: 'monthly',
                  label: 'Monthly',
                  months: plan.durationDays ? Math.max(1, Math.round(plan.durationDays / 30)) : 1,
                  priceAmount: plan.price ?? null,
                  displayPrice: plan.displayPrice || (plan.price ? `$${plan.price}` : 'Free'),
                };
                const activeOffer = isFree ? null : (selectedOffer || fallbackOffer);

                // Big headline price is always the per-month equivalent, so a
                // monthly, 6-month and yearly cycle are directly comparable —
                // the actual total for the cycle is spelled out just below.
                const perMonth = activeOffer ? perMonthDisplayPrice(activeOffer) : null;
                const showTotalLine = activeOffer && activeOffer.months > 1;
                const savePct = activeOffer && offers.length > 1 ? savingsPercent(offers, activeOffer) : 0;

                const planIconName = plan.tier === 'premium' ? 'gem' : plan.tier === 'basic' ? 'shield' : 'star';

                return (
                  <View
                    key={plan.code}
                    style={[
                      {
                        borderRadius: radius.xl,
                        overflow: 'hidden',
                        backgroundColor: colors.surface,
                        borderWidth: highlight ? 2 : 1,
                        borderColor: highlight ? colors.accent : colors.lineSoft,
                      },
                      highlight ? shadows.accent : shadows.e2,
                    ]}
                  >
                    {highlight ? (
                      <LinearGradient
                        colors={[accent.a400, accent.a700]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 7, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.6 }}>
                          MOST POPULAR
                        </Text>
                      </LinearGradient>
                    ) : null}

                    <View style={{ padding: 18 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: highlight ? colors.accentSoft : colors.surface2,
                          }}
                        >
                          <Icon name={planIconName} size={19} color={colors.accent} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="title">{plan.name}</Text>
                          {plan.description ? (
                            <Text variant="bodySm" color="ink3" numberOfLines={2}>{plan.description}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 18 }}>
                        <Text style={{ fontSize: 32, fontFamily: 'Sora_800ExtraBold', color: colors.ink, lineHeight: 36 }}>
                          {isFree ? 'Free' : perMonth}
                        </Text>
                        {!isFree ? (
                          <Text variant="bodySm" color="ink3" style={{ marginBottom: 6 }}>/mo</Text>
                        ) : null}
                      </View>

                      {showTotalLine ? (
                        <Text variant="caption" color="ink3" style={{ marginTop: 3 }}>
                          {`Billed ${activeOffer.displayPrice} every ${activeOffer.label.toLowerCase()}`}
                          {savePct > 0 ? ` · Save ${savePct}%` : ''}
                        </Text>
                      ) : null}

                      {offers.length > 1 ? (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                          {offers.map((offer) => {
                            const isActiveCycle = offer.cycle === selectedCycle;
                            const offerSavePct = savingsPercent(offers, offer);
                            return (
                              <Pressable
                                key={offer.cycle}
                                onPress={() => setSelectedCycles((prev) => ({ ...prev, [plan.code]: offer.cycle }))}
                                style={{
                                  flex: 1,
                                  alignItems: 'center',
                                  paddingVertical: 8,
                                  borderRadius: radius.md,
                                  borderWidth: 1.5,
                                  borderColor: isActiveCycle ? colors.accent : colors.lineSoft,
                                  backgroundColor: isActiveCycle ? colors.accent : 'transparent',
                                }}
                              >
                                {offerSavePct > 0 ? (
                                  <Text style={{ fontSize: 9.5, fontFamily: 'Manrope_800ExtraBold', color: isActiveCycle ? '#fff' : colors.success, marginBottom: 1 }}>
                                    SAVE {offerSavePct}%
                                  </Text>
                                ) : null}
                                <Text style={{ fontSize: 12.5, fontFamily: 'Manrope_700Bold', color: isActiveCycle ? '#fff' : colors.ink2 }}>
                                  {offer.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}

                      <View style={{ height: 1, backgroundColor: colors.lineSoft, marginVertical: 16 }} />

                      <View style={{ gap: 10 }}>
                        {plan.featureList.map((f) => (
                          <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="check" size={12} color={colors.accent} strokeWidth={2.8} />
                            </View>
                            <Text variant="bodySm" color="ink2" style={{ flex: 1 }}>{f}</Text>
                          </View>
                        ))}
                      </View>

                      {isCurrent || isFree ? (
                        <View
                          style={{
                            marginTop: 18, height: 48, borderRadius: radius.md,
                            alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2,
                          }}
                        >
                          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14.5, color: colors.ink3 }}>
                            {isCurrent ? 'Current plan' : 'Included'}
                          </Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => subscribe(plan, selectedOffer?.cycle)} disabled={busy} style={{ marginTop: 18 }}>
                          <LinearGradient
                            colors={[accent.a400, accent.a700]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
                          >
                            <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14.5 }}>
                              Get {plan.name}
                            </Text>
                          </LinearGradient>
                        </Pressable>
                      )}
                    </View>
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

      {busy ? (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <View
            style={[
              { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 28, alignItems: 'center', minWidth: 200 },
              shadows.e3,
            ]}
          >
            <ActivityIndicator color={colors.accent} size="large" />
            <Text variant="bodySm" style={{ marginTop: 14, fontFamily: 'Manrope_700Bold' }}>
              Processing your purchase…
            </Text>
            <Text variant="caption" color="ink3" align="center" style={{ marginTop: 4 }}>
              Confirming with Google Play. This only takes a moment.
            </Text>
          </View>
        </View>
      ) : null}

      {showSuccessOverlay ? (
        <View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60,
          }}
        >
          <LinearGradient
            colors={[accent.a400, accent.a700]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
          >
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <Icon name="gem" size={38} color="#fff" strokeWidth={1.8} />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'Sora_800ExtraBold', textAlign: 'center' }}>
              {successPlanName ? `${successPlanName} Activated!` : 'Plan Activated!'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14.5, fontFamily: 'Manrope_600SemiBold', textAlign: 'center', marginTop: 12, lineHeight: 21 }}>
              {`Congratulations! Your "${successPlanName || 'Premium'}" plan is now active. All its features are unlocked.`}
            </Text>

            <Pressable
              onPress={() => setShowSuccessOverlay(false)}
              style={{ marginTop: 30, height: 50, minWidth: 200, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
            >
              <Text style={{ color: accent.a700, fontSize: 15, fontFamily: 'Manrope_800ExtraBold' }}>Awesome, thanks!</Text>
            </Pressable>
          </LinearGradient>
        </View>
      ) : null}
    </Screen>
  );
}
