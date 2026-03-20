import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WeeklyReview from "@/components/reviews/WeeklyReview";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockGetWeeklyData  = vi.hoisted(() => vi.fn());
const mockGetReview      = vi.hoisted(() => vi.fn());
const mockCreateOrUpdate = vi.hoisted(() => vi.fn());
const mockUpdate         = vi.hoisted(() => vi.fn());
const mockGetJourney     = vi.hoisted(() => vi.fn());

vi.mock("@/api/reviewApi", () => ({
  reviewApi: {
    getWeeklyData:  mockGetWeeklyData,
    getReview:      mockGetReview,
    createOrUpdate: mockCreateOrUpdate,
    update:         mockUpdate,
  },
}));

vi.mock("@/api/ikigaiApi", () => ({
  ikigaiApi: { getJourney: mockGetJourney },
}));

// GoalProgressBar introduces complex rendering noise; stub it for review tests
vi.mock("@/components/goals/GoalProgressBar", () => ({
  default: () => null,
}));

// Clear call history between every test to prevent cross-test leakage
beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
const EMPTY_WEEK_DATA = {
  weekStartDate:    "2026-03-16",
  completedTasks:   [],
  carriedOverTasks: [],
  habitSummaries:   [],
  flowSummary: {
    sessionCount: 0, totalMinutes: 0, avgFlowQuality: null, bestOutcome: null,
  },
  activeGoals: [],
};

const EXISTING_REVIEW = {
  id:           "rev-1",
  reviewType:   "Weekly",
  periodStart:  "2026-03-16T00:00:00Z",
  periodEnd:    "2026-03-22T00:00:00Z",
  isComplete:   false,
  completedAt:  null,
  energyRating: 4,
  answers: { priority1: "Finish the audit", carriedOverNote: "Bug from last week" },
  createdAt:    "2026-03-16T08:00:00Z",
  updatedAt:    "2026-03-16T08:00:00Z",
};

const SAVED_REVIEW = { ...EXISTING_REVIEW, id: "rev-new" };

// Helper that wraps the component in a fresh QueryClient for isolation
function renderReview(weekStartDate = "2026-03-16") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={qc}>
      <WeeklyReview weekStartDate={weekStartDate} onBack={vi.fn()} />
    </QueryClientProvider>,
  );
  return result;
}

// ── Existing review population ────────────────────────────────────────────────
describe("WeeklyReview — existing review population", () => {
  beforeEach(() => {
    mockGetWeeklyData.mockResolvedValue(EMPTY_WEEK_DATA);
    mockGetJourney.mockResolvedValue(null);
  });

  it("populates fields from existing review answers", async () => {
    mockGetReview.mockResolvedValue(EXISTING_REVIEW);
    renderReview();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Finish the audit")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Bug from last week")).toBeInTheDocument();
  });

  it("shows Completed chip when review is already complete", async () => {
    mockGetReview.mockResolvedValue({ ...EXISTING_REVIEW, isComplete: true });
    renderReview();

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("starts with empty priority fields when no existing review", async () => {
    mockGetReview.mockResolvedValue(null);
    renderReview();

    // Wait until loading spinner disappears
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("Priority 1")).toHaveValue("");
  });
});

// ── Manual save ───────────────────────────────────────────────────────────────
describe("WeeklyReview — manual save", () => {
  beforeEach(() => {
    mockGetWeeklyData.mockResolvedValue(EMPTY_WEEK_DATA);
    mockGetReview.mockResolvedValue(null);
    mockGetJourney.mockResolvedValue(null);
    mockCreateOrUpdate.mockResolvedValue(SAVED_REVIEW);
  });

  it("POSTs review data with correct fields when Save is clicked", async () => {
    const user = userEvent.setup();
    renderReview();

    await waitFor(() => expect(screen.getByLabelText("Priority 1")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Priority 1"), "Ship feature X");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewType:  "Weekly",
          periodStart: "2026-03-16",
          answers:     expect.objectContaining({ priority1: "Ship feature X" }),
        }),
      );
    });
  }, 15_000);

  it("shows '✓ Saved' after a successful save", async () => {
    const user = userEvent.setup();
    renderReview();

    await waitFor(() => expect(screen.getByLabelText("Priority 1")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Priority 1"), "Done");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText("✓ Saved")).toBeInTheDocument());
  });

  it("shows 'Save failed' when the API throws", async () => {
    mockCreateOrUpdate.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    renderReview();

    await waitFor(() => expect(screen.getByLabelText("Priority 1")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Priority 1"), "Done");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText("Save failed")).toBeInTheDocument());
  });

  it("uses PUT (update) when review already has a savedId", async () => {
    mockGetReview.mockResolvedValue(EXISTING_REVIEW);
    mockUpdate.mockResolvedValue(EXISTING_REVIEW);
    const user = userEvent.setup();
    renderReview();

    await waitFor(() => expect(screen.getByDisplayValue("Finish the audit")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Priority 2"), "New priority");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "rev-1",
        expect.objectContaining({
          answers: expect.objectContaining({ priority2: "New priority" }),
        }),
      );
    });
    // Must NOT fall back to POST when an id is already known
    expect(mockCreateOrUpdate).not.toHaveBeenCalled();
  });
});

// ── Complete review ───────────────────────────────────────────────────────────
describe("WeeklyReview — complete review", () => {
  beforeEach(() => {
    mockGetWeeklyData.mockResolvedValue(EMPTY_WEEK_DATA);
    mockGetReview.mockResolvedValue(null);
    mockGetJourney.mockResolvedValue(null);
    mockCreateOrUpdate.mockResolvedValue({ ...SAVED_REVIEW, isComplete: true });
  });

  it("sends isComplete: true when 'Complete this review' is clicked", async () => {
    const user = userEvent.setup();
    renderReview();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /complete this review/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /complete this review/i }));

    await waitFor(() => {
      expect(mockCreateOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ isComplete: true }),
      );
    });
  });

  it("hides Complete button and shows Completed chip after completion", async () => {
    const user = userEvent.setup();
    renderReview();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /complete this review/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /complete this review/i }));

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /complete this review/i })).not.toBeInTheDocument();
    });
  });
});

// ── Stale-closure regression guard ───────────────────────────────────────────
// Before fix: the auto-save useEffect cleanup captured a stale `doSave` closure
// that had `isDirty=false` (set by previous stale saves), causing the unmount
// save to skip silently.  After fix (doSaveRef pattern), the cleanup always
// calls the latest `doSave` with current values.
describe("WeeklyReview — stale-closure fix (save on unmount)", () => {
  beforeEach(() => {
    mockGetWeeklyData.mockResolvedValue(EMPTY_WEEK_DATA);
    mockGetReview.mockResolvedValue(null);
    mockGetJourney.mockResolvedValue(null);
    mockCreateOrUpdate.mockResolvedValue(SAVED_REVIEW);
    mockUpdate.mockResolvedValue(SAVED_REVIEW);
  });

  it("saves the current (non-stale) field values when the component unmounts", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <WeeklyReview weekStartDate="2026-03-16" onBack={vi.fn()} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("Priority 1")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Priority 1"), "Unmount value");

    // Unmount triggers the cleanup, which must call doSaveRef.current()
    // (the latest doSave with current field values, not a stale closure copy)
    await act(async () => { unmount(); });

    // The last createOrUpdate / update call must contain "Unmount value"
    const allCalls = [
      ...mockCreateOrUpdate.mock.calls,
      ...mockUpdate.mock.calls,
    ];
    const lastCall = allCalls[allCalls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall[0]).toMatchObject({
      answers: expect.objectContaining({ priority1: "Unmount value" }),
    });
  });
});
