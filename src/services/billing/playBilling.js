import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Pure helpers for reading Google Play's product/offer shapes. No React, no
// side effects — the stateful side lives in src/hooks/usePlayBilling.js.
//
// expo-iap normalises most fields but still surfaces both the standardised
// names (`subscriptionOffers`, `pricingPhases`) and the platform-suffixed ones
// (`subscriptionOfferDetailsAndroid`, `pricingPhasesAndroid.pricingPhaseList`)
// depending on version and platform, so every read here checks both.
// ---------------------------------------------------------------------------

// Plans store the Play id as "productId:basePlanId"; the store itself only
// knows the bare product id.
export function getPlaySku(playStoreProductId) {
  if (!playStoreProductId) return null;
  return String(playStoreProductId).split(':')[0];
}

// The base plan the DB row is pinned to, when it names one.
export function getPlanBasePlanId(playStoreProductId) {
  if (!playStoreProductId) return null;
  const parts = String(playStoreProductId).split(':');
  return parts.length > 1 ? parts[1] : null;
}

// Tolerant of the several shapes a plan's isLifetime can arrive in (JSON bool,
// MySQL tinyint, string) plus the naming convention as a last resort.
export function isLifetimePlan(plan) {
  if (!plan) return false;
  return (
    plan.isLifetime === true ||
    plan.isLifetime === 1 ||
    plan.isLifetime === 'true' ||
    plan.isLifetime === '1' ||
    Boolean(plan.code && String(plan.code).toLowerCase().includes('lifetime'))
  );
}

export function billingPeriodForCycle(cycle) {
  if (cycle === 'yearly') return 'P1Y';
  if (cycle === 'semiannual') return 'P6M';
  if (cycle === 'weekly') return 'P1W';
  return 'P1M';
}

/**
 * Find the offer inside a Play subscription that corresponds to a base plan.
 * Matches on id, tags, or billing period, and falls back to the first offer —
 * a subscription with exactly one base plan is the common case and shouldn't
 * fail to resolve just because the naming doesn't line up.
 */
export function findOfferInSub(storeSub, cycle) {
  if (!storeSub) return null;
  const offers = storeSub.subscriptionOffers || storeSub.subscriptionOfferDetailsAndroid || [];
  if (offers.length === 0) return null;

  const period = billingPeriodForCycle(cycle);
  const match = offers.find((o) =>
    o.basePlanId === cycle ||
    o.basePlanIdAndroid === cycle ||
    o.id === cycle ||
    o.offerTags?.includes(cycle) ||
    o.offerTagsAndroid?.includes(cycle) ||
    o.pricingPhases?.[0]?.billingPeriod === period ||
    o.pricingPhasesAndroid?.pricingPhaseList?.[0]?.billingPeriod === period
  );
  return match || offers[0];
}

// Google Play requires an offerToken to purchase a subscription; without one
// the billing sheet can't be launched.
export function resolveOfferToken(storeSub, cycle) {
  const offer = findOfferInSub(storeSub, cycle);
  return offer?.offerToken || offer?.offerTokenAndroid || null;
}

function firstPricingPhase(offer) {
  return offer?.pricingPhases?.[0] || offer?.pricingPhasesAndroid?.pricingPhaseList?.[0] || null;
}

/**
 * Live price and billing period for a subscription offer, as the user is
 * actually being charged — local currency, local price, real base plan. The
 * backend records these rather than the static DB price.
 */
export function extractOfferPricing(offer, fallbackCycle) {
  const phase = firstPricingPhase(offer);
  let priceAmount = null;
  let priceCurrency = null;

  if (phase) {
    // Play reports prices in micros: 4990000 micros = 4.99.
    const micros = parseInt(phase.priceAmountMicros, 10);
    if (Number.isFinite(micros) && micros > 0) priceAmount = micros / 1_000_000;
    priceCurrency = phase.priceCurrencyCode || phase.currencyCode || null;
  }

  return {
    priceAmount,
    priceCurrency,
    billingPeriod: phase?.billingPeriod || phase?.billingPeriodAndroid || null,
    basePlanId: offer?.basePlanId || offer?.basePlanIdAndroid || fallbackCycle || null,
    displayPrice: phase?.formattedPrice || phase?.displayPrice || null,
  };
}

// Same idea for a one-time (lifetime) in-app product, which has no offers.
export function extractProductPricing(storeProduct) {
  if (!storeProduct) return { priceAmount: null, priceCurrency: null, displayPrice: null };

  let priceAmount = null;
  const micros = parseInt(storeProduct.priceAmountMicros, 10);
  if (Number.isFinite(micros) && micros > 0) priceAmount = micros / 1_000_000;
  if (priceAmount == null && typeof storeProduct.price === 'number') priceAmount = storeProduct.price;

  return {
    priceAmount,
    priceCurrency: storeProduct.currency || storeProduct.priceCurrencyCode || null,
    displayPrice: storeProduct.displayPrice || storeProduct.localizedPrice || null,
  };
}

/**
 * The store's own formatted price for a plan ("PKR 1,200.00"), so the paywall
 * shows exactly what Play will charge in the user's currency rather than the
 * USD figure held in our database.
 */
export function displayPriceForPlan(plan, { storeSubs = [], storeProducts = [] } = {}) {
  const sku = getPlaySku(plan?.playStoreProductId);
  if (!sku) return null;

  if (isLifetimePlan(plan)) {
    const product = storeProducts.find((p) => p.id === sku);
    return extractProductPricing(product).displayPrice;
  }

  const storeSub = storeSubs.find((s) => s.id === sku);
  if (!storeSub) return null;
  const cycle = getPlanBasePlanId(plan.playStoreProductId) || 'monthly';
  return extractOfferPricing(findOfferInSub(storeSub, cycle), cycle).displayPrice;
}

// Mirrors the backend's tier derivation (routes/billingRoutes.js#my-status) so
// a plan's "Current plan" badge lands on the right card wherever plans are
// listed (paywall, subscription screen).
export function tierForPlan(plan) {
  if (plan?.isUnlimited) return 'premium';
  if (plan?.unlocksAllPremium) return 'basic';
  return 'free';
}

export function periodLabel(plan) {
  if (isLifetimePlan(plan)) return '';
  if (!plan?.durationDays) return '';
  if (plan.durationDays >= 360) return '/yr';
  if (plan.durationDays >= 175) return '/6mo';
  return '/mo';
}

// Offline/first-paint fallback only. When a backend is attached the ladder is
// whatever /billing/plans returns, so pricing and copy can change from the
// admin dashboard without shipping an app update.
export const FALLBACK_PLANS = [
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

// Deep link into Google Play's own subscription-management page for one SKU,
// so cancelling/changing a plan goes through Play itself rather than the app
// trying to reimplement it.
export function playManageSubscriptionUrl(playStoreProductId) {
  const sku = getPlaySku(playStoreProductId);
  const pkg = Constants.expoConfig?.android?.package;
  if (!pkg) return 'https://play.google.com/store/account/subscriptions';
  const base = `https://play.google.com/store/account/subscriptions?package=${pkg}`;
  return sku ? `${base}&sku=${sku}` : base;
}
