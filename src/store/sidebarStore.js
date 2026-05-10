import { create } from 'zustand';

export const useSidebarStore = create(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
