import { describe, it, expect, beforeEach } from "vitest";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import type { FlowSessionDto } from "@/api/flowSessionApi";
import type { SetupConfig } from "@/stores/flowTimerStore";

const mockSession: FlowSessionDto = {
  id: "s1",
  goalId: null,
  taskItemId: null,
  sessionIntention: null,
  plannedMinutes: 25,
  actualMinutes: null,
  startedAt: new Date().toISOString(),
  endedAt: null,
  flowQualityRating: null,
  energyAfterRating: null,
  outcome: null,
  wasInterrupted: false,
  interruptionReason: null,
  blockers: null,
  ambientSound: "None",
  energyLevel: "Deep",
};

const mockConfig: SetupConfig = {
  goalId: null,
  taskItemId: null,
  goalTitle: "",
  taskTitle: "",
  sessionIntention: "",
  plannedMinutes: 25,
  energyLevel: "Deep",
  ambientSound: "None",
};

describe("flowTimerStore", () => {
  beforeEach(() => {
    useFlowTimerStore.setState({
      phase: "idle",
      elapsed: 0,
      session: null,
      setup: null,
      completedSession: null,
    });
  });

  it("initial phase is idle", () => {
    const { phase, elapsed, session, setup } = useFlowTimerStore.getState();
    expect(phase).toBe("idle");
    expect(elapsed).toBe(0);
    expect(session).toBeNull();
    expect(setup).toBeNull();
  });

  it("startSetup transitions to setup", () => {
    useFlowTimerStore.getState().startSetup();
    expect(useFlowTimerStore.getState().phase).toBe("setup");
  });

  it("confirmSetup transitions to running with session", () => {
    useFlowTimerStore.getState().confirmSetup(mockConfig, mockSession);
    const { phase, session, setup } = useFlowTimerStore.getState();
    expect(phase).toBe("running");
    expect(session).toEqual(mockSession);
    expect(setup).toEqual(mockConfig);
  });

  it("pause transitions to paused", () => {
    useFlowTimerStore.setState({ phase: "running" });
    useFlowTimerStore.getState().pause();
    expect(useFlowTimerStore.getState().phase).toBe("paused");
  });

  it("resume transitions back to running", () => {
    useFlowTimerStore.setState({ phase: "paused" });
    useFlowTimerStore.getState().resume();
    expect(useFlowTimerStore.getState().phase).toBe("running");
  });

  it("beginMicroReview transitions to microreview", () => {
    useFlowTimerStore.setState({ phase: "running" });
    useFlowTimerStore.getState().beginMicroReview();
    expect(useFlowTimerStore.getState().phase).toBe("microreview");
  });

  it("complete sets phase to complete and stores session", () => {
    const completedSession: FlowSessionDto = { ...mockSession, endedAt: new Date().toISOString(), actualMinutes: 25 };
    useFlowTimerStore.getState().complete(completedSession);
    const { phase, completedSession: stored, session } = useFlowTimerStore.getState();
    expect(phase).toBe("complete");
    expect(stored).toEqual(completedSession);
    expect(session).toBeNull();
  });

  it("reset returns to idle and clears all state", () => {
    useFlowTimerStore.setState({
      phase: "running",
      elapsed: 120,
      session: mockSession,
      setup: mockConfig,
      completedSession: null,
    });
    useFlowTimerStore.getState().reset();
    const { phase, elapsed, session, setup, completedSession } = useFlowTimerStore.getState();
    expect(phase).toBe("idle");
    expect(elapsed).toBe(0);
    expect(session).toBeNull();
    expect(setup).toBeNull();
    expect(completedSession).toBeNull();
  });

  it("tick increments elapsed", () => {
    useFlowTimerStore.setState({ elapsed: 5 });
    useFlowTimerStore.getState().tick();
    expect(useFlowTimerStore.getState().elapsed).toBe(6);
    useFlowTimerStore.getState().tick();
    expect(useFlowTimerStore.getState().elapsed).toBe(7);
  });
});
