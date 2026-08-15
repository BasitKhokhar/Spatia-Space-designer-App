import { request } from './client';

// Subscriptions / Google Play billing, purchased via RevenueCat
// (src/services/billing/revenueCat.js) on the client.
export const billingApi = {
  plans: () => request('/billing/plans'),

  myActive: () => request('/billing/subscriptions/my-active'),

  myStatus: () => request('/billing/my-status'),

  // Called right after a RevenueCat purchase/restore completes, so the
  // entitlement snapshot updates immediately instead of waiting on the
  // RevenueCat webhook to land.
  revenueCatSync: () => request('/billing/revenuecat/sync', { method: 'POST' }),
};
