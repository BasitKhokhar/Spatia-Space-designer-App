import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId, offlineAccess: false });
  configured = true;
}

// Drop the cached Google session. Without this the SDK silently reuses the last
// account and the picker never appears, so we call it before every sign-in and
// on app logout.
export async function signOutGoogle() {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // No cached session (or Play Services unavailable) — nothing to clear.
  }
}

export async function signInWithGoogle() {
  try {
    ensureConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always start from a clean slate so Google shows the full account list
    // instead of auto-picking the previously used email.
    await signOutGoogle();
    const result = await GoogleSignin.signIn();
    // v13+ nests the payload under `data`; older versions return it directly.
    const idToken = result?.data?.idToken || result?.idToken;
    // console.log('[social] Google sign-in result', { idToken, user: result?.user });
    if (!idToken) {
      return { provider: 'google', ok: false, reason: 'No ID token returned by Google' };
    }
    return { provider: 'google', ok: true, idToken };
  } catch (err) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      return { provider: 'google', ok: false, reason: 'cancelled' };
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      return { provider: 'google', ok: false, reason: 'A sign-in is already in progress' };
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { provider: 'google', ok: false, reason: 'Google Play Services is not available' };
    }
    return { provider: 'google', ok: false, reason: err.message || 'Google sign-in failed' };
  }
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    return { provider: 'apple', ok: false, reason: 'Apple Sign-In is iOS only' };
  }
  // Example: await AppleAuthentication.signInAsync({ requestedScopes: [...] })
  return { provider: 'apple', ok: true };
}
