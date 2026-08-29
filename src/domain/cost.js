import { catalogById } from '@/data/catalog';
import { useCatalogStore } from '@/store/useCatalogStore';

// Live budget estimate: sum of catalog prices for every placed item.
// Falls back to 0 for items whose catalog entry has no price.
export function estimateCost(plan) {
  if (!plan?.furniture?.length) return 0;
  return plan.furniture.reduce((sum, f) => {
    // The LIVE catalog first: catalogById only knows the bundled seed, so every
    // item an admin added from the dashboard priced at 0 in the budget estimate.
    const item = useCatalogStore.getState().byId(f.catalogId) || catalogById(f.catalogId);
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
