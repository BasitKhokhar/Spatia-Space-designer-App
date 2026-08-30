import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useIAP,
  fetchProducts as fetchProductsAsync,
  getAvailablePurchases as getAvailablePurchasesAsync,
  finishTransaction as finishTransactionAsync,
  ErrorCode,
} from 'expo-iap';

import { billingApi } from '@/services/api/billingApi';
import {
  getPlaySku,
  getPlanBasePlanId,
  isLifetimePlan,
  findOfferInSub,
  extractOfferPricing,
  extractProductPricing,
} from '@/services/billing/playBilling';

// ---------------------------------------------------------------------------
// Google Play purchase flow.
//
// The one rule that matters: we acknowledge a purchase with Google (via
// finishTransaction) only AFTER our backend has verified and recorded it. If
// verification fails we deliberately leave it unacknowledged — Google then
// auto-refunds after three days, which is the right outcome for money we
// couldn't attribute to an account.
//
// Entitlement is never decided here. The backend writes it and the app reads
// it back through onEntitlementChange → useCreditsStore.refresh().
// ---------------------------------------------------------------------------

function friendlyMessage(error) {
  const code = error?.code;
  if (code === 'item-unavailable' || code === ErrorCode?.ItemUnavailable) {
    return "This plan isn't available on Google Play yet. Please try again shortly.";
  }
  if (code === 'item-already-owned' || code === ErrorCode?.ItemAlreadyOwned) {
    return "You already own this subscription — try 'Restore purchases'.";
  }
  if (code === 'network-error' || code === ErrorCode?.NetworkError) {
    return 'No connection to Google Play. Check your network and try again.';
  }
  return error?.message || 'Purchase failed. Please try again.';
}

function isUserCancellation(error) {
  return error?.code === ErrorCode?.UserCancelled || error?.code === 'user-cancelled';
}

/**
 * @param {object}   options
 * @param {Array}    options.plans              plans from the backend, used to map a Play
 *                                              productId back to one of ours
 * @param {Function} options.onEntitlementChange called after the backend confirms a change
 * @param {Function} [options.onError]           surface a message to the user
 * @param {Function} [options.onSuccess]         called with the plan that was purchased
 */
export function usePlayBilling({ plans = [], onEntitlementChange, onError, onSuccess } = {}) {
  const [busy, setBusy] = useState(false);
  // Live purchase context captured at request time. The purchase callback
  // fires asynchronously and doesn't carry the price/period the user actually
  // saw, so we stash it here and read it back when the purchase lands.
  const pendingRef = useRef(null);

  const planForProductId = useCallback(
    (productId) => plans.find((p) => getPlaySku(p.playStoreProductId) === productId) || null,
    [plans]
  );

  // Send one purchase to the backend for verification, then acknowledge it.
  // Returns true when the purchase was accepted and recorded.
  const verifyAndFinish = useCallback(
    async (purchase, finishTransaction) => {
      const pending = pendingRef.current || {};
      const plan = pending.plan || planForProductId(purchase.productId);
      const lifetime = pending.isLifetime ?? isLifetimePlan(plan);

      // Real purchase time from Play, so the backend's dates match the actual
      // transaction rather than whenever our request happened to arrive.
      const purchaseTimeMillis =
        purchase.transactionDate || purchase.purchaseTime || purchase.transactionDateAndroid || null;

      if (lifetime) {
        await billingApi.verifyLifetime({
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          priceAmount: pending.priceAmount ?? null,
          priceCurrency: pending.priceCurrency ?? null,
          purchaseTimeMillis,
        });
      } else {
        await billingApi.verifySubscription({
          subscriptionId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          basePlanId: pending.basePlanId || getPlanBasePlanId(plan?.playStoreProductId) || 'monthly',
          priceAmount: pending.priceAmount ?? null,
          priceCurrency: pending.priceCurrency ?? null,
          billingPeriod: pending.billingPeriod ?? null,
          purchaseTimeMillis,
        });
      }

      // Verified and recorded — safe to acknowledge. Subscriptions and
      // lifetime unlocks are both non-consumable.
      await finishTransaction({ purchase, isConsumable: false });
      return plan;
    },
    [planForProductId]
  );

  // Holds the latest finishTransaction so the purchase callbacks can reach it
  // without closing over `iap` itself — expo-iap may deliver a purchase left
  // pending by a previous session while useIAP is still initialising, and
  // touching `iap` there would hit the temporal dead zone and throw. That is
  // the one case we must never break: the user has already paid. Seeded with
  // the module-level export so it is callable even on that first pass, before
  // the hook's own wrapper exists.
  const finishRef = useRef(finishTransactionAsync);

  const iap = useIAP({
    onError: (error) => {
      // Non-fatal store errors (a failed product query, a restore hiccup).
      console.warn('[PlayBilling] store error:', error?.code, error?.message);
    },
    onPurchaseSuccess: async (purchase) => {
      setBusy(true);
      try {
        const plan = await verifyAndFinish(purchase, finishRef.current);
        await onEntitlementChange?.();
        onSuccess?.(plan);
      } catch (err) {
        // Left unacknowledged on purpose — see the note at the top.
        console.error('[PlayBilling] verification failed:', err);
        onError?.(
          err?.code === 'DUPLICATE_CLAIM'
            ? 'This purchase is already linked to another account.'
            : 'We could not verify your purchase. It has not been charged to your account — please contact support if this persists.'
        );
      } finally {
        pendingRef.current = null;
        setBusy(false);
      }
    },
    onPurchaseError: (error) => {
      setBusy(false);
      pendingRef.current = null;
      if (isUserCancellation(error)) return; // backing out is not an error
      console.warn('[PlayBilling] purchase error:', error?.code, error?.message);
      onError?.(friendlyMessage(error));
    },
  });

  const { connected, subscriptions, products, requestPurchase, finishTransaction, reconnect } = iap;
  finishRef.current = finishTransaction;

  useEffect(() => {
    console.log('[PlayBilling] connected:', connected,
      '| subs:', subscriptions.map((s) => ({ id: s.id, offers: (s.subscriptionOffers || s.subscriptionOfferDetailsAndroid || []).length })),
      '| products:', products.map((p) => ({ id: p.id, price: p.displayPrice || p.localizedPrice })));
  }, [connected, subscriptions, products]);

  /**
   * Launch the Play billing sheet for a plan. `cycle` picks the base plan when
   * a subscription offers several; it defaults to whatever the plan's
   * playStoreProductId pins it to.
   */
  const purchase = useCallback(
    async (plan, cycle) => {
      const sku = getPlaySku(plan?.playStoreProductId);
      if (!sku) {
        onError?.('This plan is not available for purchase.');
        return;
      }

      setBusy(true);
      try {
        if (!connected) await reconnect();

        const lifetime = isLifetimePlan(plan);
        const chosenCycle = cycle || getPlanBasePlanId(plan.playStoreProductId) || 'monthly';

        if (lifetime) {
          let storeProduct = products.find((p) => p.id === sku);
          try {
            const fetched = await fetchProductsAsync({ skus: [sku], type: 'in-app' });
            if (Array.isArray(fetched) && fetched.length) {
              storeProduct = fetched.find((p) => p.id === sku) || fetched[0];
            }
          } catch (e) {
            console.warn('[PlayBilling] in-app fetch failed:', e?.code, e?.message);
          }
          if (!storeProduct) throw new Error(`"${sku}" isn't available on Google Play yet.`);

          const pricing = extractProductPricing(storeProduct);
          pendingRef.current = { isLifetime: true, plan, ...pricing };

          await requestPurchase({
            type: 'in-app',
            request: { google: { skus: [sku] }, apple: { sku } },
          });
          return;
        }

        // Always re-query subscriptions rather than trusting the hook's cached
        // state: offer tokens are short-lived, and a stale one is the usual
        // cause of "failed to query product" at purchase time.
        let storeSub = subscriptions.find((s) => s.id === sku);
        try {
          const fetched = await fetchProductsAsync({ skus: [sku], type: 'subs' });
          if (Array.isArray(fetched) && fetched.length) {
            storeSub = fetched.find((s) => s.id === sku) || fetched[0];
          }
        } catch (e) {
          console.warn('[PlayBilling] subs fetch failed:', e?.code, e?.message);
        }

        if (!storeSub) {
          throw new Error(
            `This subscription isn't available on Google Play yet (product "${sku}"). ` +
            'Check that it and its base plans are Active in Play Console, that your account is a licensed tester, ' +
            'and that you installed the app from the testing track rather than sideloading it.'
          );
        }

        const offer = findOfferInSub(storeSub, chosenCycle);
        const offerToken = offer?.offerToken || offer?.offerTokenAndroid || null;
        if (Platform.OS === 'android' && !offerToken) {
          throw new Error(`No purchasable offer found for the "${chosenCycle}" base plan.`);
        }

        pendingRef.current = { isLifetime: false, plan, ...extractOfferPricing(offer, chosenCycle) };

        if (Platform.OS === 'ios') {
          await requestPurchase({ type: 'subs', request: { apple: { sku } } });
        } else {
          await requestPurchase({
            type: 'subs',
            request: { google: { skus: [sku], subscriptionOffers: [{ sku, offerToken }] } },
          });
        }
        // busy is cleared by onPurchaseSuccess / onPurchaseError.
      } catch (err) {
        setBusy(false);
        pendingRef.current = null;
        if (!isUserCancellation(err)) onError?.(err?.message || 'Could not start the purchase.');
      }
    },
    [connected, reconnect, products, subscriptions, requestPurchase, onError]
  );

  /**
   * Re-verify everything this Google account already owns. Used after a
   * reinstall or on a new device, and as the user-facing "I paid but the app
   * doesn't know" escape hatch.
   */
  const restore = useCallback(async () => {
    setBusy(true);
    let restored = 0;
    try {
      if (!connected) await reconnect();
      const purchases = (await getAvailablePurchasesAsync()) || [];

      for (const purchase of purchases) {
        // Each purchase is verified independently — one failure (a product
        // we no longer sell, say) must not abort the rest.
        try {
          const plan = planForProductId(purchase.productId);
          pendingRef.current = {
            plan,
            isLifetime: isLifetimePlan(plan),
            basePlanId: getPlanBasePlanId(plan?.playStoreProductId),
          };
          await verifyAndFinish(purchase, finishRef.current);
          restored += 1;
        } catch (err) {
          console.warn('[PlayBilling] restore: could not verify', purchase?.productId, err?.message);
        } finally {
          pendingRef.current = null;
        }
      }

      await onEntitlementChange?.();
      return restored;
    } catch (err) {
      onError?.(err?.message || 'Could not restore purchases.');
      return 0;
    } finally {
      setBusy(false);
    }
  }, [connected, reconnect, planForProductId, verifyAndFinish, onEntitlementChange, onError]);

  return {
    connected,
    storeSubs: subscriptions,
    storeProducts: products,
    busy,
    purchase,
    restore,
  };
}
