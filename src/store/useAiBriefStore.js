import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from './storage';
import { uid } from '@/utils/id';

// ---------------------------------------------------------------------------
// The AI design brief the wizard collects, step by step.
//
// Persisted for two reasons that both matter on mobile:
//   • a half-finished brief survives the app being killed, so nobody loses nine
//     screens of answers to a phone call, and
//   • `jobId` survives too, so backgrounding the app during a two-minute
//     generation doesn't abandon work the user has already paid for — the
//     generating screen just resumes polling.
//
// Every step also stores a free-text answer. Those are passed to the model
// verbatim and carry the intent no fixed list can capture.
// ---------------------------------------------------------------------------

const FLOOR_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];

// Name the levels the way the user thinks of them: basement first, then ground
// up, then the roof.
export function floorLabels({ floorCount, hasBasement, hasRoof }) {
  const names = [];
  if (hasBasement) names.push('Basement');
  for (let i = 0; i < floorCount; i++) names.push(FLOOR_NAMES[i] || `Floor ${i}`);
  if (hasRoof) names.push('Roof / Terrace');
  return names;
}

const emptyFloor = (name) => ({
  name,
  purpose: '',
  rooms: {}, // { [roomType]: count }
  customSpaces: [],
  notes: '',
});

const initialState = {
  step: 0,

  // 1 — what are we designing
  spaceType: null,
  spaceTypeCustom: '',

  // 2 — the plot
  width: 11,
  length: 15,

  // 3 — levels
  floorCount: 1,
  hasBasement: false,
  hasRoof: false,

  // 4 — orientation
  entranceSide: 'south',
  roadSide: 'south',
  cornerPlot: false,

  // 5 — per-floor programme
  floors: [emptyFloor('Ground Floor')],

  // 6 — furnishing
  furnishing: 'full',

  // 7 — style
  style: 'modern',

  // 8 — requirements
  requirements: [],
  extras: [],
  notes: '',

  // 9 — in-flight generation
  jobId: null,
  clientRequestId: null,
};

export const useAiBriefStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      set: (patch) => set(patch),

      // Changing the level count reshapes `floors` while keeping the answers
      // already given for the levels that still exist — a user who adds a floor
      // at step 3 must not lose the ground floor they already filled in.
      syncFloors: () => {
        const { floorCount, hasBasement, hasRoof, floors } = get();
        const names = floorLabels({ floorCount, hasBasement, hasRoof });
        const byName = new Map(floors.map((f) => [f.name, f]));
        set({ floors: names.map((name) => byName.get(name) || emptyFloor(name)) });
      },

      setFloor: (index, patch) =>
        set((s) => ({
          floors: s.floors.map((f, i) => (i === index ? { ...f, ...patch } : f)),
        })),

      setRoomCount: (index, roomType, count) =>
        set((s) => ({
          floors: s.floors.map((f, i) =>
            i === index ? { ...f, rooms: { ...f.rooms, [roomType]: Math.max(0, count) } } : f
          ),
        })),

      // "Copy from the floor below" — the single biggest time-saver in the
      // wizard when a building repeats a level (a plaza's shop floors, an
      // apartment block).
      copyFloorFrom: (srcIndex, destIndex) =>
        set((s) => {
          const src = s.floors[srcIndex];
          if (!src) return s;
          return {
            floors: s.floors.map((f, i) =>
              i === destIndex
                ? { ...f, purpose: src.purpose, rooms: { ...src.rooms }, customSpaces: [...src.customSpaces], notes: src.notes }
                : f
            ),
          };
        }),

      addCustomSpace: (index, textValue) =>
        set((s) => ({
          floors: s.floors.map((f, i) =>
            i === index && textValue.trim()
              ? { ...f, customSpaces: [...f.customSpaces, textValue.trim()] }
              : f
          ),
        })),

      removeCustomSpace: (index, at) =>
        set((s) => ({
          floors: s.floors.map((f, i) =>
            i === index ? { ...f, customSpaces: f.customSpaces.filter((_, j) => j !== at) } : f
          ),
        })),

      toggleRequirement: (key) =>
        set((s) => ({
          requirements: s.requirements.includes(key)
            ? s.requirements.filter((r) => r !== key)
            : [...s.requirements, key],
        })),

      // A fresh idempotency key per generation attempt. Reused across retries of
      // the SAME attempt so a dropped response never double-charges.
      newRequestId: () => {
        const clientRequestId = uid('airq');
        set({ clientRequestId });
        return clientRequestId;
      },

      setJob: (jobId) => set({ jobId }),
      clearJob: () => set({ jobId: null, clientRequestId: null }),

      reset: () => set({ ...initialState, floors: [emptyFloor('Ground Floor')] }),

      // The payload POST /ai/plans expects. Room counts are flattened from the
      // wizard's map into the list the backend validates against its vocabulary.
      buildBrief: (spaceTypeDef) => {
        const s = get();
        const roomLabel = new Map((spaceTypeDef?.rooms || []).map((r) => [r.type, r.label]));

        return {
          spaceType: s.spaceType,
          spaceTypeCustom: s.spaceTypeCustom,
          envelope: { width: s.width, length: s.length },
          entranceSide: s.entranceSide,
          roadSide: s.roadSide,
          cornerPlot: s.cornerPlot,
          style: s.style,
          furnishing: s.furnishing,
          requirements: s.requirements,
          extras: s.extras,
          notes: s.notes,
          floors: s.floors.map((f) => ({
            name: f.name,
            purpose: f.purpose,
            notes: f.notes,
            customSpaces: f.customSpaces,
            rooms: Object.entries(f.rooms)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => ({ type, count, label: roomLabel.get(type) || type })),
          })),
        };
      },
    }),
    {
      name: 'aiBrief',
      storage: createJSONStorage(() => zustandMMKVStorage),
      version: 1,
    }
  )
);
