import { create } from 'zustand';

// Live height of the anchored banner, published so the tab screens can extend
// their bottom padding by exactly as much space as the ad is actually taking.
//
// Not persisted, and 0 whenever no ad is on screen — which is what keeps a
// no-fill from leaving a blank strip or a dead scroll gap behind.
export const useAdLayout = create((set) => ({
  bannerHeight: 0,
  setBannerHeight: (bannerHeight) => set({ bannerHeight }),
}));

// Bottom padding for a tab screen's scroll content. `base` is the space the
// floating TabBar already needs on its own.
export function useTabPadding(base = 120) {
  const bannerHeight = useAdLayout((s) => s.bannerHeight);
  return base + bannerHeight;
}
