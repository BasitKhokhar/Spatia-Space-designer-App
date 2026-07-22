import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import ProjectCard from '@/components/project/ProjectCard';
import EmptyState from '@/components/feedback/EmptyState';
import ConfirmDeleteModal from '@/components/feedback/ConfirmDeleteModal';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

export default function ProjectsScreen({ navigation }) {
  const { colors } = useTheme();
  const projects = useProjectsStore((s) => s.projects);
  const setActive = useProjectsStore((s) => s.setActive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  // Project pending deletion (drives the confirmation modal). Null when closed.
  const [pendingDelete, setPendingDelete] = useState(null);

  const open = (p) => {
    setActive(p.id);
    navigation.navigate(ROUTES.editor);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteProject(pendingDelete.id);
    setPendingDelete(null);
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
              <ProjectCard
                key={p.id}
                project={p}
                onPress={() => open(p)}
                onDelete={() => setPendingDelete(p)}
                style={{ width: '47%' }}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <ConfirmDeleteModal
        visible={!!pendingDelete}
        title="Delete this project?"
        message={
          pendingDelete
            ? `“${pendingDelete.name}” and all of its floor plans will be permanently removed. This can’t be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}
