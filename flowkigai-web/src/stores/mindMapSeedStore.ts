import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProposedNodeDto } from "@/api/mindMapApi";

export type SeedStep = "idle" | "warning" | "path-choice" | "questions" | "generating" | "proposal";

interface MindMapSeedState {
  step: SeedStep;
  path: "practical" | "ikigai" | null;
  answers: { question: string; answer: string }[];
  currentAnswerInput: string;
  proposedNodes: ProposedNodeDto[];
  seedSummary: string;
  setStep: (step: SeedStep) => void;
  setPath: (path: "practical" | "ikigai") => void;
  addAnswer: (qa: { question: string; answer: string }) => void;
  setProposedNodes: (nodes: ProposedNodeDto[], summary: string) => void;
  removeProposedNode: (index: number) => void;
  editProposedNodeLabel: (index: number, label: string) => void;
  setCurrentAnswerInput: (input: string) => void;
  reset: () => void;
}

export const useMindMapSeedStore = create<MindMapSeedState>()(
  persist(
    (set) => ({
      step: "idle",
      path: null,
      answers: [],
      currentAnswerInput: "",
      proposedNodes: [],
      seedSummary: "",
      setStep: (step) => set({ step }),
      setPath: (path) => set({ path }),
      addAnswer: (qa) =>
        set((s) => ({ answers: [...s.answers, qa], currentAnswerInput: "" })),
      setProposedNodes: (nodes, summary) =>
        set({ proposedNodes: nodes, seedSummary: summary }),
      removeProposedNode: (index) =>
        set((s) => ({ proposedNodes: s.proposedNodes.filter((_, i) => i !== index) })),
      editProposedNodeLabel: (index, label) =>
        set((s) => ({
          proposedNodes: s.proposedNodes.map((n, i) => (i === index ? { ...n, label } : n)),
        })),
      setCurrentAnswerInput: (input) => set({ currentAnswerInput: input }),
      reset: () =>
        set({
          step: "idle",
          path: null,
          answers: [],
          currentAnswerInput: "",
          proposedNodes: [],
          seedSummary: "",
        }),
    }),
    { name: "flowkigai-mind-map-seed" }
  )
);
