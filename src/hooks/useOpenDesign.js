import { useCallback, useState } from 'react';

import { useProjectsStore } from '@/store/useProjectsStore';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { unlockTemplate } from '@/services/api/templatesApi';
import { ROUTES } from '@/navigation/routes';

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
