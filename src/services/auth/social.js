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

export async function signInWithGoogle() {
  try {
    ensureConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    // v13+ nests the payload under `data`; older versions return it directly.
    const idToken = result?.data?.idToken || result?.idToken;
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
