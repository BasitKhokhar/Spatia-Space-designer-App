import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useDesignCatalog } from '@/hooks/useDesignCatalog';
import { ROUTES } from '@/navigation/routes';

// Step 1 of "Try Our Creative Designs": pick the kind of space to design. The
// categories are backend-driven (dynamic + admin-editable), cached offline, and
// fall back to the bundled set on first run. Each leads to a grid of premade
// designs (StarterIdeasScreen).
export default function CategoryScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const { categories, templates, countByCategory } = useDesignCatalog();

  return (
    <Screen>
      <HeaderBar title="Choose a category" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text variant="h2">What are you{'\n'}building?</Text>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            Pick a category — you'll get ready-made layouts, or start from scratch.
          </Text>
          {templates.length ? (
            <Text variant="label" color="ink3" style={{ marginTop: 16 }}>
              {templates.length} DESIGNS · {categories.length} CATEGORIES
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 14,
              marginTop: 16,
            }}
          >
            {categories.map((cat) => {
              const count = countByCategory[cat.key];
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => navigation.navigate(ROUTES.starterIdeas, { categoryId: cat.key })}
                  style={({ pressed }) => [
                    {
                      width: '47.5%',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.lineSoft,
                      borderRadius: radius.lg,
                      padding: 18,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                    shadows.e1,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                    {count ? (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: radius.pill,
                          backgroundColor: colors.surface2,
                          borderWidth: 1,
                          borderColor: colors.lineSoft,
                        }}
                      >
                        <Text variant="label" color="ink3" style={{ fontSize: 11 }}>
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="titleSm" style={{ marginTop: 14 }}>
                    {cat.name}
                  </Text>
                  <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
                    {cat.blurb}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
