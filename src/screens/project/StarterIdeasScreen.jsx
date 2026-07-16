import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import IdeaThumbnail from '@/components/graphics/IdeaThumbnail';
import { useTheme } from '@/theme/useTheme';
import { categoryById } from '@/data/categories';
import { ideasByCategory } from '@/data/starterIdeas';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

// Step 2 of "Start Blank": browse furnished starter ideas for the chosen
// category, or tap "Custom" to draw from scratch (room type -> dimensions ->
// freeform editor).
export default function StarterIdeasScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const category = categoryById(route.params?.categoryId);
  const ideas = ideasByCategory(category.id);
  const createProject = useProjectsStore((s) => s.createProject);

  const openIdea = (idea) => {
    createProject({ ideaId: idea.id });
    navigation.navigate(ROUTES.editor);
  };

  const startCustom = () => {
    navigation.navigate(ROUTES.roomType, { category: category.id });
  };

  return (
    <Screen>
      <HeaderBar title={category.name} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text variant="h2">Starter ideas</Text>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            Open a ready layout — or build your own.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 20,
              marginTop: 22,
            }}
          >
            {/* Custom / blank tile */}
            <Pressable onPress={startCustom} style={{ width: '47%' }}>
              <View
                style={{
                  height: 100,
                  borderRadius: 16,
                  borderWidth: 1.6,
                  borderStyle: 'dashed',
                  borderColor: colors.accent,
                  backgroundColor: colors.accentTintBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="plus" size={20} color="#fff" strokeWidth={2.4} />
                </View>
                <Text variant="label" color="accent">
                  Custom
                </Text>
              </View>
              <Text variant="label" color="ink" style={{ marginTop: 8 }}>
                Blank canvas
              </Text>
              <Text variant="bodySm" color="ink3">
                Draw from scratch
              </Text>
            </Pressable>

            {/* Furnished ideas */}
            {ideas.map((idea) => (
              <Pressable key={idea.id} onPress={() => openIdea(idea)} style={{ width: '47%' }}>
                <IdeaThumbnail idea={idea} height={100} style={{ borderRadius: 16 }} />
                <Text variant="label" color="ink" style={{ marginTop: 8 }}>
                  {idea.name}
                </Text>
                <Text variant="bodySm" color="ink3">
                  {idea.rooms} {idea.rooms === 1 ? 'room' : 'rooms'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
