import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockInterrupt = vi.hoisted(() => vi.fn());
vi.mock("@/api/flowSessionApi", () => ({
  flowSessionApi: { interrupt: mockInterrupt },
}));

vi.mock("@/api/musicApi", () => ({
  musicApi: { getFocusTracks: vi.fn().mockResolvedValue([]) },
}));

const mockReset = vi.hoisted(() => vi.fn());
const mockPause = vi.hoisted(() => vi.fn());
const mockResume = vi.hoisted(() => vi.fn());
const mockBeginMicroReview = vi.hoisted(() => vi.fn());

vi.mock("@/stores/flowTimerStore", () => ({
  useFlowTimerStore: vi.fn(),
}));

import { useFlowTimerStore } from "@/stores/flowTimerStore";
import FlowTimer from "@/components/flow/FlowTimer";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MOCK_SESSION = { id: "sess-1" };

// FlowTimer calls useFlowTimerStore() with no selector — return state object directly
function setStoreMock(overrides: object = {}) {
  (useFlowTimerStore as ReturnType<typeof vi.fn>).mockReturnValue({
    phase: "running",
    elapsed: 600,
    session: MOCK_SESSION,
    setup: {
      plannedMinutes: 45,
      taskTitle: "Test task",
      goalTitle: null,
      sessionIntention: null,
      ambientSound: "None",
    },
    tick: vi.fn(),
    pause: mockPause,
    resume: mockResume,
    beginMicroReview: mockBeginMicroReview,
    reset: mockReset,
    ...overrides,
  });
}

// Stub Web Audio API (not available in jsdom)
window.AudioContext = class {
  createBuffer() { return { getChannelData: () => new Float32Array() }; }
  createBufferSource() {
    return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: false, buffer: null };
  }
  createGain() { return { connect: vi.fn(), gain: { value: 0 } }; }
  createBiquadFilter() {
    return { connect: vi.fn(), type: "", frequency: { value: 0 }, Q: { value: 0 } };
  }
  get destination() { return {}; }
  get sampleRate() { return 44100; }
  close() { return Promise.resolve(); }
} as unknown as typeof AudioContext;

// Stub HTMLMediaElement.play/pause (not implemented in jsdom)
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("FlowTimer interrupt handler", () => {
  beforeEach(() => {
    mockInterrupt.mockReset();
    mockReset.mockReset();
    mockPause.mockReset();
    mockResume.mockReset();
    mockBeginMicroReview.mockReset();
  });

  it("opens interrupt dialog when Interrupt button clicked", async () => {
    setStoreMock();
    const user = userEvent.setup();
    render(<FlowTimer />);

    await user.click(screen.getByRole("button", { name: /interrupt/i }));

    await waitFor(() => {
      expect(screen.getByText("Record interruption")).toBeInTheDocument();
    });
  });

  it("calls flowSessionApi.interrupt with session id on confirm", async () => {
    mockInterrupt.mockResolvedValue({ ...MOCK_SESSION, wasInterrupted: true, endedAt: "2026-01-01" });
    setStoreMock();
    const user = userEvent.setup();
    render(<FlowTimer />);

    await user.click(screen.getByRole("button", { name: /interrupt/i }));
    await waitFor(() => screen.getByText("Record interruption"));
    await user.click(screen.getByRole("button", { name: /end & record/i }));

    await waitFor(() => {
      expect(mockInterrupt).toHaveBeenCalledWith("sess-1", expect.any(String));
    });
  });

  it("calls reset() after successful interrupt", async () => {
    mockInterrupt.mockResolvedValue({ wasInterrupted: true });
    setStoreMock();
    const user = userEvent.setup();
    render(<FlowTimer />);

    await user.click(screen.getByRole("button", { name: /interrupt/i }));
    await waitFor(() => screen.getByText("Record interruption"));
    await user.click(screen.getByRole("button", { name: /end & record/i }));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  it("does NOT call reset() when interrupt API fails", async () => {
    mockInterrupt.mockRejectedValue(new Error("Network error"));
    setStoreMock();
    const user = userEvent.setup();
    render(<FlowTimer />);

    await user.click(screen.getByRole("button", { name: /interrupt/i }));
    await waitFor(() => screen.getByText("Record interruption"));
    await user.click(screen.getByRole("button", { name: /end & record/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /end & record/i })).not.toBeDisabled();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("re-enables the button after interrupt API fails", async () => {
    mockInterrupt.mockRejectedValue(new Error("fail"));
    setStoreMock();
    const user = userEvent.setup();
    render(<FlowTimer />);

    await user.click(screen.getByRole("button", { name: /interrupt/i }));
    await waitFor(() => screen.getByText("Record interruption"));
    await user.click(screen.getByRole("button", { name: /end & record/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /end & record/i })).not.toBeDisabled();
    });
  });
});
