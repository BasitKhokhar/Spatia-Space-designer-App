import { create } from 'zustand';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Live height of the anchored banner, published so the tab screens can extend
// their bottom padding by exactly as much space as the ad is actually taking.
//
// Not persisted, and 0 whenever no ad is on screen — which is what keeps a
// no-fill from leaving a blank strip or a dead scroll gap behind.
export const useAdLayout = create((set) => ({
  bannerHeight: 0,
  setBannerHeight: (bannerHeight) => set({ bannerHeight }),
  // Fixed content height of the TabBar row (icons + labels + its own
  // padding), measured via onLayout with the safe-area inset already
  // subtracted back out. Deliberately excludes insets.bottom: that value
  // commonly reports 0 for the first frame or two before the real inset
  // resolves, and if it were baked into this number, that resolution would
  // re-fire onLayout and bump every screen's padding a beat after content
  // already rendered — a gap visibly opening back up under it. Reading
  // insets.bottom live in useTabPadding instead keeps it on the same
  // render pass as TabBar's own copy, so nothing lags behind.
  tabBarContentHeight: null,
  setTabBarContentHeight: (tabBarContentHeight) => set({ tabBarContentHeight }),
}));

// Bottom padding for a tab screen's scroll content, sized to clear the
// floating TabBar exactly rather than guessing. `base` is only a fallback
// used for the brief window before TabBar reports its measured height —
// once it does, every screen's gap snaps to match the real bar instead of
// leaving a mismatched blank strip above it.
export function useTabPadding(base = 120) {
  const insets = useSafeAreaInsets();
  const tabBarContentHeight = useAdLayout((s) => s.tabBarContentHeight);
  const bannerHeight = useAdLayout((s) => s.bannerHeight);
  const measured = tabBarContentHeight != null ? tabBarContentHeight + insets.bottom + 16 : base;
  return measured + bannerHeight;
}
