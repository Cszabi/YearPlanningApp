import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUpdateProgress = vi.hoisted(() => vi.fn());

vi.mock("@/api/goalApi", () => ({
  goalApi: {
    updateProgress: mockUpdateProgress,
  },
}));

import GoalProgressBar from "./GoalProgressBar";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const GOAL_ID = "goal-123";

describe("GoalProgressBar", () => {
  beforeEach(() => {
    mockUpdateProgress.mockReset();
  });

  it("renders the current percent", () => {
    render(<GoalProgressBar percent={42} goalId={GOAL_ID} />, { wrapper });
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders progress label", () => {
    render(<GoalProgressBar percent={0} goalId={GOAL_ID} />, { wrapper });
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  it("does not show edit button when editable is false", () => {
    render(<GoalProgressBar percent={50} goalId={GOAL_ID} editable={false} />, { wrapper });
    expect(screen.queryByTitle("Update progress")).not.toBeInTheDocument();
  });

  it("shows edit button when editable is true", () => {
    render(<GoalProgressBar percent={50} goalId={GOAL_ID} editable />, { wrapper });
    expect(screen.getByRole("button", { name: /update progress/i })).toBeInTheDocument();
  });

  it("opens edit controls when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<GoalProgressBar percent={30} goalId={GOAL_ID} editable />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("closes edit mode on cancel without calling API", async () => {
    const user = userEvent.setup();
    render(<GoalProgressBar percent={30} goalId={GOAL_ID} editable />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });

  it("calls updateProgress with correct args on save", async () => {
    const onUpdated = vi.fn();
    mockUpdateProgress.mockResolvedValue({
      id: GOAL_ID, progressPercent: 60, status: "Active",
      completedAt: null, goalType: "Project",
    });

    const user = userEvent.setup();
    render(<GoalProgressBar percent={30} goalId={GOAL_ID} editable onUpdated={onUpdated} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));

    // Change number input value
    const numberInput = screen.getByRole("spinbutton");
    fireEvent.change(numberInput, { target: { value: "60" } });

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateProgress).toHaveBeenCalledWith(GOAL_ID, 60);
    });
  });

  it("calls onUpdated callback after successful save", async () => {
    const onUpdated = vi.fn();
    const updated = {
      id: GOAL_ID, progressPercent: 80, status: "Active",
      completedAt: null, goalType: "Project",
    };
    mockUpdateProgress.mockResolvedValue(updated);

    const user = userEvent.setup();
    render(<GoalProgressBar percent={50} goalId={GOAL_ID} editable onUpdated={onUpdated} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith(updated);
    });
  });

  it("closes edit controls after successful save", async () => {
    mockUpdateProgress.mockResolvedValue({
      id: GOAL_ID, progressPercent: 50, status: "Active",
      completedAt: null, goalType: "Project",
    });

    const user = userEvent.setup();
    render(<GoalProgressBar percent={50} goalId={GOAL_ID} editable />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it("shows achievement toast when progress reaches 100 from below", async () => {
    mockUpdateProgress.mockResolvedValue({
      id: GOAL_ID, progressPercent: 100, status: "Achieved",
      completedAt: new Date().toISOString(), goalType: "Project",
    });

    const user = userEvent.setup();
    render(<GoalProgressBar percent={80} goalId={GOAL_ID} editable />, { wrapper });

    await user.click(screen.getByRole("button", { name: /update progress/i }));
    const numberInput = screen.getByRole("spinbutton");
    fireEvent.change(numberInput, { target: { value: "100" } });
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/achieved/i)).toBeInTheDocument();
    });
  });
});
