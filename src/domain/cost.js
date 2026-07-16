import { catalogById } from '@/data/catalog';

// Live budget estimate: sum of catalog prices for every placed item.
// Falls back to 0 for items whose catalog entry has no price.
export function estimateCost(plan) {
  if (!plan?.furniture?.length) return 0;
  return plan.furniture.reduce((sum, f) => {
    const item = catalogById(f.catalogId);
    return sum + (item?.price || 0);
  }, 0);
}

export function itemCount(plan) {
  return plan?.furniture?.length || 0;
}

export function formatMoney(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
