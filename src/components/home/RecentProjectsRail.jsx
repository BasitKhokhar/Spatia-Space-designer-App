import { ScrollView } from 'react-native';

import ProjectCard from '@/components/project/ProjectCard';

const CARD_WIDTH = 168;

// Horizontal rail for Home's "Recent Projects" — same scroll pattern as
// CategoryRail, so a project list picks up where it left off in one swipe
// instead of the wrapped grid the full Projects screen uses.
export default function RecentProjectsRail({ projects, onOpen, onDelete, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
    >
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          onPress={() => onOpen(p)}
          onDelete={() => onDelete(p)}
          style={{ width: CARD_WIDTH }}
        />
      ))}
    </ScrollView>
  );
}
