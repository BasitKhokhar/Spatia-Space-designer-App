import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Line, G } from 'react-native-svg';

import Text from '@/components/ui/Text';
import CreditPill from '@/components/ui/CreditPill';
import SectionHeader from '@/components/ui/SectionHeader';
import ProjectCard from '@/components/project/ProjectCard';
import AiSpotlight from '@/components/home/AiSpotlight';
import EmptyState from '@/components/feedback/EmptyState';
import ConfirmDeleteModal from '@/components/feedback/ConfirmDeleteModal';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useAiBriefStore } from '@/store/useAiBriefStore';
import { accent } from '@/theme/colors';
import { ROUTES } from '@/navigation/routes';

// The home screen is a jumping-off point, not an archive: only the projects the
// user is likely still working on belong here. The full list lives in Projects.
const RECENT_LIMIT = 8;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

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
    <View style={{ marginTop: 22 }}>
      {/* No fixed height: the copy and the button decide how tall this is, so
          the button can never end up jammed against the bottom edge the way a
          hard-coded 132 forced it to. */}
      <LinearGradient
        colors={[accent.a400, accent.a500, accent.a700]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radius.xxl,
            overflow: 'hidden',
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 22,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
          },
          shadows.accent,
        ]}
      >
        {/* Same blueprint language as the AI card, so the two read as one set. */}
        <Svg
          viewBox="0 0 340 150"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <G opacity={0.22}>
            <Rect x="232" y="34" width="112" height="86" rx="5" stroke="#fff" strokeWidth={1.6} fill="none" />
            <Line x1="232" y1="80" x2="288" y2="80" stroke="#fff" strokeWidth={1.6} />
            <Line x1="288" y1="80" x2="288" y2="120" stroke="#fff" strokeWidth={1.6} />
            <Line x1="300" y1="34" x2="300" y2="52" stroke="#fff" strokeWidth={1.6} />
          </G>
        </Svg>

        <Text variant="label" style={{ color: '#FFE7DE', fontSize: 11, letterSpacing: 0.8 }}>
          START FRESH
        </Text>
        <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 22, marginTop: 6 }}>
          New Project
        </Text>
        <Text variant="bodySm" style={{ color: '#FBE6DD', marginTop: 4, maxWidth: 220 }}>
          Start from a blank canvas or a ready-made layout.
        </Text>
        {/* The banner itself is just artwork — "Create" is the only hit target,
            so tapping anywhere on a large block no longer navigates. */}
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({
            marginTop: 18,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: pressed ? '#F0E4DE' : '#fff',
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: radius.pill,
          })}
        >
          <Text style={{ color: colors.accent, fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Create</Text>
          <Icon name="arrow-right" size={15} color={colors.accent} strokeWidth={2.4} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const balance = useCreditsStore((s) => s.balance);
  const projects = useProjectsStore((s) => s.projects);
  const setActive = useProjectsStore((s) => s.setActive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  // A generation the user left running — the spotlight card takes them back to
  // it rather than offering to start a second one.
  const aiJobId = useAiBriefStore((s) => s.jobId);

  // Project pending deletion (drives the confirmation modal). Null when closed.
  const [pendingDelete, setPendingDelete] = useState(null);

  // Most recently touched first — "recent" has to mean recent, and the store's
  // order only reflects creation.
  const recent = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, RECENT_LIMIT),
    [projects]
  );

  const openProject = (project) => {
    setActive(project.id);
    navigation.navigate(ROUTES.editor);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteProject(pendingDelete.id);
    setPendingDelete(null);
  };

  const startNew = () => navigation.navigate(ROUTES.newProject);

  const startAi = () =>
    aiJobId
      ? navigation.navigate(ROUTES.aiGenerating, { jobId: aiJobId })
      : navigation.navigate(ROUTES.aiWizard);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingTop: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar initial={user?.initial || 'A'} />
            <View>
              <Text variant="bodySm" color="ink3">
                {greeting()}
              </Text>
              <Text variant="title">{user?.name || 'Designer'}</Text>
            </View>
          </View>
          <CreditPill count={balance} onPress={() => navigation.navigate(ROUTES.earnCredits)} />
        </View>

        {/* AI first, above New Project: it's the feature most people won't
            discover on their own, and the fastest route to a finished plan. */}
        <View style={{ paddingHorizontal: 12 }}>
          <AiSpotlight onPress={startAi} inProgress={!!aiJobId} style={{ marginTop: 22 }} />
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
              title="Recent Projects"
              action={projects.length > RECENT_LIMIT ? `See all ${projects.length}` : 'See all'}
              onAction={() => navigation.navigate(ROUTES.projects)}
              style={{ paddingHorizontal: 24, marginTop: 28 }}
            />
            <Text variant="bodySm" color="ink3" style={{ paddingHorizontal: 24, marginTop: 2 }}>
              {projects.length > RECENT_LIMIT
                ? `Your ${RECENT_LIMIT} latest — the rest are in Projects.`
                : 'Pick up where you left off.'}
            </Text>
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
              {recent.map((p) => (
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
