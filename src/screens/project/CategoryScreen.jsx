import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { CATEGORIES } from '@/data/categories';
import { ROUTES } from '@/navigation/routes';

// Step 1 of "Start Blank": pick the kind of space to design. Each category
// leads to a grid of furnished starter ideas (StarterIdeasScreen).
export default function CategoryScreen({ navigation }) {
  const { colors, radius } = useTheme();

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
            {CATEGORIES.map((cat) => (
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
