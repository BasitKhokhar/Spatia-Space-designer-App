import { useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ProjectCard from '@/components/project/ProjectCard';
import ProjectsSkeleton from '@/components/project/ProjectsSkeleton';
import AiPolicyCard from '@/components/project/AiPolicyCard';
import EmptyState from '@/components/feedback/EmptyState';
import { CoverArt } from '@/components/graphics/CoverImage';
import ConfirmDeleteModal from '@/components/feedback/ConfirmDeleteModal';
import ReportContentSheet from '@/components/sheets/ReportContentSheet';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';
import { useTabPadding } from '@/store/useAdLayout';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'ai', label: 'AI' },
  { value: 'other', label: 'Other' },
];

// Every project the user has, newest edit first. Home only shows the latest few
// — this is the complete list.
export default function ProjectsScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  // Extends past the floating tab bar, plus the banner's height when one is
  // showing (0 otherwise, so the layout is unchanged without ads).
  const tabPadding = useTabPadding(120);
  const projects = useProjectsStore((s) => s.projects);
  const loading = useProjectsStore((s) => s.loading);
  const setActive = useProjectsStore((s) => s.setActive);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  // Project pending deletion (drives the confirmation modal). Null when closed.
  const [pendingDelete, setPendingDelete] = useState(null);

  // All / AI / Other filter, client-side over the same list Home summarizes.
  const [tab, setTab] = useState('all');

  // AI-report sheet, reused as-is from Settings > Help & Support — reporting
  // a design shouldn't need two different implementations.
  const [reportingProject, setReportingProject] = useState(null);
  const reportSheetRef = useRef(null);
  const startReport = (p) => {
    setReportingProject(p);
    setTimeout(() => reportSheetRef.current?.present(), 60);
  };

  const sorted = useMemo(
    () => [...projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [projects]
  );

  const filtered = useMemo(() => {
    if (tab === 'ai') return sorted.filter((p) => p.source === 'ai');
    if (tab === 'other') return sorted.filter((p) => p.source !== 'ai');
    return sorted;
  }, [sorted, tab]);

  const open = (p) => {
    setActive(p.id);
    navigation.navigate(ROUTES.editor);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteProject(pendingDelete.id);
    setPendingDelete(null);
  };

  const startNew = () => navigation.navigate(ROUTES.newProject);

  const TAB_EMPTY = {
    all: {
      title: 'No projects yet',
      message: 'Start a floor plan from scratch, pick a ready-made design, or let AI draw one for you.',
      actionTitle: 'New Project',
      onAction: startNew,
    },
    ai: {
      title: 'No AI designs yet',
      message: 'Generate a design with AI and it will show up here.',
      actionTitle: 'Try AI Design',
      onAction: () => navigation.navigate(ROUTES.aiWizard),
    },
    other: {
      title: 'No other designs yet',
      message: 'Projects you build manually or from a template show up here.',
      actionTitle: 'New Project',
      onAction: startNew,
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="h2">Projects</Text>
          <Text variant="bodySm" color="ink3" style={{ marginTop: 4 }}>
            {projects.length
              ? `${projects.length} ${projects.length === 1 ? 'design' : 'designs'} · newest first`
              : 'Nothing saved yet'}
          </Text>
        </View>
        <Pressable
          onPress={startNew}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingLeft: 12,
              paddingRight: 15,
              height: 42,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              opacity: pressed ? 0.9 : 1,
            },
            shadows.accent,
          ]}
        >
          <Icon name="plus" size={17} color={colors.onAccent} strokeWidth={2.4} />
          <Text variant="label" color="onAccent">
            New
          </Text>
        </Pressable>
      </View>

      {loading && projects.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabPadding }}>
          <ProjectsSkeleton />
        </ScrollView>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Start a floor plan from scratch, pick a ready-made design, or let AI draw one for you."
          actionTitle="New Project"
          actionIcon="arrow-right"
          onAction={startNew}
          illustration={<CoverArt />}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabPadding }}>
          <SegmentedControl
            options={TABS}
            value={tab}
            onChange={setTab}
            style={{ marginHorizontal: 24, marginTop: 18 }}
          />

          <View style={{ paddingHorizontal: 24, marginTop: 18 }}>
            {tab === 'ai' ? (
              <AiPolicyCard onContactSupport={() => navigation.navigate(ROUTES.contactSupport)} />
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState
                title={TAB_EMPTY[tab].title}
                message={TAB_EMPTY[tab].message}
                actionTitle={TAB_EMPTY[tab].actionTitle}
                actionIcon="arrow-right"
                onAction={TAB_EMPTY[tab].onAction}
                style={{ marginTop: 12 }}
              />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                {filtered.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onPress={() => open(p)}
                    onDelete={() => setPendingDelete(p)}
                    onReport={tab === 'ai' ? () => startReport(p) : undefined}
                    style={{ width: '47%' }}
                  />
                ))}
              </View>
            )}
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

      <ReportContentSheet
        ref={reportSheetRef}
        project={reportingProject}
        onClose={() => setReportingProject(null)}
      />
    </SafeAreaView>
  );
}
