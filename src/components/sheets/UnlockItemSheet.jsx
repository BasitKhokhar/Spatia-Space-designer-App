import { useEffect, useState } from 'react';
import { Modal, View, Pressable, ActivityIndicator } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';
import { useUnlockPrompt } from '@/store/useUnlockPrompt';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { showRewardedAd } from '@/services/ads/admob';
import { itemCost } from '@/data/catalog';
import { navigate } from '@/navigation/navigationRef';
import { ROUTES } from '@/navigation/routes';

// Global premium-unlock sheet. Mounted once at the app root and driven by
// useUnlockPrompt. Tapping a locked item opens this: it shows the item, its
// credit price, the user's balance and a premium "are you sure?" prompt. Yes →
// spend + unlock (server-recorded). Short on credits → watch a rewarded ad to
// earn credits, or subscribe. Resolves the awaiting ensurePlaceable() promise.
export default function UnlockItemSheet() {
  const { colors, radius, shadows } = useTheme();
  const visible = useUnlockPrompt((s) => s.visible);
  const item = useUnlockPrompt((s) => s.item);
  const finish = useUnlockPrompt((s) => s.finish);

  const balance = useCreditsStore((s) => s.balance);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  // Reset transient UI each time the sheet opens.
  useEffect(() => {
    if (visible) { setWorking(false); setDone(false); }
  }, [visible, item?.id]);

  if (!item) return null;

  const cost = itemCost(item);
  const plural = cost === 1 ? '' : 's';
  const enough = balance >= cost;

  const close = (result) => { if (!working) finish(result); };

  const doSpend = async () => {
    setWorking(true);
    const ok = await useCreditsStore.getState().spendItem(cost, item.id);
    if (ok) {
      useUnlocksStore.getState().unlock(item.id); // permanent local mirror
      setDone(true);
      setTimeout(() => finish(true), 750);
    } else {
      setWorking(false); // spend failed (e.g. race / network) — stay open
    }
  };

  const watchAd = async () => {
    setWorking(true);
    const earned = await showRewardedAd();
    if (earned) await useCreditsStore.getState().earnFromAd();
    setWorking(false);
    // balance updates via the store subscription; if now enough the confirm CTA
    // appears automatically.
  };

  const canWatchAd = useCreditsStore.getState().canWatchAd();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={() => close(false)}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingHorizontal: 22,
              paddingTop: 12,
              paddingBottom: 28,
            },
            shadows.e3,
          ]}
        >
          {/* Grab handle */}
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 14 }} />

          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 18, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={30} color={colors.success} strokeWidth={2.4} />
              </View>
              <Text variant="title">Unlocked!</Text>
              <Text variant="caption" color="ink3">{item.name} is now yours.</Text>
            </View>
          ) : (
            <>
              {/* Item preview + premium tag */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 76, height: 76, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <FurnitureGlyph kind={item.kind} size={56} color={item.colors?.[0]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: colors.accentSoft }}>
                      <Icon name="star" size={11} color={colors.accent} strokeWidth={2.4} />
                      <Text style={{ fontSize: 10.5, fontFamily: 'Manrope_700Bold', color: colors.accent, letterSpacing: 0.4 }}>PREMIUM</Text>
                    </View>
                  </View>
                  <Text variant="title" numberOfLines={1}>{item.name}</Text>
                  <Text variant="caption" color="ink3" numberOfLines={1}>{item.category}</Text>
                </View>
              </View>

              {/* Price + balance row */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface2, paddingVertical: 12, alignItems: 'center', gap: 3 }}>
                  <Text variant="caption" color="ink3">Price</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="star" size={15} color={colors.credit} strokeWidth={2.2} />
                    <Text style={{ fontSize: 18, fontFamily: 'Manrope_700Bold', color: colors.ink }}>{cost}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface2, paddingVertical: 12, alignItems: 'center', gap: 3 }}>
                  <Text variant="caption" color="ink3">Your credits</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="star" size={15} color={enough ? colors.accent : colors.ink3} strokeWidth={2.2} />
                    <Text style={{ fontSize: 18, fontFamily: 'Manrope_700Bold', color: enough ? colors.ink : colors.danger }}>{balance}</Text>
                  </View>
                </View>
              </View>

              {/* Premium-styled prompt line */}
              <Text style={{ textAlign: 'center', marginTop: 16, fontFamily: 'Manrope_600SemiBold', fontSize: 14.5, color: colors.ink2 }}>
                {enough
                  ? `Are you sure you want this item?`
                  : `You need ${cost - balance} more credit${cost - balance === 1 ? '' : 's'} to unlock this item.`}
              </Text>

              {/* Actions */}
              <View style={{ marginTop: 18, gap: 10 }}>
                {enough ? (
                  <Pressable
                    onPress={doSpend}
                    disabled={working}
                    style={{ height: 52, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: working ? 0.7 : 1 }}
                  >
                    {working ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={17} color="#fff" strokeWidth={2.4} />}
                    <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15.5 }}>
                      {working ? 'Unlocking…' : `Yes, unlock for ${cost}`}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    {canWatchAd ? (
                      <Pressable
                        onPress={watchAd}
                        disabled={working}
                        style={{ height: 52, borderRadius: radius.lg, backgroundColor: colors.credit, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: working ? 0.7 : 1 }}
                      >
                        {working ? <ActivityIndicator color="#fff" /> : <Icon name="play" size={17} color="#fff" strokeWidth={2.4} />}
                        <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15.5 }}>
                          {working ? 'Loading ad…' : 'Watch ad to earn credits'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => { close(false); navigate(ROUTES.paywall); }}
                      style={{ height: 50, borderRadius: radius.lg, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                    >
                      <Icon name="star" size={16} color={colors.bg} strokeWidth={2.2} />
                      <Text style={{ color: colors.bg, fontFamily: 'Manrope_700Bold', fontSize: 15 }}>Subscribe to unlock everything</Text>
                    </Pressable>
                  </>
                )}

                <Pressable onPress={() => close(false)} disabled={working} style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.ink3, fontFamily: 'Manrope_600SemiBold', fontSize: 14 }}>Not now</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
