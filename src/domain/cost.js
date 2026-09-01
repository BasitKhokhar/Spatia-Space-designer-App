import { useCatalogStore } from '@/store/useCatalogStore';

// Live budget estimate: sum of catalog prices for every placed item.
// Falls back to 0 for items whose catalog entry has no price (or hasn't
// synced from the backend yet).
export function estimateCost(plan) {
  if (!plan?.furniture?.length) return 0;
  return plan.furniture.reduce((sum, f) => {
    const item = useCatalogStore.getState().byId(f.catalogId);
    return sum + (item?.price || 0);
  }, 0);
}

export function itemCount(plan) {
  return plan?.furniture?.length || 0;
}

// Format an amount with an optional currency ({ symbol }). Defaults to "$" so
// existing callers (the furniture budget pill) keep working unchanged.
export function formatMoney(n, currency) {
  const symbol = currency?.symbol ?? '$';
  return `${symbol}${Math.round(n).toLocaleString('en-US')}`;
}
