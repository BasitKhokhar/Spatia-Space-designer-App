import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';
import { createFloorPlan } from '@/domain/floorplan';

// Projects are stored locally. Each holds a floor-plan model (domain/floorplan).
export const useProjectsStore = create(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      exportsMade: 0,

      createProject: ({ name, roomType, width, length, variant = 0 }) => {
        const now = Date.now();
        const project = {
          id: uid('proj'),
          name: name || 'Untitled Room',
          roomType: roomType || 'living',
          variant,
          rooms: 1,
          createdAt: now,
          updatedAt: now,
          plan: createFloorPlan({ width, length }),
        };
        set((s) => ({ projects: [project, ...s.projects], activeProjectId: project.id }));
        return project;
      },

      setActive: (id) => set({ activeProjectId: id }),

      getActive: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) || null;
      },

      updatePlan: (id, plan) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, plan, updatedAt: Date.now() } : p
          ),
        })),

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        })),

      incrementExports: () => set((s) => ({ exportsMade: s.exportsMade + 1 })),

      reset: () => set({ projects: [], activeProjectId: null, exportsMade: 0 }),
    }),
    {
      name: 'projects',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
