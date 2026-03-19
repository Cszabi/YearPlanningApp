import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── API mock ──────────────────────────────────────────────────────────────────
const mockGetPageAnalytics = vi.hoisted(() => vi.fn());

vi.mock("@/api/analyticsApi", () => ({
  analyticsApi: { getPageAnalytics: mockGetPageAnalytics },
}));

// recharts uses ResizeObserver — stub it for jsdom
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import AnalyticsDashboardPage from "./AnalyticsDashboardPage";

const MOCK_DATA = {
  page: "/ikigai",
  averageDurationSeconds: 125,
  medianDurationSeconds: 90,
  totalSessions: 42,
  uniqueUsers: 15,
  dropOffRate: 0.12,
  topActions: [
    { actionType: "goal_wizard_opened", count: 20, percentOfSessions: 0.48 },
    { actionType: "habit_wizard_opened", count: 10, percentOfSessions: 0.24 },
  ],
  durationBuckets: [
    { label: "< 10s", count: 5 },
    { label: "10–30s", count: 8 },
    { label: "30–60s", count: 12 },
    { label: "1–3m", count: 11 },
    { label: "3–5m", count: 4 },
    { label: "> 5m", count: 2 },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AnalyticsDashboardPage />
    </QueryClientProvider>
  );
}

describe("AnalyticsDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPageAnalytics.mockResolvedValue(MOCK_DATA);
  });

  it("renders the header and filter controls", () => {
    renderPage();
    expect(screen.getByText("Page Analytics")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument(); // MUI Select
    // MUI TextField renders label text twice (label + fieldset legend span)
    expect(screen.getAllByText("From").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("To").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("shows loading spinner while fetching", () => {
    mockGetPageAnalytics.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders summary stat cards after load", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("2m 5s")).toBeInTheDocument()); // avg 125s
    expect(screen.getByText("1m 30s")).toBeInTheDocument();  // median 90s
    expect(screen.getByText("42")).toBeInTheDocument();       // total sessions
    expect(screen.getByText("15")).toBeInTheDocument();       // unique users
    expect(screen.getByText("12%")).toBeInTheDocument();      // drop-off
  });

  it("renders top actions table with correct data", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Top Actions")).toBeInTheDocument());
    expect(screen.getByText("goal_wizard_opened")).toBeInTheDocument();
    expect(screen.getByText("habit_wizard_opened")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
  });

  it("shows error alert when API fails", async () => {
    mockGetPageAnalytics.mockRejectedValue(new Error("network"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Failed to load analytics data.")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("calls API with updated date when Apply is clicked after changing From", async () => {
    renderPage();
    await waitFor(() => expect(mockGetPageAnalytics).toHaveBeenCalledTimes(1));
    const [, firstFromDate] = mockGetPageAnalytics.mock.calls[0] as string[];

    // Change the From date to something different
    const fromInput = screen.getByDisplayValue(firstFromDate);
    fireEvent.change(fromInput, { target: { value: "2025-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(mockGetPageAnalytics).toHaveBeenLastCalledWith(
        expect.any(String), "2025-01-01", expect.any(String)
      )
    );
  });
});
