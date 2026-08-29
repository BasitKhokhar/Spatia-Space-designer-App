import { request } from './client';

// Subscriptions purchased directly through Google Play Billing
// (src/hooks/usePlayBilling.js). The backend re-verifies every purchase token
// with the Android Publisher API before granting anything — these endpoints
// are the only way the app's entitlement ever changes.
export const billingApi = {
  // Live plans, so pricing and features can change without an app release.
  plans: () => request('/billing/plans'),

  myActive: () => request('/billing/subscriptions/my-active'),

  // Entitlement snapshot + the subscription's licence key.
  myStatus: () => request('/billing/my-status'),

  // Called the moment a Play purchase completes. The app acknowledges the
  // purchase with Google only after this resolves successfully.
  verifySubscription: (body) => request('/billing/verify-subscription', { method: 'POST', body }),

  // Same, for a one-time (lifetime) in-app product.
  verifyLifetime: (body) => request('/billing/verify-lifetime', { method: 'POST', body }),
};
