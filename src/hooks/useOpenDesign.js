import { useCallback, useState } from 'react';

import { useProjectsStore } from '@/store/useProjectsStore';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { unlockTemplate } from '@/services/api/templatesApi';
import { ROUTES } from '@/navigation/routes';
import { scheduleInterstitial } from '@/services/ads/interstitial';
import { PLACEMENT } from '@/services/ads/placements';
import { useAdFrequency } from '@/store/useAdFrequency';

// Opening a premade design, shared by every screen that lists them: free
// designs go straight into the (editable) editor; premium ones spend credits
// first. A refused charge isn't a dead end — the caller renders
// NotEnoughCreditsModal from `blocked` so the user keeps their place in the grid.
export function useOpenDesign(navigation) {
  const isUnlocked = useUnlocksStore((s) => s.isUnlocked);
  const unlock = useUnlocksStore((s) => s.unlock);
  const createProject = useProjectsStore((s) => s.createProject);

  // Design whose unlock was refused ({ cost }), and the one currently unlocking
  // (so its tile can show progress instead of looking unresponsive).
  const [blocked, setBlocked] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const isLocked = useCallback(
    (t) => !!t?.premium && (t?.cost || 0) > 0 && !isUnlocked(t.id),
    [isUnlocked]
  );

  const openDesign = useCallback(
    async (t) => {
      // Captured before the unlock branch: a design the user just paid credits
      // for must not be followed by an ad.
      const wasFree = !isLocked(t);

      if (isLocked(t)) {
        setOpeningId(t.id);
        try {
          await unlockTemplate(t.id);
          unlock(t.id);
        } catch {
          setBlocked({ cost: t.cost || 0 });
          return;
        } finally {
          setOpeningId(null);
        }
      }
      createProject({ template: t });
      navigation.navigate(ROUTES.editor);

      // Central for every design lister (Explore, StarterIdeas, ...), so the
      // rule lives in one place rather than at each call site.
      if (wasFree) {
        useAdFrequency.getState().noteQualifyingAction();
        scheduleInterstitial(PLACEMENT.designOpened);
      }
    },
    [isLocked, unlock, createProject, navigation]
  );

  return {
    isLocked,
    openDesign,
    openingId,
    blocked,
    dismissBlocked: () => setBlocked(null),
  };
}
