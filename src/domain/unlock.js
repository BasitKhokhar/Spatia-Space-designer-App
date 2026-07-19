import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useUnlockPrompt } from '@/store/useUnlockPrompt';
import { itemCost } from '@/data/catalog';

// Gate placing a catalog item behind its credit cost.
//   • Free items (cost 0), subscribers (Basic/Premium), and items already
//     unlocked all resolve immediately with no prompt.
//   • Otherwise the premium UnlockItemSheet is shown: it displays the item, its
//     price and the user's balance with an "are you sure?" prompt, handles the
//     spend, the watch-ad top-up and the subscribe CTA, and resolves true only
//     once the item is actually unlocked.
export function ensurePlaceable(item) {
  const credits = useCreditsStore.getState();
  if (credits.premiumUnlocked()) return Promise.resolve(true);

  const cost = itemCost(item);
  if (cost <= 0) return Promise.resolve(true);
  if (useUnlocksStore.getState().isUnlocked(item.id)) return Promise.resolve(true);

  return useUnlockPrompt.getState().present(item);
}
