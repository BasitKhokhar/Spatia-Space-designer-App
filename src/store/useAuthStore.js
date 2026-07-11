import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';

// Local-first auth. The service layer (services/api/authApi) is where you'd
// swap in real network calls; here we just materialize a local session.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      _sessionFrom(name, email) {
        return {
          user: {
            id: uid('user'),
            name: name || 'Alex Rivera',
            email: email || 'alex@studio.com',
            initial: (name || 'A').trim().charAt(0).toUpperCase(),
          },
          token: uid('token'),
          isAuthenticated: true,
        };
      },

      login: async (email) => {
        const session = get()._sessionFrom('Alex Rivera', email);
        set(session);
        return session.user;
      },

      signup: async (name, email) => {
        const session = get()._sessionFrom(name, email);
        set(session);
        return session.user;
      },

      socialLogin: async (provider) => {
        const session = get()._sessionFrom(
          provider === 'apple' ? 'Apple User' : 'Google User',
          `user@${provider}.com`
        );
        set(session);
        return session.user;
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
