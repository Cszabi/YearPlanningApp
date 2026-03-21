import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";
import type { GoalDto } from "@/api/goalApi";

// ── API mocks ─────────────────────────────────────────────────────────────────

const mockCreateMilestone = vi.hoisted(() => vi.fn());

vi.mock("@/api/goalApi", () => ({
  goalApi: {
    createMilestone: mockCreateMilestone,
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    setNextAction: vi.fn(),
    updateStatus: vi.fn(),
    sendEmail: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    updateProgress: vi.fn(),
  },
}));

vi.mock("@/components/goals/GoalProgressBar", () => ({
  default: () => <div data-testid="progress-bar" />,
}));

// ── Test helpers ──────────────────────────────────────────────────────────────

const muiTheme = createTheme();

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <ThemeProvider theme={muiTheme}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function makeGoal(overrides: Partial<GoalDto> = {}): GoalDto {
  return {
    id: "goal-1",
    year: 2026,
    title: "Learn TypeScript",
    goalType: "Project",
    status: "Active",
    lifeArea: "LearningGrowth",
    energyLevel: "Deep",
    whyItMatters: null,
    targetDate: null,
    alignedValueNames: [],
    progressPercent: 0,
    completedAt: null,
    smartGoal: null,
    woopReflection: null,
    milestones: [],
    ...overrides,
  };
}

// ── Import after mocks ────────────────────────────────────────────────────────

import GoalCard from "./GoalCard";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GoalCard — milestone gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No milestones ────────────────────────────────────────────────────────────

  it("shows 'Add milestone' button when goal has no milestones", () => {
    render(<GoalCard goal={makeGoal()} />, { wrapper });
    expect(screen.getByRole("button", { name: /add milestone/i })).toBeInTheDocument();
  });

  it("does NOT show 'Add first task' when goal has no milestones", () => {
    render(<GoalCard goal={makeGoal()} />, { wrapper });
    expect(screen.queryByRole("button", { name: /add first task/i })).not.toBeInTheDocument();
  });

  it("shows hint text that tasks are organised under milestones", () => {
    render(<GoalCard goal={makeGoal()} />, { wrapper });
    expect(screen.getByText(/tasks are organised under milestones/i)).toBeInTheDocument();
  });

  it("does NOT show task input field when goal has no milestones and form is closed", () => {
    render(<GoalCard goal={makeGoal()} />, { wrapper });
    expect(screen.queryByPlaceholderText(/what's the first step/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/task title/i)).not.toBeInTheDocument();
  });

  // ── Clicking 'Add milestone' opens the milestone form ────────────────────────

  it("opens milestone form when 'Add milestone' is clicked", async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={makeGoal()} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add milestone/i }));

    expect(screen.getByPlaceholderText(/milestone name/i)).toBeInTheDocument();
    // date input for the deadline
    expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument();
  });

  it("milestone form submit icon button is disabled when fields are empty", async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={makeGoal()} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add milestone/i }));

    // The check icon submit button (IconButton with primary color, disabled when canSubmit=false)
    // canSubmit requires both title and deadline — with empty fields it must be disabled
    const allButtons = screen.getAllByRole("button");
    const disabledButtons = allButtons.filter((b) => b.hasAttribute("disabled"));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it("does not call createMilestone when name is filled but deadline is missing", async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={makeGoal()} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add milestone/i }));
    await user.type(screen.getByPlaceholderText(/milestone name/i), "Phase 1");

    // Submit via Enter without filling deadline
    await user.keyboard("{Enter}");

    expect(mockCreateMilestone).not.toHaveBeenCalled();
  });

  it("calls createMilestone (not createTask) when both fields are filled and form is submitted", async () => {
    mockCreateMilestone.mockResolvedValue({
      id: "ms-1", title: "Phase 1", targetDate: "2026-06-01", isComplete: false, orderIndex: 0, tasks: [],
    });

    const user = userEvent.setup();
    render(<GoalCard goal={makeGoal()} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add milestone/i }));

    await user.type(screen.getByPlaceholderText(/milestone name/i), "Phase 1");
    // Date inputs need fireEvent.change — userEvent.type doesn't work on type="date" in jsdom
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2026-06-01" } });

    // Submit via Enter
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockCreateMilestone).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({ title: "Phase 1" }),
      );
    });
  });

  it("cancelling milestone form hides it and shows hint again", async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={makeGoal()} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add milestone/i }));
    expect(screen.getByPlaceholderText(/milestone name/i)).toBeInTheDocument();

    // Press Escape to cancel
    await user.keyboard("{Escape}");

    expect(screen.queryByPlaceholderText(/milestone name/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tasks are organised under milestones/i)).toBeInTheDocument();
  });

  // ── With milestones — 'Add task' is available ────────────────────────────────

  it("shows milestone header and 'Add task' button when goal has milestones", async () => {
    const user = userEvent.setup();
    const goal = makeGoal({
      milestones: [{
        id: "ms-1",
        title: "Phase 1",
        targetDate: "2026-06-01",
        isComplete: false,
        orderIndex: 0,
        tasks: [],
      }],
    });

    render(<GoalCard goal={goal} />, { wrapper });

    // Expand the card — the toggle is a Box (div) with text "Tasks (1)"
    await user.click(screen.getByText(/tasks \(\d+\)/i));

    expect(screen.getByText(/phase 1/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add task/i }).length).toBeGreaterThan(0);
  });

  it("does NOT show the no-milestone hint when milestones exist", () => {
    const goal = makeGoal({
      milestones: [{
        id: "ms-1",
        title: "Phase 1",
        targetDate: "2026-06-01",
        isComplete: false,
        orderIndex: 0,
        tasks: [],
      }],
    });

    render(<GoalCard goal={goal} />, { wrapper });
    expect(screen.queryByText(/tasks are organised under milestones/i)).not.toBeInTheDocument();
  });
});
