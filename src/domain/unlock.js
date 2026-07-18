import { Alert } from 'react-native';

import { showRewardedAd } from '@/services/ads/admob';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { itemCost } from '@/data/catalog';

// Gate placing a catalog item behind its credit cost.
//   • Free items (cost 0), subscribers (Plus/Pro), and items already unlocked via
//     a past rewarded-ad all resolve immediately.
//   • Otherwise, with enough credits, confirm and spend; short on credits, offer
//     to watch a rewarded ad (which earns credits) or upgrade, then spend once
//     affordable. Resolves true only when the item is actually paid for.
export function ensurePlaceable(item) {
  return new Promise((resolve) => {
    const credits = useCreditsStore.getState();
    if (credits.premiumUnlocked()) return resolve(true);

    const cost = itemCost(item);
    if (cost <= 0) return resolve(true);
    if (useUnlocksStore.getState().isUnlocked(item.id)) return resolve(true);

    const plural = cost > 1 ? 's' : '';
    const balance = credits.balance;

    const spend = async () => {
      const ok = await useCreditsStore.getState().spendItem(cost, item.id);
      resolve(ok);
    };

    // Enough credits: confirm the spend.
    if (balance >= cost) {
      Alert.alert(
        `Place ${item.name}`,
        `This costs ${cost} credit${plural}. You have ${balance}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: `Spend ${cost}`, onPress: spend },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
      return;
    }

    // Short on credits: earn via a rewarded ad or bail.
    const buttons = [{ text: 'Not now', style: 'cancel', onPress: () => resolve(false) }];
    if (credits.canWatchAd()) {
      buttons.push({
        text: 'Watch ad',
        onPress: async () => {
          const earned = await showRewardedAd();
          if (earned) await useCreditsStore.getState().earnFromAd();
          const now = useCreditsStore.getState();
          if (now.balance >= cost) resolve(await now.spendItem(cost, item.id));
          else {
            Alert.alert('Almost there', `You now have ${now.balance} of ${cost} credits. Earn a bit more to place ${item.name}.`);
            resolve(false);
          }
        },
      });
    }
    Alert.alert(
      `Need ${cost} credits`,
      `${item.name} costs ${cost} credit${plural} — you have ${balance}. Watch a short ad to earn credits, or upgrade for the full catalog.`,
      buttons,
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
