import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';

import Text from '@/components/ui/Text';
import CreditPill from '@/components/ui/CreditPill';
import SectionHeader from '@/components/ui/SectionHeader';
import ProjectCard from '@/components/project/ProjectCard';
import EmptyState from '@/components/feedback/EmptyState';
import ConfirmDeleteModal from '@/components/feedback/ConfirmDeleteModal';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { accent } from '@/theme/colors';
import { ROUTES } from '@/navigation/routes';

function Avatar({ initial }) {
  const { radius } = useTheme();
  return (
    <LinearGradient
      colors={[accent.a500, accent.a700]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 46,
        height: 46,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 17 }}>{initial}</Text>
    </LinearGradient>
  );
}

function NewProjectBanner({ onPress }) {
  const { colors, radius, shadows } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ marginTop: 22 }}>
      <LinearGradient
        colors={[accent.a500, accent.a700]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          { height: 132, borderRadius: radius.xl, overflow: 'hidden', padding: 24 },
          shadows.accent,
        ]}
      >
        <Svg width={180} height={132} viewBox="0 0 180 132" style={{ position: 'absolute', right: 0, top: 0, opacity: 0.28 }}>
          <Rect x="80" y="70" width="60" height="50" rx="4" stroke="#fff" strokeWidth={2} fill="none" />
        </Svg>
        <Text variant="label" style={{ color: '#FFE7DE' }}>
          START FRESH
        </Text>
        <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 22, marginTop: 6 }}>
          New Project
        </Text>
        <View
          style={{
            marginTop: 14,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: radius.md,
          }}
        >
          <Text style={{ color: colors.accent, fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Create</Text>
          <Icon name="arrow-right" size={15} color={colors.accent} strokeWidth={2.4} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const balance = useCreditsStore((s) => s.balance);
  const projects = useProjectsStore((s) => s.projects);
  const setActive = useProjectsStore((s) => s.setActive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  // Project pending deletion (drives the confirmation modal). Null when closed.
  const [pendingDelete, setPendingDelete] = useState(null);

  const openProject = (project) => {
    setActive(project.id);
    navigation.navigate(ROUTES.editor);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteProject(pendingDelete.id);
    setPendingDelete(null);
  };

  const startNew = () => navigation.navigate(ROUTES.newProject);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar initial={user?.initial || 'A'} />
            <View>
              <Text variant="bodySm" color="ink3">
                Good afternoon
              </Text>
              <Text variant="title">{user?.name || 'Designer'}</Text>
            </View>
          </View>
          <CreditPill count={balance} onPress={() => navigation.navigate(ROUTES.earnCredits)} />
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <NewProjectBanner onPress={startNew} />
        </View>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Your designs will show up here. Start your first floor plan to bring a room to life."
            actionTitle="Create Your First Project"
            actionIcon="arrow-right"
            onAction={startNew}
            illustration={<Icon name="home" size={90} color={colors.line} strokeWidth={1.4} />}
            style={{ marginTop: 20 }}
          />
        ) : (
          <>
            <SectionHeader
              title="Your Projects"
              action="See all"
              onAction={() => navigation.navigate(ROUTES.projects)}
              style={{ paddingHorizontal: 24, marginTop: 28 }}
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                marginTop: 16,
                gap: 14,
              }}
            >
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onPress={() => openProject(p)}
                  onDelete={() => setPendingDelete(p)}
                  style={{ width: '47%' }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

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
