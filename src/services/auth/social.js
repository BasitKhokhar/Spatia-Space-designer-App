import { Platform } from 'react-native';

// Social sign-in stubs. Wire real providers here (expo-auth-session for Google,
// expo-apple-authentication for Apple) when you attach a backend. For now they
// resolve immediately so the UI flow is complete.
export async function signInWithGoogle() {
  // Example real flow:
  //   const request = new AuthSession.AuthRequest({ ... });
  //   const result = await request.promptAsync(discovery);
  return { provider: 'google', ok: true };
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    return { provider: 'apple', ok: false, reason: 'Apple Sign-In is iOS only' };
  }
  // Example: await AppleAuthentication.signInAsync({ requestedScopes: [...] })
  return { provider: 'apple', ok: true };
}
