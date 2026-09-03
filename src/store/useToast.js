import { create } from 'zustand';

let nextId = 1;
let hideTimer = null;

// Minimal global toast queue: one message on screen at a time, auto-dismissed.
// A plain store (not a hook-only API) so services with no component context —
// like the rewarded-ad flow — can call showToast() directly.
export const useToast = create((set) => ({
  toast: null, // { id, message }
  show: (message, durationMs = 3000) => {
    clearTimeout(hideTimer);
    const id = nextId++;
    set({ toast: { id, message } });
    hideTimer = setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, durationMs);
  },
  hide: () => {
    clearTimeout(hideTimer);
    set({ toast: null });
  },
}));

export const showToast = (message, durationMs) => useToast.getState().show(message, durationMs);
