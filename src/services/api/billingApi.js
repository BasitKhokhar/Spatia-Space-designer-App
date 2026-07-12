import { request } from './client';

// Subscriptions / Google Play billing. `verifySubscription` / `verifyLifetime`
// are called right after a Play purchase to activate the entitlement server-side.
export const billingApi = {
  plans: () => request('/billing/plans'),

  myActive: () => request('/billing/subscriptions/my-active'),

  myStatus: () => request('/billing/my-status'),

  // Recurring subscription (product + base plan chosen in Play Billing).
  verifySubscription: ({ purchaseToken, subscriptionId, basePlanId, priceAmount, priceCurrency, purchaseTimeMillis, billingPeriod }) =>
    request('/billing/verify-subscription', {
      method: 'POST',
      body: { purchaseToken, subscriptionId, basePlanId, priceAmount, priceCurrency, purchaseTimeMillis, billingPeriod },
    }),

  // One-time product (e.g. credit pack / lifetime).
  verifyLifetime: ({ purchaseToken, productId, priceAmount, priceCurrency, purchaseTimeMillis }) =>
    request('/billing/verify-lifetime', {
      method: 'POST',
      body: { purchaseToken, productId, priceAmount, priceCurrency, purchaseTimeMillis },
    }),

  // Simple one-shot verify (productId + token + orderId).
  verifyPlayPurchase: ({ productId, purchaseToken, orderId }) =>
    request('/billing/verify-play-purchase', {
      method: 'POST',
      body: { productId, purchaseToken, orderId },
    }),
};
