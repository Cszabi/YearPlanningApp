import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DashboardDto } from "@/api/dashboardApi";

// ── API mocks ────────────────────────────────────────────────────────────────
const mockGetDashboard = vi.hoisted(() => vi.fn());
const mockUpdateTaskStatus = vi.hoisted(() => vi.fn());
const mockLogHabit = vi.hoisted(() => vi.fn());

vi.mock("@/api/dashboardApi", () => ({
  dashboardApi: { getDashboard: mockGetDashboard },
}));

vi.mock("@/api/goalApi", () => ({
  goalApi: { updateTaskStatus: mockUpdateTaskStatus },
}));

vi.mock("@/api/habitApi", () => ({
  habitApi: { logHabit: mockLogHabit },
}));

// ── Store mocks ──────────────────────────────────────────────────────────────
const mockStartSetup = vi.hoisted(() => vi.fn());
vi.mock("@/stores/flowTimerStore", () => ({
  useFlowTimerStore: (selector: (s: { startSetup: typeof mockStartSetup }) => unknown) =>
    selector({ startSetup: mockStartSetup }),
}));

vi.mock("@/hooks/usePageAnalytics", () => ({
  usePageAnalytics: () => ({ logAction: vi.fn() }),
}));

import DashboardPage from "./DashboardPage";

// ── Fixtures ─────────────────────────────────────────────────────────────────
function fullDto(overrides: Partial<DashboardDto> = {}): DashboardDto {
  return {
    northStar: "Create tools that help people live intentionally",
    topValues: ["Creativity", "Growth", "Courage"],
    ikigaiDistribution: { love: 3, goodAt: 2, worldNeeds: 1, paidFor: 1, intersection: 0 },
    dailyQuestion: "What would your future self thank you for today?",
    nextAction: {
      id: "t1",
      goalId: "g1",
      title: "Read chapter 1",
      goalTitle: "Learn Rust",
      status: "NotStarted",
      dueDate: new Date().toISOString(),
      isNextAction: true,
    },
    todaysTasks: [
      {
        id: "t2",
        goalId: "g1",
        title: "Write tests",
        goalTitle: "Learn Rust",
        status: "NotStarted",
        dueDate: new Date().toISOString(),
        isNextAction: false,
      },
    ],
    todaysHabits: [
      { goalId: "g2", habitId: "h1", title: "Meditate", currentStreak: 5, loggedToday: false, frequency: "Daily" },
      { goalId: "g2", habitId: "h2", title: "Read", currentStreak: 3, loggedToday: true, frequency: "Daily" },
    ],
    nearestDeadline: { goalId: "g1", title: "Learn Rust", targetDate: new Date(Date.now() + 5 * 86400000).toISOString(), daysRemaining: 5 },
    weeklyFlowMinutes: [0, 25, 50, 30, 0, 0, 0],
    activeGoalCount: 3,
    flowInsight: { bestDayOfWeek: "Wednesday", bestHourOfDay: 9, totalDeepWorkMinutesThisWeek: 105 },
    reviewStatus: "Done",
    habitStreakRiskCount: 1,
    lastReflection: { content: "Shipped the dashboard feature.", createdAt: new Date(Date.now() - 86400000).toISOString() },
    ...overrides,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Skeleton while loading
  it("shows skeletons while loading", () => {
    mockGetDashboard.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    // MUI Skeleton components render as spans with class MuiSkeleton-root
    const skeletons = document.querySelectorAll(".MuiSkeleton-root");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // 2. Error + retry
  it("shows error alert with retry on API failure", async () => {
    mockGetDashboard.mockRejectedValue(new Error("network"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  // 3. North Star
  it("renders North Star statement", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Create tools that help people live intentionally/)).toBeInTheDocument();
    });
  });

  // 4. Empty North Star → CTA
  it("shows CTA when no North Star", async () => {
    mockGetDashboard.mockResolvedValue(fullDto({ northStar: null }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/your north star awaits/i)).toBeInTheDocument();
    });
  });

  // 5. Top values chips
  it("renders top 3 value chips", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Creativity")).toBeInTheDocument();
      expect(screen.getByText("Growth")).toBeInTheDocument();
      expect(screen.getByText("Courage")).toBeInTheDocument();
    });
  });

  // 6. Daily question
  it("renders daily question", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/what would your future self/i)).toBeInTheDocument();
    });
  });

  // 7. Next action
  it("renders next action with bolt icon", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Read chapter 1")).toBeInTheDocument();
      // "Learn Rust" appears in both next action and today's tasks
      expect(screen.getAllByText("Learn Rust").length).toBeGreaterThanOrEqual(1);
    });
  });

  // 8. Flow quick-start button
  it("renders flow quick-start button", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start 25-min flow session/i })).toBeInTheDocument();
    });
  });

  // 9. Active goal count
  it("renders active goal count", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Active goals")).toBeInTheDocument();
    });
  });

  // 10. Review status chip
  it("renders review status chip", async () => {
    mockGetDashboard.mockResolvedValue(fullDto({ reviewStatus: "Overdue" }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Review overdue")).toBeInTheDocument();
    });
  });

  // 11. Reflect strip — last reflection
  it("renders last reflection quote", async () => {
    mockGetDashboard.mockResolvedValue(fullDto());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/shipped the dashboard feature/i)).toBeInTheDocument();
    });
  });

  // 12. Reflect strip — empty → CTA
  it("shows CTA when no reflection", async () => {
    mockGetDashboard.mockResolvedValue(fullDto({ lastReflection: null }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/your first weekly review waits/i)).toBeInTheDocument();
    });
  });
});
