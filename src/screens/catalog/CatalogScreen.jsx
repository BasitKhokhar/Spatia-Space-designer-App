import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Chip from '@/components/ui/Chip';
import FurnitureCard from '@/components/catalog/FurnitureCard';
import { isPremiumItem } from '@/data/catalog';
import { isShopRoom } from '@/data/roomTypes';
import { useProjectsStore, useActiveProject } from '@/store/useProjectsStore';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useCatalogStore, categoryNamesWithItems } from '@/store/useCatalogStore';
import { ensurePlaceable } from '@/domain/unlock';
import { addFurnitureItem } from '@/domain/floorplan';

export default function CatalogScreen({ navigation, route }) {
  const project = useActiveProject();
  const updatePlan = useProjectsStore((s) => s.updatePlan);
  const unlocked = useUnlocksStore((s) => s.unlocked);
  const subscriber = useCreditsStore((s) => s.tier !== 'free');
  const allItems = useCatalogStore((s) => s.items);
  const catObjects = useCatalogStore((s) => s.categories);
  const hydrateCatalog = useCatalogStore((s) => s.hydrate);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await hydrateCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [hydrateCatalog]);
  const CATEGORIES = useMemo(
    () => ['All', ...categoryNamesWithItems(allItems, catObjects)],
    [allItems, catObjects]
  );
  const paramCategory = route?.params?.category;
  const [category, setCategory] = useState(
    (paramCategory && paramCategory) ||
      (project && isShopRoom(project.roomType) ? 'Retail' : 'All')
  );
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((c) => {
      const matchCat = category === 'All' || c.category === category;
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.includes(q));
      return matchCat && matchQuery;
    });
  }, [category, query, allItems]);

  const addToProject = async (item) => {
    if (!project) return;
    // Paid items spend credits (or route through the earn-ad flow) before placing.
    const ok = await ensurePlaceable(item);
    if (!ok) return;
    const next = addFurnitureItem(project.plan, item, {
      x: project.plan.width / 2,
      y: project.plan.length / 2,
    });
    updatePlan(project.id, next);
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="h2">Catalog</Text>
        <Input
          icon="search"
          placeholder="Search furniture & decor"
          value={query}
          onChangeText={setQuery}
          style={{ marginTop: 14 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          gap: 9,
          paddingVertical: 16,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} active={cat === category} onPress={() => setCategory(cat)} />
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            gap: 14,
          }}
        >
          {items.map((item) => (
            <FurnitureCard
              key={item.id}
              item={item}
              locked={isPremiumItem(item) && !subscriber && !unlocked[item.id]}
              onAdd={() => addToProject(item)}
              style={{ width: '47%' }}
            />
          ))}
        </View>
        {items.length === 0 ? (
          <Text color="ink3" align="center" style={{ marginTop: 40 }}>
            No furniture matches your search.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
