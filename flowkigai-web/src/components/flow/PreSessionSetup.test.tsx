import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockConfirmSetup = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());

vi.mock("@/stores/flowTimerStore", () => ({
  useFlowTimerStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ confirmSetup: mockConfirmSetup, reset: mockReset })
  ),
}));

const mockGetGoals = vi.hoisted(() => vi.fn());
vi.mock("@/api/goalApi", () => ({
  goalApi: { getGoals: mockGetGoals },
}));

const mockStart = vi.hoisted(() => vi.fn());
vi.mock("@/api/flowSessionApi", () => ({
  flowSessionApi: { start: mockStart },
}));

import PreSessionSetup from "@/components/flow/PreSessionSetup";

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderSetup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PreSessionSetup />
    </QueryClientProvider>
  );
}

const MOCK_SESSION = {
  id: "s1", goalId: null, taskItemId: null, sessionIntention: null,
  plannedMinutes: 45, actualMinutes: null, startedAt: new Date().toISOString(),
  endedAt: null, flowQualityRating: null, energyAfterRating: null,
  outcome: null, wasInterrupted: false, interruptionReason: null,
  blockers: null, ambientSound: "None", energyLevel: "Medium",
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("PreSessionSetup — over-time preference", () => {
  beforeEach(() => {
    mockGetGoals.mockResolvedValue([]);
    mockStart.mockReset();
    mockConfirmSetup.mockReset();
  });

  it("renders all three over-time option buttons", () => {
    renderSetup();
    expect(screen.getByRole("button", { name: /stay silent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /visual indicator/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /visual \+ soft tone/i })).toBeInTheDocument();
  });

  it("renders 'When I go over time' section label", () => {
    renderSetup();
    expect(screen.getByText(/when i go over time/i)).toBeInTheDocument();
  });

  it("defaults to 'Stay silent' selected (contained variant)", () => {
    renderSetup();
    const btn = screen.getByRole("button", { name: /stay silent/i });
    expect(btn).toHaveClass("MuiButton-contained");
  });

  it("switches selection when another option is clicked", async () => {
    renderSetup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /visual indicator/i }));

    expect(screen.getByRole("button", { name: /visual indicator/i })).toHaveClass("MuiButton-contained");
    expect(screen.getByRole("button", { name: /stay silent/i })).toHaveClass("MuiButton-outlined");
  });

  it("passes overTimeMode='None' to confirmSetup when Stay silent selected", async () => {
    mockStart.mockResolvedValue(MOCK_SESSION);
    renderSetup();
    const user = userEvent.setup();

    // Default is None — just click Begin
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockConfirmSetup).toHaveBeenCalledWith(
        expect.objectContaining({ overTimeMode: "None" }),
        MOCK_SESSION,
      );
    });
  });

  it("passes overTimeMode='Visual' to confirmSetup when Visual indicator selected", async () => {
    mockStart.mockResolvedValue(MOCK_SESSION);
    renderSetup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /visual indicator/i }));
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockConfirmSetup).toHaveBeenCalledWith(
        expect.objectContaining({ overTimeMode: "Visual" }),
        MOCK_SESSION,
      );
    });
  });

  it("passes overTimeMode='VisualAndTone' to confirmSetup when Visual + soft tone selected", async () => {
    mockStart.mockResolvedValue(MOCK_SESSION);
    renderSetup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /visual \+ soft tone/i }));
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockConfirmSetup).toHaveBeenCalledWith(
        expect.objectContaining({ overTimeMode: "VisualAndTone" }),
        MOCK_SESSION,
      );
    });
  });
});
