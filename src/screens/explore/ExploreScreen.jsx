import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import PlanThumbnail from '@/components/graphics/PlanThumbnail';
import { useTheme } from '@/theme/useTheme';
import { TEMPLATES } from '@/data/templates';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

export default function ExploreScreen({ navigation }) {
  const { colors } = useTheme();
  const createProject = useProjectsStore((s) => s.createProject);

  const startFrom = (t) => {
    createProject({
      name: t.name,
      roomType: 'living',
      width: t.dimensions.width,
      length: t.dimensions.length,
      variant: t.variant,
    });
    navigation.navigate(ROUTES.editor);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="h2">Explore</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 6 }}>
          Start from a ready-made layout.
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}>
        {TEMPLATES.map((t) => (
          <Card key={t.id} padded={false} onPress={() => startFrom(t)} style={{ overflow: 'hidden' }}>
            <PlanThumbnail variant={t.variant} height={150} />
            <View style={{ padding: 16 }}>
              <Text variant="titleSm">{t.name}</Text>
              <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
                {t.rooms} rooms · {t.dimensions.width}m × {t.dimensions.length}m
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
