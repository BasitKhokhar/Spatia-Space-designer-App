import { useEffect } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { CATEGORIES as BUNDLED_CATEGORIES } from '@/data/categories';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { ROUTES } from '@/navigation/routes';

// Step 1 of "Try Our Creative Designs": pick the kind of space to design. The
// categories are backend-driven (dynamic + admin-editable), cached offline, and
// fall back to the bundled set on first run. Each leads to a grid of premade
// designs (StarterIdeasScreen).
export default function CategoryScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const stored = useTemplatesStore((s) => s.categories);
  const hydrate = useTemplatesStore((s) => s.hydrate);

  // Refresh the design catalog (no-op if already cached & offline; refreshes
  // from the backend when online).
  useEffect(() => {
    if (!stored.length) hydrate();
  }, [stored.length, hydrate]);

  // Normalize to a common shape; `id` here is the category key.
  const categories = stored.length
    ? stored.map((c) => ({ id: c.key, name: c.name, icon: c.icon, blurb: c.blurb }))
    : BUNDLED_CATEGORIES;

  return (
    <Screen>
      <HeaderBar title="Choose a category" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text variant="h2">What are you{'\n'}building?</Text>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            Pick a category — you'll get ready-made layouts, or start from scratch.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 14,
              marginTop: 24,
            }}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate(ROUTES.starterIdeas, { categoryId: cat.id })}
                style={{
                  width: '47%',
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: radius.lg,
                  padding: 18,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={cat.icon} size={24} color={colors.accent} />
                </View>
                <Text variant="titleSm" style={{ marginTop: 14 }}>
                  {cat.name}
                </Text>
                <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
                  {cat.blurb}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
