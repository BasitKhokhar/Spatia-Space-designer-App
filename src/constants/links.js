import Constants from 'expo-constants';

// Legal / support links surfaced in Settings and compliance flows.
// Hardcoded fallbacks below are the real hosted pages (not placeholders) so
// Privacy Policy / Terms & Conditions still open correctly even if the
// EXPO_PUBLIC_ env var is missing from a build.
const FALLBACK_PRIVACY_URL = 'https://spatialegalpages.netlify.app/privacy-policy';
const FALLBACK_TERMS_URL = 'https://spatialegalpages.netlify.app/terms-and-conditions';

export const LINKS = {
  // EXPO_PUBLIC_ prefix required — Metro inlines no other process.env vars.
  // Constants.expoConfig?.extra is the second source: it's how a bare (non
  // EXPO_PUBLIC_-prefixed) value set on EAS still reaches the app, same
  // pattern as API_BASE_URL in src/constants/config.js.
  privacy:
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
    Constants.expoConfig?.extra?.privacyPolicyUrl ||
    FALLBACK_PRIVACY_URL,
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    Constants.expoConfig?.extra?.termsUrl ||
    FALLBACK_TERMS_URL,
  support: 'mailto:support@homeplanner.app',
  // Play policy requires a web-accessible account-deletion path in addition
  // to the in-app flow.
  accountDeletion: 'https://spatialegalpages.netlify.app/delete-account',
};
