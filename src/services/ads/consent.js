import { AD_CONFIG } from './config';
import { getAdsModule, setNpa } from './state';

// UMP (Google's certified CMP) wrapper. Required for EEA/UK traffic under GDPR
// and the DMA, and the only supported way to make personalised ads lawful there.

function consentApi() {
  const mod = getAdsModule();
  return mod?.AdsConsent || null;
}

// Debug options only take effect on a registered test device, so this is inert
// in the field even if it somehow shipped.
function infoOptions(mod) {
  if (!__DEV__ || !AD_CONFIG.testDeviceIds.length) return {};
  return {
    debugGeography: mod?.AdsConsentDebugGeography?.EEA,
    testDeviceIdentifiers: AD_CONFIG.testDeviceIds,
  };
}

// Whether the user granted the three TCF purposes that personalised ads need.
// Anything other than a clear yes means non-personalised — including every
// failure path, since guessing "personalised" wrong is the costly direction.
async function deriveNpa(AdsConsent) {
  try {
    const gdprApplies = await AdsConsent.getGdprApplies();
    if (!gdprApplies) return false;
  } catch {
    return true;
  }

  try {
    const c = await AdsConsent.getUserChoices();
    return !(
      c?.storeAndAccessInformationOnDevice &&
      c?.selectPersonalisedAds &&
      c?.createAPersonalisedAdsProfile
    );
  } catch {
    // TC string decode can fail; fall back to the raw purpose-consent bitstring.
    // Positions are 1-indexed purposes: 1 store/access, 3 personalised profile,
    // 4 personalised ads.
    try {
      const p = await AdsConsent.getPurposeConsents();
      if (!p) return true;
      return !(p[0] === '1' && p[2] === '1' && p[3] === '1');
    } catch {
      return true;
    }
  }
}

// Gathers consent and reports whether ads may be requested at all.
// Never throws: a consent failure degrades to "no personalised ads", not to a
// broken app.
export async function gatherConsent() {
  const mod = getAdsModule();
  const AdsConsent = consentApi();
  if (!AdsConsent) return { canRequestAds: true, npa: true, privacyOptionsRequired: false };

  try {
    await AdsConsent.requestInfoUpdate(infoOptions(mod));
    await AdsConsent.loadAndShowConsentFormIfRequired();

    const info = await AdsConsent.getConsentInfo();
    const npa = await deriveNpa(AdsConsent);
    const required =
      info?.privacyOptionsRequirementStatus ===
      mod?.AdsConsentPrivacyOptionsRequirementStatus?.REQUIRED;

    return {
      // Older SDK responses may omit canRequestAds; absent means "not denied".
      canRequestAds: info?.canRequestAds !== false,
      npa,
      privacyOptionsRequired: !!required,
    };
  } catch {
    return { canRequestAds: true, npa: true, privacyOptionsRequired: false };
  }
}

// True only where a persistent privacy-options entry point is legally required
// (EEA/UK and regulated US states). Showing the row elsewhere is just noise.
export async function privacyOptionsRequired() {
  const mod = getAdsModule();
  const AdsConsent = consentApi();
  if (!AdsConsent) return false;
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info?.privacyOptionsRequirementStatus ===
      mod?.AdsConsentPrivacyOptionsRequirementStatus?.REQUIRED
    );
  } catch {
    return false;
  }
}

// Reopens the consent form from Settings. Re-derives NPA afterwards so a user
// who just revoked consent stops getting personalised ads immediately.
export async function showPrivacyOptionsForm() {
  const AdsConsent = consentApi();
  if (!AdsConsent) return false;
  try {
    await AdsConsent.showPrivacyOptionsForm();
    setNpa(await deriveNpa(AdsConsent));
    return true;
  } catch {
    return false;
  }
}

// Re-reads consent without showing any UI (e.g. after returning from settings).
export async function refreshNpa() {
  const AdsConsent = consentApi();
  if (!AdsConsent) return;
  try {
    setNpa(await deriveNpa(AdsConsent));
  } catch {
    /* keep the current value */
  }
}

// Wipes stored consent so the form shows again on the next launch. Dev only.
export async function resetConsentForDebug() {
  if (!__DEV__) return false;
  const AdsConsent = consentApi();
  if (!AdsConsent) return false;
  try {
    await AdsConsent.reset();
    return true;
  } catch {
    return false;
  }
}
