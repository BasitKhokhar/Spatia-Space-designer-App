import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';
import { isRemote } from '@/services/api/client';
import { authApi } from '@/services/api/authApi';
import { setTokens, clearTokens } from '@/services/api/session';

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

      signup: async (name, email, password) => {
        if (isRemote()) {
          const { user, accessToken, refreshToken } = await authApi.signup(name, email, password);
          setTokens({ accessToken, refreshToken });
          const mapped = toUser(user);
          set({ user: mapped, isAuthenticated: true });
          return mapped;
        }
        const s = get()._localSession(name, email);
        set(s);
        return s.user;
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
        clearTokens();
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
        clearTokens();
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
