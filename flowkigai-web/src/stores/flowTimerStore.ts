import { create } from "zustand";
import type { FlowSessionDto } from "@/api/flowSessionApi";

// ── State machine: Idle → Setup → Running → Paused → MicroReview → Complete
//                                    ↓
//                               Interrupted → Idle

export type TimerPhase = "idle" | "setup" | "running" | "paused" | "microreview" | "complete";

export interface SetupConfig {
  goalId: string | null;
  taskItemId: string | null;
  goalTitle: string;
  taskTitle: string;
  sessionIntention: string;
  plannedMinutes: number;
  energyLevel: string;  // "Deep" | "Medium" | "Shallow"
  ambientSound: string; // "None" | "BrownNoise" | "WhiteNoise" | "Nature"
  overTimeMode: "None" | "Visual" | "VisualAndTone";
}

interface FlowTimerState {
  phase: TimerPhase;
  elapsed: number;        // seconds since session started
  session: FlowSessionDto | null;
  setup: SetupConfig | null;
  completedSession: FlowSessionDto | null;

  // Actions
  startSetup: () => void;
  confirmSetup: (config: SetupConfig, session: FlowSessionDto) => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  beginMicroReview: () => void;
  complete: (session: FlowSessionDto) => void;
  reset: () => void;
  restoreRunning: (session: FlowSessionDto, elapsedSeconds: number) => void;
}

export const useFlowTimerStore = create<FlowTimerState>((set) => ({
  phase: "idle",
  elapsed: 0,
  session: null,
  setup: null,
  completedSession: null,

  startSetup: () => set({ phase: "setup" }),

  confirmSetup: (config, session) =>
    set({ phase: "running", setup: config, session, elapsed: 0 }),

  tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),

  pause: () => set({ phase: "paused" }),
  resume: () => set({ phase: "running" }),

  beginMicroReview: () => set({ phase: "microreview" }),

  complete: (session) =>
    set({ phase: "complete", completedSession: session, session: null }),

  reset: () =>
    set({ phase: "idle", elapsed: 0, session: null, setup: null, completedSession: null }),

  restoreRunning: (session, elapsedSeconds) =>
    set({ phase: "running", session, elapsed: elapsedSeconds }),
}));
