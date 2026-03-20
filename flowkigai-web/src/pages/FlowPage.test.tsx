import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockGetActive = vi.hoisted(() => vi.fn());
vi.mock("@/api/flowSessionApi", () => ({
  flowSessionApi: { getActive: mockGetActive },
}));

const mockRestoreRunning = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());
const mockStartSetup = vi.hoisted(() => vi.fn());

vi.mock("@/stores/flowTimerStore", () => ({
  useFlowTimerStore: vi.fn(),
}));

vi.mock("@/components/flow/PreSessionSetup", () => ({ default: () => <div>PreSessionSetup</div> }));
vi.mock("@/components/flow/FlowTimer", () => ({ default: () => <div>FlowTimer</div> }));
vi.mock("@/components/flow/MicroReview", () => ({ default: () => <div>MicroReview</div> }));
vi.mock("@/components/flow/SessionComplete", () => ({ default: () => <div>SessionComplete</div> }));
vi.mock("@/hooks/usePageAnalytics", () => ({ usePageAnalytics: vi.fn() }));

import { useFlowTimerStore } from "@/stores/flowTimerStore";
import FlowPage from "@/pages/FlowPage";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MOCK_SESSION = {
  id: "session-1",
  startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
  goalId: null,
  taskItemId: null,
  sessionIntention: null,
  plannedMinutes: 45,
  actualMinutes: null,
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

// FlowPage calls useFlowTimerStore() with no selector — return state object directly
function setStoreMock(phase: string) {
  (useFlowTimerStore as ReturnType<typeof vi.fn>).mockReturnValue({
    phase,
    restoreRunning: mockRestoreRunning,
    reset: mockReset,
    startSetup: mockStartSetup,
  });
}

function renderPage() {
  return render(<MemoryRouter><FlowPage /></MemoryRouter>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("FlowPage session restore logic", () => {
  beforeEach(() => {
    mockGetActive.mockReset();
    mockRestoreRunning.mockReset();
    mockReset.mockReset();
    mockStartSetup.mockReset();
  });

  it("when idle and DB has active session — calls restoreRunning", async () => {
    setStoreMock("idle");
    mockGetActive.mockResolvedValue(MOCK_SESSION);

    renderPage();

    await waitFor(() => {
      expect(mockRestoreRunning).toHaveBeenCalledWith(MOCK_SESSION, expect.any(Number));
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("when idle and DB has no session — stays idle, no restore", async () => {
    setStoreMock("idle");
    mockGetActive.mockResolvedValue(null);

    renderPage();

    // Wait for the checking phase to complete (spinner disappears)
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    expect(mockRestoreRunning).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("when running and DB has no session — calls reset (stale state)", async () => {
    setStoreMock("running");
    mockGetActive.mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
    expect(mockRestoreRunning).not.toHaveBeenCalled();
  });

  it("when paused and DB has no session — calls reset", async () => {
    setStoreMock("paused");
    mockGetActive.mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  it("when microreview and DB has active session — does NOT call restoreRunning", async () => {
    setStoreMock("microreview");
    mockGetActive.mockResolvedValue(MOCK_SESSION);

    renderPage();

    await waitFor(() => {
      expect(mockGetActive).toHaveBeenCalledTimes(1);
    });
    expect(mockRestoreRunning).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("when microreview and DB has no session — calls reset", async () => {
    setStoreMock("microreview");
    mockGetActive.mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  it("when getActive throws — shows error alert, no restore", async () => {
    setStoreMock("idle");
    mockGetActive.mockRejectedValue(new Error("network"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockRestoreRunning).not.toHaveBeenCalled();
  });
});
