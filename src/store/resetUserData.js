import { clearTokens } from '@/services/api/session';
import { useProjectsStore } from './useProjectsStore';
import { useCreditsStore } from './useCreditsStore';
import { useUnlocksStore } from './useUnlocksStore';

// Tears down everything tied to the signed-in user: auth tokens plus every
// user-scoped store (projects, credit balance, item unlocks). Device
// preferences (theme, language, onboardingComplete) live in useSettingsStore
// and are deliberately preserved so logging out does NOT replay onboarding.
//
// Kept out of useAuthStore to avoid a circular import: those stores never import
// the auth store, so the dependency only flows one way (auth → here → stores).
export function resetUserData() {
  clearTokens();
  useProjectsStore.getState().reset();
  useCreditsStore.getState().reset();
  useUnlocksStore.getState().reset();
}
