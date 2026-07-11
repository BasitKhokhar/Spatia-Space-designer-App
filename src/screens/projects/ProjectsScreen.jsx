import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import ProjectCard from '@/components/project/ProjectCard';
import EmptyState from '@/components/feedback/EmptyState';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

export default function ProjectsScreen({ navigation }) {
  const { colors } = useTheme();
  const projects = useProjectsStore((s) => s.projects);
  const setActive = useProjectsStore((s) => s.setActive);

  const open = (p) => {
    setActive(p.id);
    navigation.navigate(ROUTES.editor);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="h2">Projects</Text>
      </View>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create your first floor plan from the Home tab."
          actionTitle="New Project"
          actionIcon="arrow-right"
          onAction={() => navigation.navigate(ROUTES.newProject)}
          illustration={<Icon name="grid" size={80} color={colors.line} strokeWidth={1.4} />}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              marginTop: 18,
              gap: 14,
            }}
          >
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onPress={() => open(p)} style={{ width: '47%' }} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
