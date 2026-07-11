// Legal / support links surfaced in Settings and compliance flows.
// Replace with your real hosted URLs before submitting to the stores.
export const LINKS = {
  privacy: process.env.PRIVACY_POLICY_URL || 'https://example.com/privacy',
  terms: process.env.TERMS_URL || 'https://example.com/terms',
  support: 'mailto:support@homeplanner.app',
  // Play policy requires a web-accessible account-deletion path in addition
  // to the in-app flow.
  accountDeletion: 'https://example.com/delete-account',
};
