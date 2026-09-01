import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';
import { createFloorPlan } from '@/domain/floorplan';
import {
  makeFloor,
  blankFloorFrom,
  cloneFloorRecord,
  floorName,
  ensureFloors,
} from '@/domain/floors';
import { seedPlan, hasStarterLayout } from '@/data/starterLayouts';
import { buildIdeaPlan, ideaById } from '@/data/starterIdeas';
import { isRemote } from '@/services/api/client';
import { projectsApi } from '@/services/api/projectsApi';

// Resolve a project's numeric server id. `serverId` is the durable link stamped
// at reconcile time; a numeric local `id` (from a server hydrate) also counts.
// Returns null when the project has never been linked to a server row.
function serverIdOf(p) {
  if (!p) return null;
  if (typeof p.serverId === 'number') return p.serverId;
  if (typeof p.id === 'number') return p.id;
  return null;
}

// Attach the server identity to a local project without clobbering local content
// (name/plan/floors may hold edits newer than the server's initial copy). We only
// need the numeric id + the stable clientId link from the server.
function reconcile(p, saved) {
  return { ...p, id: saved.id, serverId: saved.id, clientId: p.clientId ?? saved.clientId };
}

// Minimal idempotent-create payload for a project (keyed by its stable clientId).
function createPayload(p) {
  return {
    clientId: p.clientId,
    name: p.name,
    roomType: p.roomType,
    variant: p.variant,
    width: p.plan?.width,
    length: p.plan?.length,
    plan: p.plan,
  };
}

// Normalize a pending-delete entry (legacy entries were bare numeric ids) and a
// stable key for de-duping the queue.
const asDeleteEntry = (e) => (typeof e === 'number' ? { id: e } : e);
const deleteKey = (e) => (e.id != null ? `id:${e.id}` : `cid:${e.clientId}`);

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
      // True while the first server sync of this session is in flight — lets a
      // cold start (no local cache yet) show a loading skeleton instead of a
      // misleading "No projects yet" before the real list has arrived.
      loading: isRemote(),
      // Server ids of projects the user deleted locally while the remote delete
      // could not be reached (offline / server error). Retried by
      // `flushPendingDeletes` once connectivity returns so the live DB doesn't
      // keep projects the user already removed.
      pendingDeletes: [],

      // Load the current user's projects from the server (no-op when local-first).
      hydrate: async () => {
        if (!isRemote()) return;
        set({ loading: true });
        try {
          // Clear any deletes that were queued while offline before pulling the
          // authoritative list (otherwise a deleted project could reappear), then
          // backfill server ids for any locally-created projects that never linked.
          await get().flushPendingDeletes();
          await get().syncUnreconciled();
          const list = await projectsApi.list();
          set({ projects: list.map(ensureFloors) });
        } catch {
          // keep cached projects on network error
        } finally {
          set({ loading: false });
        }
      },

      // Backfill the server id for projects created locally whose create response
      // was never received (they still carry a temp id + a clientId but no
      // serverId). The idempotent backend create returns the existing row when
      // the clientId already exists, so this never duplicates.
      syncUnreconciled: async () => {
        if (!isRemote()) return;
        const pending = get().projects.filter((p) => serverIdOf(p) == null && p.clientId);
        if (!pending.length) return;
        await Promise.all(
          pending.map((p) =>
            projectsApi
              .create(createPayload(p))
              .then((saved) => {
                if (typeof saved?.id !== 'number') return;
                set((s) => ({
                  projects: s.projects.map((q) => (q.clientId === p.clientId ? reconcile(q, saved) : q)),
                  activeProjectId: s.activeProjectId === p.id ? saved.id : s.activeProjectId,
                }));
                // Push the authoritative local plan/floors now that we have an id.
                projectsApi.update(saved.id, { plan: p.plan, floors: p.floors }).catch(() => {});
              })
              .catch(() => {
                // stays unreconciled; retried on the next connect
              })
          )
        );
      },

      createProject: ({ name, roomType, width, length, variant = 0, seed = false, ideaId = null, template = null, source = null, aiJobId = null }) => {
        const now = Date.now();
        const tempId = uid('proj');
        // Stable, client-generated key. Round-trips through the backend so this
        // project can always be re-linked (and its server row deleted) even if
        // the create response below is lost.
        const clientId = uid('cid');
        // Sources, in priority: a premade design `template` (a full multi-floor
        // plan from the backend/bundled catalog), a bundled starter `idea` (a
        // furnished single plan), else a blank rectangle (optionally seeded with
        // a single-room starter layout).
        const idea = ideaId ? ideaById(ideaId) : null;
        let plan;
        let rooms = 1;
        let floors = null;
        let activeIdx = 0;
        if (template) {
          const w = template.plan || {};
          // Rebuild floor records with fresh local ids so the project owns them.
          floors = (w.floors || []).map((f) => makeFloor(f.name, f.plan));
          if (!floors.length) floors = [makeFloor('Ground floor', createFloorPlan({ width: w.width, length: w.length }))];
          activeIdx = Math.min(w.defaultFloor || 0, floors.length - 1);
          plan = floors[activeIdx].plan;
          rooms = template.rooms || 1;
          name = name || template.name;
          roomType = roomType || template.categoryKey;
          width = w.width ?? plan.width;
          length = w.length ?? plan.length;
        } else if (idea) {
          plan = buildIdeaPlan(idea);
          rooms = idea.rooms || 1;
          name = name || idea.name;
          roomType = roomType || idea.categoryId;
          width = plan.width;
          length = plan.length;
        } else {
          // A starter layout keeps its room perimeter; a plain new project opens
          // as a fully blank canvas (no auto-added square) — the user draws every
          // wall, room and structure themselves.
          const starter = seed && hasStarterLayout(roomType);
          plan = createFloorPlan({ width, length, perimeter: starter });
          if (starter) {
            plan = seedPlan(plan, roomType);
          }
        }
        if (!floors) floors = [makeFloor('Ground floor', plan)];
        const activeFloor = floors[activeIdx] || floors[0];
        const project = {
          id: tempId,
          clientId,
          serverId: null,
          name: name || 'Untitled Room',
          roomType: roomType || 'living',
          variant,
          rooms,
          createdAt: now,
          updatedAt: now,
          floors,
          activeFloorId: activeFloor.id,
          plan: activeFloor.plan, // mirror of the active floor's plan (kept in sync by the store)
          // Provenance. 'ai' marks a design a model produced, which the UI has
          // to disclose (Play AI-Generated Content policy) and which gives the
          // report flow the generation to point at. Projects the user drew
          // carry neither field and read as manual.
          source,
          aiJobId,
        };
        set((s) => ({ projects: [project, ...s.projects], activeProjectId: project.id }));

        // Persist to the server, then link the local copy to the server row.
        if (isRemote()) {
          projectsApi
            .create({ clientId, name: project.name, roomType: project.roomType, variant, width, length, plan: project.plan })
            .then((saved) => {
              if (typeof saved?.id !== 'number') return;
              set((s) => ({
                projects: s.projects.map((p) => (p.clientId === clientId ? reconcile(p, saved) : p)),
                activeProjectId: s.activeProjectId === tempId ? saved.id : s.activeProjectId,
              }));
              // Multi-floor designs: create only stores the active plan, so push
              // the full floors array once the real id is known.
              if (project.floors.length > 1) {
                projectsApi.update(saved.id, { plan: project.plan, floors: project.floors }).catch(() => {});
              }
            })
            .catch(() => {
              // Response lost / offline — stays unreconciled; syncUnreconciled()
              // backfills the server id on the next successful connect.
            });
        }
        return project;
      },

      setActive: (id) => set({ activeProjectId: id }),

      getActive: () => {
        const { projects, activeProjectId } = get();
        const p = projects.find((p) => p.id === activeProjectId) || null;
        return p ? ensureFloors(p) : null;
      },

      // Persist an edit to the ACTIVE floor and mirror it to `project.plan`.
      updatePlan: (id, plan) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const proj = ensureFloors(p);
            const floors = proj.floors.map((f) =>
              f.id === proj.activeFloorId ? { ...f, plan } : f
            );
            return { ...proj, floors, plan, updatedAt: Date.now() };
          }),
        }));
        if (isRemote()) {
          const proj = get().projects.find((p) => p.id === id);
          const sid = serverIdOf(proj);
          if (sid != null) projectsApi.update(sid, { plan, floors: proj?.floors }).catch(() => {});
        }
      },

      // ---- Floors ----------------------------------------------------------

      addFloor: (projectId) => {
        let newId = null;
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            const floor = blankFloorFrom(proj.plan, floorName(proj.floors.length));
            newId = floor.id;
            const floors = [...proj.floors, floor];
            return { ...proj, floors, activeFloorId: floor.id, plan: floor.plan, updatedAt: Date.now() };
          }),
        }));
        get()._syncFloors(projectId);
        return newId;
      },

      cloneFloor: (projectId, floorId) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            const idx = proj.floors.findIndex((f) => f.id === floorId);
            if (idx < 0) return proj;
            const copy = cloneFloorRecord(proj.floors[idx], `${proj.floors[idx].name} copy`);
            const floors = [...proj.floors];
            floors.splice(idx + 1, 0, copy);
            return { ...proj, floors, activeFloorId: copy.id, plan: copy.plan, updatedAt: Date.now() };
          }),
        }));
        get()._syncFloors(projectId);
      },

      deleteFloor: (projectId, floorId) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            if (proj.floors.length <= 1) return proj; // always keep one floor
            const idx = proj.floors.findIndex((f) => f.id === floorId);
            const floors = proj.floors.filter((f) => f.id !== floorId);
            let activeFloorId = proj.activeFloorId;
            if (activeFloorId === floorId) {
              const neighbor = floors[Math.min(idx, floors.length - 1)];
              activeFloorId = neighbor.id;
            }
            const active = floors.find((f) => f.id === activeFloorId) || floors[0];
            return { ...proj, floors, activeFloorId: active.id, plan: active.plan, updatedAt: Date.now() };
          }),
        }));
        get()._syncFloors(projectId);
      },

      renameFloor: (projectId, floorId, name) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            const floors = proj.floors.map((f) => (f.id === floorId ? { ...f, name } : f));
            return { ...proj, floors, updatedAt: Date.now() };
          }),
        }));
        get()._syncFloors(projectId);
      },

      setActiveFloor: (projectId, floorId) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            const floor = proj.floors.find((f) => f.id === floorId);
            if (!floor) return proj;
            return { ...proj, activeFloorId: floor.id, plan: floor.plan };
          }),
        }));
      },

      moveFloor: (projectId, floorId, dir) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const proj = ensureFloors(p);
            const idx = proj.floors.findIndex((f) => f.id === floorId);
            const j = idx + (dir === 'up' ? -1 : 1);
            if (idx < 0 || j < 0 || j >= proj.floors.length) return proj;
            const floors = [...proj.floors];
            [floors[idx], floors[j]] = [floors[j], floors[idx]];
            return { ...proj, floors, updatedAt: Date.now() };
          }),
        }));
        get()._syncFloors(projectId);
      },

      // Mirror the current floors array to the server (best-effort).
      _syncFloors: (projectId) => {
        if (!isRemote()) return;
        const proj = get().projects.find((p) => p.id === projectId);
        const sid = serverIdOf(proj);
        if (sid != null && proj) projectsApi.update(sid, { plan: proj.plan, floors: proj.floors }).catch(() => {});
      },

      renameProject: (id, name) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
        }));
        if (isRemote()) {
          const proj = get().projects.find((p) => p.id === id);
          const sid = serverIdOf(proj);
          if (sid != null) projectsApi.update(sid, { name }).catch(() => {});
        }
      },

      // Delete a project. The local copy is removed immediately (optimistic, so
      // the UI updates offline too). The server row is then removed via whichever
      // link is available:
      //   • a known server id           → DELETE it (queue on failure);
      //   • only a clientId, but online → resolve the id (idempotent create) then
      //                                    DELETE, so a never-reconciled project
      //                                    can't leave an orphan row behind;
      //   • only a clientId, offline    → queue the clientId for a reconcile+delete
      //                                    once connectivity returns.
      deleteProject: (id) => {
        const proj = get().projects.find((p) => p.id === id) || null;
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
        if (!isRemote() || !proj) return;

        const sid = serverIdOf(proj);
        if (sid != null) {
          projectsApi.remove(sid).catch((e) => {
            if (e?.status === 404) return; // already gone
            get()._queueDelete({ id: sid });
          });
          return;
        }
        // No server id yet. Only projects that were ever pushed carry a clientId;
        // without one there is nothing on the server to remove.
        if (!proj.clientId) return;
        get()
          ._resolveAndRemove(proj)
          .catch(() => get()._queueDelete({ clientId: proj.clientId, payload: createPayload(proj) }));
      },

      // Resolve a project's server id via the idempotent create, then delete it.
      _resolveAndRemove: async (proj) => {
        const saved = await projectsApi.create(createPayload(proj));
        if (typeof saved?.id !== 'number') throw new Error('unresolved');
        await projectsApi.remove(saved.id);
      },

      // Add an entry to the offline delete queue (de-duped by id/clientId).
      _queueDelete: (entry) =>
        set((s) => {
          const q = (s.pendingDeletes || []).map(asDeleteEntry);
          const key = deleteKey(entry);
          return q.some((e) => deleteKey(e) === key) ? {} : { pendingDeletes: [...q, entry] };
        }),

      // Retry the server deletes queued while offline. Best-effort: each entry
      // that succeeds (or is already gone) is dropped from the queue. clientId
      // entries first resolve to a numeric id via the idempotent create.
      flushPendingDeletes: async () => {
        if (!isRemote()) return;
        const queue = (get().pendingDeletes || []).map(asDeleteEntry);
        if (!queue.length) return;
        const settled = await Promise.all(
          queue.map(async (e) => {
            try {
              let id = e.id;
              if (id == null && e.clientId) {
                const saved = await projectsApi.create({ clientId: e.clientId, ...(e.payload || {}) });
                id = saved?.id;
              }
              if (typeof id !== 'number') return { e, done: false };
              await projectsApi.remove(id);
              return { e, done: true };
            } catch (err) {
              return { e, done: err?.status === 404 };
            }
          })
        );
        const doneKeys = new Set(settled.filter((r) => r.done).map((r) => deleteKey(r.e)));
        if (doneKeys.size) {
          set((s) => ({
            pendingDeletes: (s.pendingDeletes || [])
              .map(asDeleteEntry)
              .filter((e) => !doneKeys.has(deleteKey(e))),
          }));
        }
      },

      incrementExports: () => set((s) => ({ exportsMade: s.exportsMade + 1 })),

      reset: () => set({ projects: [], activeProjectId: null, exportsMade: 0, pendingDeletes: [] }),
    }),
    {
      name: 'projects',
      storage: createJSONStorage(() => zustandMMKVStorage),
      version: 1,
      // v0 → v1: give every project a floors array (single "Ground floor" from
      // its existing plan). Lossless; `plan` stays mirrored to the active floor.
      migrate: (state, version) => {
        if (!state) return state;
        if (version < 1 && Array.isArray(state.projects)) {
          return { ...state, projects: state.projects.map(ensureFloors) };
        }
        return state;
      },
    }
  )
);

// Referentially-stable hook for the active (normalized) project. Do NOT select
// `getActive()` directly: it runs `ensureFloors`, which spreads a fresh object
// every call, so the snapshot never compares equal and React throws
// "getSnapshot should be cached" / "Maximum update depth exceeded". Instead we
// subscribe to the raw record (a stable store reference) and normalize it with
// useMemo so the result only changes when the underlying project changes.
export function useActiveProject() {
  const raw = useProjectsStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId) || null
  );
  return useMemo(() => (raw ? ensureFloors(raw) : null), [raw]);
}
