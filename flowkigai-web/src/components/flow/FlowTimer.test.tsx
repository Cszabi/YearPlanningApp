import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockInterrupt = vi.hoisted(() => vi.fn());
vi.mock("@/api/flowSessionApi", () => ({
  flowSessionApi: { interrupt: mockInterrupt },
}));

const mockGetFocusTracks = vi.hoisted(() => vi.fn());
vi.mock("@/api/musicApi", () => ({
  musicApi: { getFocusTracks: mockGetFocusTracks },
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
  (useFlowTimerStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    phase: "running",
    elapsed: 600,           // 10 min elapsed, well within 45 min planned
    session: MOCK_SESSION,
    setup: {
      plannedMinutes: 45,
      taskTitle: "Test task",
      goalTitle: null,
      sessionIntention: null,
      ambientSound: "None",
      overTimeMode: "None",
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
  createOscillator() {
    return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: "sine", frequency: { value: 0 } };
  }
  get destination() { return {}; }
  get sampleRate() { return 44100; }
  close() { return Promise.resolve(); }
} as unknown as typeof AudioContext;

// Stub HTMLMediaElement.play/pause (not implemented in jsdom)
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

// ── Interrupt handler ─────────────────────────────────────────────────────────
describe("FlowTimer interrupt handler", () => {
  beforeEach(() => {
    mockInterrupt.mockReset();
    mockReset.mockReset();
    mockPause.mockReset();
    mockResume.mockReset();
    mockBeginMicroReview.mockReset();
    mockGetFocusTracks.mockResolvedValue([]);
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

// ── Over-time visual indicator ─────────────────────────────────────────────────
describe("FlowTimer over-time visual indicator", () => {
  const OVER_ELAPSED = 45 * 60 + 65; // 45 min + 65 s = 1 min over

  beforeEach(() => {
    mockGetFocusTracks.mockResolvedValue([]);
  });

  function overTimeStore(overTimeMode: string) {
    setStoreMock({
      elapsed: OVER_ELAPSED,
      setup: {
        plannedMinutes: 45,
        taskTitle: "",
        goalTitle: null,
        sessionIntention: null,
        ambientSound: "None",
        overTimeMode,
      },
    });
  }

  it("shows 'min over' label when overTimeMode is Visual and elapsed > planned", () => {
    overTimeStore("Visual");
    render(<FlowTimer />);
    expect(screen.getByText(/min over/i)).toBeInTheDocument();
  });

  it("shows 'min over' label when overTimeMode is VisualAndTone", () => {
    overTimeStore("VisualAndTone");
    render(<FlowTimer />);
    expect(screen.getByText(/min over/i)).toBeInTheDocument();
  });

  it("does NOT show 'min over' label when overTimeMode is None", () => {
    overTimeStore("None");
    render(<FlowTimer />);
    expect(screen.queryByText(/min over/i)).not.toBeInTheDocument();
  });

  it("does NOT show 'min over' label when within planned time", () => {
    setStoreMock({
      elapsed: 600, // 10 min, well within 45 min planned
      setup: {
        plannedMinutes: 45,
        taskTitle: "",
        goalTitle: null,
        sessionIntention: null,
        ambientSound: "None",
        overTimeMode: "Visual",
      },
    });
    render(<FlowTimer />);
    expect(screen.queryByText(/min over/i)).not.toBeInTheDocument();
  });

  it("does NOT show 'min over' label at exactly planned time", () => {
    setStoreMock({
      elapsed: 45 * 60, // exactly at limit
      setup: {
        plannedMinutes: 45,
        taskTitle: "",
        goalTitle: null,
        sessionIntention: null,
        ambientSound: "None",
        overTimeMode: "Visual",
      },
    });
    render(<FlowTimer />);
    expect(screen.queryByText(/min over/i)).not.toBeInTheDocument();
  });
});

// ── Music strip states ─────────────────────────────────────────────────────────
describe("FlowTimer music strip", () => {
  beforeEach(() => {
    mockGetFocusTracks.mockReset();
    setStoreMock();
  });

  it("shows loading state before fetch resolves", () => {
    // Never-resolving promise keeps strip in loading state
    mockGetFocusTracks.mockReturnValue(new Promise(() => {}));
    render(<FlowTimer />);
    expect(screen.getByText(/loading music/i)).toBeInTheDocument();
  });

  it("shows 'Unavailable' when Jamendo returns no tracks", async () => {
    mockGetFocusTracks.mockResolvedValue([]);
    render(<FlowTimer />);
    await waitFor(() => {
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows 'Unavailable' when fetch throws", async () => {
    mockGetFocusTracks.mockRejectedValue(new Error("Network"));
    render(<FlowTimer />);
    await waitFor(() => {
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });
  });

  it("disables mute and skip buttons when unavailable", async () => {
    mockGetFocusTracks.mockResolvedValue([]);
    render(<FlowTimer />);
    await waitFor(() => screen.getByText(/unavailable/i));
    // Both icon buttons should be disabled
    const buttons = screen.getAllByRole("button");
    const iconButtons = buttons.filter((b) => b.closest(".MuiIconButton-root") !== null || b.classList.contains("MuiIconButton-root"));
    iconButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("shows track name and artist when tracks are available", async () => {
    mockGetFocusTracks.mockResolvedValue([{
      id: "t1",
      name: "Deep Focus",
      artistName: "Artist A",
      audioUrl: "https://example.com/track.mp3",
      durationSeconds: 300,
    }]);
    render(<FlowTimer />);
    await waitFor(() => {
      expect(screen.getByText("Deep Focus")).toBeInTheDocument();
    });
    expect(screen.getByText(/Artist A/)).toBeInTheDocument();
  });

  it("shows 'Now playing' label when tracks are available and not muted", async () => {
    mockGetFocusTracks.mockResolvedValue([{
      id: "t1", name: "Focus Track", artistName: "Artist",
      audioUrl: "https://example.com/t.mp3", durationSeconds: 300,
    }]);
    render(<FlowTimer />);
    await waitFor(() => {
      expect(screen.getByText(/now playing/i)).toBeInTheDocument();
    });
  });
});
