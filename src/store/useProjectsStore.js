import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';
import { createFloorPlan } from '@/domain/floorplan';
import { seedPlan, hasStarterLayout } from '@/data/starterLayouts';
import { buildIdeaPlan, ideaById } from '@/data/starterIdeas';
import { isRemote } from '@/services/api/client';
import { projectsApi } from '@/services/api/projectsApi';

// Projects store. When a backend URL is configured, projects are synced to the
// server (hydrate on load; create/update/delete mirror to the API) while the
// local cache keeps the app responsive and offline-capable. Create stays
// optimistic so navigation into the editor is instant; the server id is
// reconciled in the background.
export const useProjectsStore = create(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      exportsMade: 0,

      // Load the current user's projects from the server (no-op when local-first).
      hydrate: async () => {
        if (!isRemote()) return;
        try {
          const list = await projectsApi.list();
          set({ projects: list });
        } catch {
          // keep cached projects on network error
        }
      },

      createProject: ({ name, roomType, width, length, variant = 0, seed = false, ideaId = null }) => {
        const now = Date.now();
        const tempId = uid('proj');
        // A starter idea builds a full furnished plan (perimeter + partitions +
        // furniture); otherwise fall back to a blank rectangle, optionally
        // seeded with a single-room starter layout.
        const idea = ideaId ? ideaById(ideaId) : null;
        let plan;
        let rooms = 1;
        if (idea) {
          plan = buildIdeaPlan(idea);
          rooms = idea.rooms || 1;
          name = name || idea.name;
          roomType = roomType || idea.categoryId;
          width = plan.width;
          length = plan.length;
        } else {
          plan = createFloorPlan({ width, length });
          if (seed && hasStarterLayout(roomType)) {
            plan = seedPlan(plan, roomType);
          }
        }
        const project = {
          id: tempId,
          name: name || 'Untitled Room',
          roomType: roomType || 'living',
          variant,
          rooms,
          createdAt: now,
          updatedAt: now,
          plan,
        };
        set((s) => ({ projects: [project, ...s.projects], activeProjectId: project.id }));

        // Persist to the server, then swap the temp id for the real one.
        if (isRemote()) {
          projectsApi
            .create({ name: project.name, roomType: project.roomType, variant, width, length, plan: project.plan })
            .then((saved) => {
              set((s) => ({
                projects: s.projects.map((p) => (p.id === tempId ? { ...p, ...saved } : p)),
                activeProjectId: s.activeProjectId === tempId ? saved.id : s.activeProjectId,
              }));
            })
            .catch(() => {
              // leave the optimistic local copy in place
            });
        }
        return project;
      },

      setActive: (id) => set({ activeProjectId: id }),

      getActive: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) || null;
      },

      updatePlan: (id, plan) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, plan, updatedAt: Date.now() } : p)),
        }));
        // Only sync ids the server knows about (numeric); temp ids sync after
        // the create reconciles and the next edit fires with the real id.
        if (isRemote() && typeof id === 'number') {
          projectsApi.update(id, { plan }).catch(() => {});
        }
      },

      renameProject: (id, name) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
        }));
        if (isRemote() && typeof id === 'number') {
          projectsApi.update(id, { name }).catch(() => {});
        }
      },

      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
        if (isRemote() && typeof id === 'number') {
          projectsApi.remove(id).catch(() => {});
        }
      },

      incrementExports: () => set((s) => ({ exportsMade: s.exportsMade + 1 })),

      reset: () => set({ projects: [], activeProjectId: null, exportsMade: 0 }),
    }),
    {
      name: 'projects',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
