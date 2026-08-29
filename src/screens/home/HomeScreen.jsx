import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import CreditPill from '@/components/ui/CreditPill';
import SectionHeader from '@/components/ui/SectionHeader';
import AiHeroBanner from '@/components/home/AiHeroBanner';
import QuickStartRow from '@/components/home/QuickStartRow';
import RecentProjectsRail from '@/components/home/RecentProjectsRail';
import UpgradeBanner from '@/components/home/UpgradeBanner';
import EmptyState from '@/components/feedback/EmptyState';
import { CoverArt } from '@/components/graphics/CoverImage';
import ConfirmDeleteModal from '@/components/feedback/ConfirmDeleteModal';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useAiBriefStore } from '@/store/useAiBriefStore';
import { useBannersStore } from '@/store/useBannersStore';
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

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const balance = useCreditsStore((s) => s.balance);
  const tier = useCreditsStore((s) => s.tier);
  const projects = useProjectsStore((s) => s.projects);
  const setActive = useProjectsStore((s) => s.setActive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const createProject = useProjectsStore((s) => s.createProject);
  // A generation the user left running — the hero card takes them back to it
  // rather than offering to start a second one.
  const aiJobId = useAiBriefStore((s) => s.jobId);
  // Admin-managed hero photography. Cached to MMKV, so the card has a backdrop
  // on a cold start and stays intact offline.
  const banners = useBannersStore((s) => s.banners);
  const hydrateBanners = useBannersStore((s) => s.hydrate);

  useEffect(() => {
    hydrateBanners();
  }, [hydrateBanners]);

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

  // Shortcuts under the hero carousel — same destinations as the two
  // non-AI choices on the full "how do you want to start" screen.
  const startBlank = () => {
    createProject({});
    navigation.navigate(ROUTES.editor);
  };
  const browseTemplates = () => navigation.navigate(ROUTES.category);

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

        {/* The top section: fixed AI pitch + CTA, admin-managed photography
            auto-scrolling behind it. AI leads the screen because it's the
            feature most people won't discover on their own, and the fastest
            route from nothing to a finished plan. */}
        <AiHeroBanner
          images={banners}
          onPress={startAi}
          inProgress={!!aiJobId}
          style={{ marginTop: 22 }}
        />

        <View style={{ paddingHorizontal: 24 }}>
          <QuickStartRow onBlank={startBlank} onTemplates={browseTemplates} style={{ marginTop: 16 }} />
        </View>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Your designs will show up here. Start your first floor plan to bring a room to life."
            actionTitle="Create Your First Project"
            actionIcon="arrow-right"
            onAction={startNew}
            illustration={<CoverArt />}
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
            <RecentProjectsRail
              projects={recent}
              onOpen={openProject}
              onDelete={setPendingDelete}
              style={{ marginTop: 16 }}
            />
          </>
        )}

        {tier === 'free' ? (
          <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
            <UpgradeBanner onPress={() => navigation.navigate(ROUTES.paywall)} />
          </View>
        ) : null}
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
