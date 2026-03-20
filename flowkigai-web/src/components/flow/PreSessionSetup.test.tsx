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

// ── Tests: custom duration with unit selector ──────────────────────────────────
describe("PreSessionSetup — custom duration with unit", () => {
  beforeEach(() => {
    mockGetGoals.mockResolvedValue([]);
    mockStart.mockReset();
    mockConfirmSetup.mockReset();
  });

  it("renders the min/hr toggle buttons", () => {
    renderSetup();
    expect(screen.getByRole("button", { name: "min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "hr" })).toBeInTheDocument();
  });

  it("defaults to 'min' unit selected", () => {
    renderSetup();
    // The MUI ToggleButton for "min" should have the selected class
    expect(screen.getByRole("button", { name: "min" })).toHaveClass("Mui-selected");
    expect(screen.getByRole("button", { name: "hr" })).not.toHaveClass("Mui-selected");
  });

  it("accepts value of 1 as valid in minutes", async () => {
    renderSetup();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/custom/i);
    await user.type(input, "1");
    expect(screen.queryByText(/min\. 1/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /begin session/i })).not.toBeDisabled();
  });

  it("shows error and disables Begin when custom value is 0", async () => {
    renderSetup();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/custom/i);
    await user.type(input, "0");
    expect(await screen.findByText(/min\. 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /begin session/i })).toBeDisabled();
  });

  it("passes plannedMinutes = custom minutes value when unit is min", async () => {
    mockStart.mockResolvedValue({ ...MOCK_SESSION, plannedMinutes: 20 });
    renderSetup();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/custom/i);
    await user.type(input, "20");
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ plannedMinutes: 20 }),
      );
    });
  });

  it("passes plannedMinutes = value * 60 when unit is hr", async () => {
    mockStart.mockResolvedValue({ ...MOCK_SESSION, plannedMinutes: 120 });
    renderSetup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "hr" }));
    const input = screen.getByPlaceholderText(/custom/i);
    await user.type(input, "2");
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ plannedMinutes: 120 }),
      );
    });
  });

  it("clears custom value when a preset button is clicked", async () => {
    renderSetup();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/custom/i);
    await user.type(input, "30");
    expect(input).toHaveValue("30");

    await user.click(screen.getByRole("button", { name: /^45m$/i }));
    expect(input).toHaveValue("");
  });

  it("uses preset minutes when custom field is empty", async () => {
    mockStart.mockResolvedValue(MOCK_SESSION);
    renderSetup();
    const user = userEvent.setup();

    // Default energy=Medium, preset=45
    await user.click(screen.getByRole("button", { name: /begin session/i }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ plannedMinutes: 45 }),
      );
    });
  });
});
