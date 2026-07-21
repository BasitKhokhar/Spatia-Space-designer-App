import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';
import { isRemote } from '@/services/api/client';
import { authApi } from '@/services/api/authApi';
import { setTokens, clearTokens, setSessionExpiredHandler } from '@/services/api/session';
import { resetUserData } from './resetUserData';

// Auth store. When a backend URL is configured (isRemote), auth goes through the
// real API and tokens are kept in session.js; otherwise it falls back to a
// local-only session so the app still runs fully offline / demo.
function toUser(apiUser) {
  const name = apiUser.name || 'Designer';
  return {
    id: apiUser.id,
    name,
    email: apiUser.email,
    initial: name.trim().charAt(0).toUpperCase(),
  };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      _localSession(name, email) {
        return {
          user: {
            id: uid('user'),
            name: name || 'Alex Rivera',
            email: email || 'alex@studio.com',
            initial: (name || 'A').trim().charAt(0).toUpperCase(),
          },
          isAuthenticated: true,
        };
      },

      login: async (email, password) => {
        if (isRemote()) {
          const { user, accessToken, refreshToken } = await authApi.login(email, password);
          setTokens({ accessToken, refreshToken });
          const mapped = toUser(user);
          set({ user: mapped, isAuthenticated: true });
          return mapped;
        }
        const s = get()._localSession('Alex Rivera', email);
        set(s);
        return s.user;
      },

      // Create the account only — deliberately does NOT establish a session.
      // The user is sent to the Login screen afterwards and must sign in with
      // their new credentials (SignupScreen handles that navigation).
      signup: async (name, email, password) => {
        if (isRemote()) {
          const { user } = await authApi.signup(name, email, password);
          return user ? toUser(user) : null;
        }
        // Local/demo mode: no real backend, so just report success without
        // authenticating so the same "sign up → log in" flow applies.
        return {
          id: uid('user'),
          name: name || 'Designer',
          email,
          initial: (name || 'D').trim().charAt(0).toUpperCase(),
        };
      },

      // provider: 'google' | 'apple'. Remote Google requires a verified idToken
      // (wire expo-auth-session); without one we materialize a local session.
      socialLogin: async (provider, idToken) => {
        if (isRemote() && provider === 'google' && idToken) {
          const { user, accessToken, refreshToken } = await authApi.googleLogin(idToken);
          setTokens({ accessToken, refreshToken });
          const mapped = toUser(user);
          set({ user: mapped, isAuthenticated: true });
          return mapped;
        }
        const s = get()._localSession(
          provider === 'apple' ? 'Apple User' : 'Google User',
          `user@${provider}.com`
        );
        set(s);
        return s.user;
      },

      deleteAccount: async () => {
        if (isRemote()) {
          try {
            await authApi.deleteAccount();
          } catch {
            // proceed with local cleanup regardless
          }
        }
        // Wipe tokens + all user-scoped stores, then drop the session. The
        // navigator swaps back to the Login stack once isAuthenticated flips.
        resetUserData();
        set({ user: null, isAuthenticated: false });
      },

      logout: async () => {
        if (isRemote()) {
          try {
            await authApi.logout();
          } catch {
            // ignore network errors on logout
          }
        }
        // Clear tokens + every credential/user store (projects, credits,
        // unlocks). Device prefs + onboardingComplete survive on purpose.
        resetUserData();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);

// When the API client detects a fully-expired session (access token expired and
// the refresh token no longer works), drop the local session too. RootNavigator
// watches isAuthenticated and swaps back to the Login stack automatically.
setSessionExpiredHandler(() => {
  clearTokens();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
