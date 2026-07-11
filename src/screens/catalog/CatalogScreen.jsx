import { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Chip from '@/components/ui/Chip';
import FurnitureCard from '@/components/catalog/FurnitureCard';
import { CATALOG, CATEGORIES } from '@/data/catalog';
import { useProjectsStore } from '@/store/useProjectsStore';
import { addFurnitureItem } from '@/domain/floorplan';

export default function CatalogScreen({ navigation }) {
  const project = useProjectsStore((s) => s.getActive());
  const updatePlan = useProjectsStore((s) => s.updatePlan);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    return CATALOG.filter((c) => {
      const matchCat = category === 'All' || c.category === category;
      const matchQuery = !query || c.name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [category, query]);

  const addToProject = (item) => {
    if (!project) return;
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
        contentContainerStyle={{ paddingHorizontal: 24, gap: 9, paddingVertical: 16 }}
      >
        {CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} active={cat === category} onPress={() => setCategory(cat)} />
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
            <FurnitureCard key={item.id} item={item} onAdd={() => addToProject(item)} style={{ width: '47%' }} />
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
