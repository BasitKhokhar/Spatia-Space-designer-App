import { request } from './client';

// Server-authoritative credits. Balance/costs/daily-cap all come from the
// backend (driven by its CREDITS_* env vars).
export const creditsApi = {
  get: () => request('/credits'),
  earnFromAd: () => request('/credits/earn-ad', { method: 'POST' }),
  spend: (kind) => request('/credits/spend', { method: 'POST', body: { kind } }),
};
