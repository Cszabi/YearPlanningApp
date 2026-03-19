import { create } from "zustand";

export interface IkigaiThemeCategory {
  label: string;
  themes: string[];
}

export interface IkigaiExtractionResult {
  categories: IkigaiThemeCategory[];
}

interface IkigaiState {
  extractedThemes: IkigaiExtractionResult | null;
  hasSeededMindMap: boolean;
  setExtractedThemes: (t: IkigaiExtractionResult) => void;
  setHasSeededMindMap: (v: boolean) => void;
  clearIkigai: () => void;
}

export const useIkigaiStore = create<IkigaiState>()((set) => ({
  extractedThemes: null,
  hasSeededMindMap: false,
  setExtractedThemes: (t) => set({ extractedThemes: t }),
  setHasSeededMindMap: (v) => set({ hasSeededMindMap: v }),
  clearIkigai: () => set({ extractedThemes: null, hasSeededMindMap: false }),
}));
