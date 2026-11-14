import { createContext, useContext } from 'react';

// Lightweight app-wide UI actions (open an explanation, start the tour, navigate).
export const UiContext = createContext({
  openExplain: () => {},
  openTour: () => {},
  goToTab: () => {},
  openPanel: () => {},
});

export function useUi() {
  return useContext(UiContext);
}
