import { uid } from '@/utils/id';

// ---------------------------------------------------------------------------
// Floors: a project is a stack of floors, each its own floor plan. The store
// keeps `project.plan` mirrored to the active floor so every existing consumer
// (editor, catalog, export, estimate) keeps working on a single plan. These
// helpers build/label floors and migrate legacy single-plan projects.
// ---------------------------------------------------------------------------

// Wrap a plan into a floor record.
export function makeFloor(name, plan) {
  return { id: uid('floor'), name, plan };
}

// Human floor names by stack index (0 = ground).
export function floorName(index) {
  if (index === 0) return 'Ground floor';
  const n = index;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} floor`;
}

// A new floor that shares the source floor's shell (outline, walls, materials,
// height) so it stacks aligned above it, but starts empty of furniture/openings.
export function blankFloorFrom(srcPlan, name) {
  const plan = {
    width: srcPlan.width,
    length: srcPlan.length,
    wallHeight: srcPlan.wallHeight ?? 2.6,
    walls: (srcPlan.walls || []).map((w) => ({ ...w })),
    openings: [],
    furniture: [],
    materials: { ...(srcPlan.materials || {}) },
    ...(srcPlan.footprint ? { footprint: srcPlan.footprint.map((p) => ({ ...p })) } : {}),
  };
  return makeFloor(name, plan);
}

// Deep-ish clone of a floor including its contents (for "Clone floor").
export function cloneFloorRecord(floor, name) {
  const p = floor.plan;
  const plan = {
    ...p,
    walls: (p.walls || []).map((w) => ({ ...w })),
    openings: (p.openings || []).map((o) => ({ ...o })),
    furniture: (p.furniture || []).map((f) => ({ ...f })),
    materials: { ...(p.materials || {}) },
    ...(p.footprint ? { footprint: p.footprint.map((pt) => ({ ...pt })) } : {}),
  };
  return makeFloor(name, plan);
}

// Migration / normalizer: guarantee a project has a floors array + activeFloorId,
// with `plan` mirrored to the active floor. Legacy projects (only `plan`) become
// a single "Ground floor". Idempotent — safe to call on already-migrated data.
export function ensureFloors(project) {
  if (!project) return project;
  if (Array.isArray(project.floors) && project.floors.length) {
    const active =
      project.floors.find((f) => f.id === project.activeFloorId) || project.floors[0];
    return {
      ...project,
      activeFloorId: active.id,
      plan: active.plan,
    };
  }
  const floor = makeFloor('Ground floor', project.plan);
  return { ...project, floors: [floor], activeFloorId: floor.id, plan: floor.plan };
}

// The active floor record of a (migrated) project.
export function activeFloor(project) {
  if (!project?.floors) return null;
  return project.floors.find((f) => f.id === project.activeFloorId) || project.floors[0];
}
