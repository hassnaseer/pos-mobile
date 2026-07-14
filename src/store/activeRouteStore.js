import { create } from 'zustand';

export const useActiveRouteStore = create(set => ({
  activeRoute: null,
  setActiveRoute: name => set({ activeRoute: name }),
}));
