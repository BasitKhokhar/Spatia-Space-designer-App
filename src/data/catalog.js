// Pure catalog helpers. The catalog's actual content (items + categories) is
// backend-driven — see useCatalogStore, hydrated from GET /catalog — so this
// file only holds logic that has to exist regardless of where an item came
// from, applied to whatever item object the live store/API hands it.

// Whether an item is gated behind a rewarded-ad unlock.
export function isPremiumItem(item) {
  return !!item?.premium;
}

// Credit price to place an item (0 = free). Structure/opening items carry an
// explicit `cost`; legacy premium furnishings derive one from their price tier
// so the whole catalog has a consistent economy without editing every entry.
export function itemCost(item) {
  if (typeof item?.cost === 'number') return item.cost;
  if (!item?.premium) return 0;
  const p = item.price || 0;
  if (p >= 3000) return 5;
  if (p >= 1500) return 3;
  return 2;
}
