import { create } from 'zustand';

// Tiny imperative controller for the global premium-unlock sheet. `present(item)`
// shows the sheet and returns a promise that resolves to `true` once the item is
// unlocked (paid for or earned via ad) or `false` if the user backs out. The
// sheet component (components/sheets/UnlockItemSheet) owns the interaction; this
// store only bridges the promise so domain/unlock.js can `await` it anywhere.
export const useUnlockPrompt = create((set, get) => ({
  visible: false,
  item: null,
  _resolve: null,

  present: (item) =>
    new Promise((resolve) => {
      // If one is already open, resolve it false before replacing.
      const prev = get()._resolve;
      if (prev) prev(false);
      set({ visible: true, item, _resolve: resolve });
    }),

  finish: (result) => {
    const resolve = get()._resolve;
    set({ visible: false, item: null, _resolve: null });
    if (resolve) resolve(result);
  },
}));
