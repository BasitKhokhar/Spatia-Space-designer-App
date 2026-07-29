import { useCallback, useEffect, useMemo } from 'react';

import { CATEGORIES as BUNDLED_CATEGORIES } from '@/data/categories';
import { useTemplatesStore } from '@/store/useTemplatesStore';

// Normalized read of the premade-design catalog (the "Try Our Creative Designs"
// data). Backend-driven, cached to MMKV, and seeded from the bundled categories
// so every browse surface — Explore, the category flow — shows the same designs
// and keeps working offline.
export function useDesignCatalog() {
  const storeCategories = useTemplatesStore((s) => s.categories);
  const tabs = useTemplatesStore((s) => s.tabs);
  const templates = useTemplatesStore((s) => s.templates);
  const hydrate = useTemplatesStore((s) => s.hydrate);

  useEffect(() => {
    if (!templates.length) hydrate();
  }, [templates.length, hydrate]);

  // `key` is the category identity everywhere downstream; the bundled set uses
  // `id` for the same thing.
  const categories = useMemo(
    () =>
      storeCategories.length
        ? [...storeCategories]
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((c) => ({ key: c.key, name: c.name, icon: c.icon, blurb: c.blurb }))
        : BUNDLED_CATEGORIES.map((c) => ({
            key: c.id,
            name: c.name,
            icon: c.icon,
            blurb: c.blurb,
          })),
    [storeCategories]
  );

  // Designs per category — drives the counts on the category pills/cards.
  const countByCategory = useMemo(() => {
    const counts = {};
    templates.forEach((t) => {
      counts[t.categoryKey] = (counts[t.categoryKey] || 0) + 1;
    });
    return counts;
  }, [templates]);

  const tabsFor = useCallback(
    (categoryKey) =>
      tabs
        .filter((t) => t.categoryKey === categoryKey)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tabs]
  );

  const templatesFor = useCallback(
    (categoryKey, tabKey) =>
      templates
        .filter((t) => t.categoryKey === categoryKey && (!tabKey || t.tabKey === tabKey))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [templates]
  );

  return { categories, tabs, templates, countByCategory, tabsFor, templatesFor, hydrate };
}
