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
    const price = extractProductPricing(product).displayPrice;
    console.log('[PlayBilling] price for', plan?.code, sku, '(in-app) ->', price, price ? 'LIVE' : 'DB fallback');
    return price;
  }

  const storeSub = storeSubs.find((s) => s.id === sku);
  if (!storeSub) {
    console.log('[PlayBilling] price for', plan?.code, sku, '-> no matching store sub, DB fallback used');
    return null;
  }
  const cycle = getPlanBasePlanId(plan.playStoreProductId) || 'monthly';
  const price = extractOfferPricing(findOfferInSub(storeSub, cycle), cycle).displayPrice;
  console.log('[PlayBilling] price for', plan?.code, sku, 'cycle', cycle, '->', price, price ? 'LIVE' : 'DB fallback');
  return price;
}

// ISO-8601 billing period -> a stable cycle key, human label and month count.
// Play Console base plans aren't required to be *named* "monthly"/"yearly", so
// cycles are derived from the pricing phase's billingPeriod rather than the
// offer/basePlan id — that works for whatever cadence is actually configured.
const CYCLE_BY_PERIOD = {
  P1W: { cycle: 'weekly', label: 'Weekly', months: 0.25 },
  P1M: { cycle: 'monthly', label: 'Monthly', months: 1 },
  P3M: { cycle: 'quarterly', label: '3 Months', months: 3 },
  P6M: { cycle: 'semiannual', label: '6 Months', months: 6 },
  P1Y: { cycle: 'yearly', label: 'Yearly', months: 12 },
};

function cycleInfoForPeriod(period) {
  return CYCLE_BY_PERIOD[period] || { cycle: 'monthly', label: 'Monthly', months: 1 };
}

/**
 * Every purchasable cycle Google Play actually has configured for a plan's
 * subscription, each with its own live price — the source of truth for what
 * to display, so a plan the store doesn't (yet) offer a base plan for simply
 * yields no cycles rather than a guessed one. Cheapest cycle first.
 */
export function getPlanOffers(plan, storeSubs = []) {
  if (!plan || isLifetimePlan(plan)) return [];
  const sku = getPlaySku(plan.playStoreProductId);
  if (!sku) return [];
  const storeSub = storeSubs.find((s) => s.id === sku);
  if (!storeSub) return [];

  const offers = storeSub.subscriptionOffers || storeSub.subscriptionOfferDetailsAndroid || [];
  return offers
    .map((offer) => {
      const { priceAmount, priceCurrency, billingPeriod, displayPrice } = extractOfferPricing(offer);
      if (priceAmount == null) return null;
      const { cycle, label, months } = cycleInfoForPeriod(billingPeriod || 'P1M');
      return {
        cycle,
        label,
        months,
        billingPeriod,
        offerToken: offer.offerToken || offer.offerTokenAndroid || null,
        priceAmount,
        priceCurrency,
        displayPrice,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.months - b.months);
}

// Percent cheaper per billing cycle vs. paying the shortest (monthly) cycle
// that many times over — e.g. a yearly offer at 12x the monthly price saves 0%.
export function savingsPercent(offers, offer) {
  const baseline = offers.find((o) => o.cycle === 'monthly') || offers[0];
  if (!baseline || !offer || offer.months <= baseline.months) return 0;
  if (baseline.priceAmount == null || offer.priceAmount == null) return 0;
  const costAtBaselineRate = baseline.priceAmount * (offer.months / baseline.months);
  if (costAtBaselineRate <= 0) return 0;
  return Math.round(((costAtBaselineRate - offer.priceAmount) / costAtBaselineRate) * 100);
}

// Play's formattedPrice is a full localized string ("$47.94", "PKR 1,200.00")
// with the currency symbol embedded — pull just the symbol back out so a
// per-month figure we compute ourselves (Play never returns one for a multi-
// month cycle) can be formatted the same way.
function currencySymbolFromFormatted(formatted) {
  if (!formatted) return null;
  const symbol = String(formatted).replace(/[0-9.,\s ]/g, '');
  return symbol || null;
}

// The per-month equivalent of a multi-month offer ("$47.94 every 6 months" ->
// "$7.99"), so cycles of different lengths are comparable at a glance. Falls
// back to the offer's own total for a monthly (or unrecognised) cycle.
export function perMonthDisplayPrice(offer) {
  if (!offer || offer.priceAmount == null || !offer.months || offer.months <= 1) {
    return offer?.displayPrice ?? null;
  }
  const perMonth = offer.priceAmount / offer.months;
  const symbol = currencySymbolFromFormatted(offer.displayPrice);
  const amount = perMonth.toFixed(2);
  if (!symbol) return amount;
  return offer.displayPrice.trim().endsWith(symbol) ? `${amount} ${symbol}` : `${symbol}${amount}`;
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
