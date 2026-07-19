import { isRemote, request } from './client';
import { CATEGORIES } from '@/data/categories';
import { STARTER_IDEAS, buildIdeaPlan } from '@/data/starterIdeas';
import { makeFloor } from '@/domain/floors';

// Premade design templates for the "Try Our Creative Designs" flow. Local-first
// returns a design-catalog assembled from the bundled categories + starter ideas
// (so the flow works on first run / offline). When a backend URL is set it
// fetches the DB-backed, admin-managed catalog (categories + story tabs + full
// multi-floor designs) — the app caches it to MMKV via useTemplatesStore.

// Wrap a single-floor plan into the multi-floor wrapper the app stores/adopts.
function wrapPlan(plan, name = 'Ground floor') {
  const floor = makeFloor(name, plan);
  return { width: plan.width, length: plan.length, floors: [floor], defaultFloor: 0 };
}

// Build the { categories, tabs, templates } payload from bundled data. Each
// category gets a single 'main' tab (the client hides the tab bar for ≤1 tab).
function localDesignCatalog() {
  const categories = CATEGORIES.map((c, i) => ({
    id: c.id, key: c.id, name: c.name, icon: c.icon, blurb: c.blurb, sortOrder: i,
  }));
  const tabs = CATEGORIES.map((c, i) => ({
    id: i + 1, categoryKey: c.id, key: 'main', label: 'Designs', stories: 1, sortOrder: 0,
  }));
  const templates = STARTER_IDEAS.map((idea) => ({
    id: idea.id,
    name: idea.name,
    categoryKey: idea.categoryId,
    tabKey: 'main',
    stories: 1,
    rooms: idea.rooms || 1,
    dimensions: { width: idea.dim[0], length: idea.dim[1] },
    plan: wrapPlan(buildIdeaPlan(idea)),
    premium: false,
    cost: 0,
  }));
  return { categories, tabs, templates };
}

export async function fetchDesignCatalog() {
  if (isRemote()) {
    return request('/catalog/design-catalog', { auth: false });
  }
  return localDesignCatalog();
}

// Spend credits to unlock a premium design. Backend validates the design's cost.
export async function unlockTemplate(templateId) {
  return request('/credits/spend-template', { method: 'POST', body: { templateId } });
}
