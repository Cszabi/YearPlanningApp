import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSeedMindMap = vi.hoisted(() => vi.fn());
vi.mock("@/api/ikigaiApi", () => ({
  ikigaiApi: { seedMindMap: mockSeedMindMap },
}));

const mockSetHasSeededMindMap = vi.hoisted(() => vi.fn());
let mockExtractedThemes: unknown = null;
vi.mock("@/stores/ikigaiStore", () => ({
  useIkigaiStore: (selector: (s: {
    extractedThemes: unknown;
    setHasSeededMindMap: typeof mockSetHasSeededMindMap;
  }) => unknown) =>
    selector({
      extractedThemes: mockExtractedThemes,
      setHasSeededMindMap: mockSetHasSeededMindMap,
    }),
}));

vi.mock("@/hooks/usePageAnalytics", () => ({ usePageAnalytics: vi.fn() }));

import IkigaiSeedPage from "./IkigaiSeedPage";

const MOCK_THEMES = {
  categories: [
    { label: "What I Love", themes: ["coding", "teaching", "music"] },
    { label: "What The World Needs", themes: ["education", "health", "peace"] },
    { label: "What I Can Be Paid For", themes: ["software", "consulting", "writing"] },
    { label: "What I'm Good At", themes: ["problem solving", "analysis", "communication"] },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <IkigaiSeedPage />
    </MemoryRouter>
  );
}

describe("IkigaiSeedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractedThemes = MOCK_THEMES;
    mockSeedMindMap.mockResolvedValue(undefined);
  });

  it("redirects to /ikigai/complete when no extracted themes", async () => {
    mockExtractedThemes = null;
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/ikigai/complete", { replace: true })
    );
  });

  it("renders 4 category sections", () => {
    renderPage();
    expect(screen.getByText("What I Love")).toBeInTheDocument();
    expect(screen.getByText("What The World Needs")).toBeInTheDocument();
    expect(screen.getByText("What I Can Be Paid For")).toBeInTheDocument();
    expect(screen.getByText("What I'm Good At")).toBeInTheDocument();
  });

  it("shows theme inputs with correct values", () => {
    renderPage();
    expect(screen.getByDisplayValue("coding")).toBeInTheDocument();
    expect(screen.getByDisplayValue("teaching")).toBeInTheDocument();
    expect(screen.getByDisplayValue("education")).toBeInTheDocument();
  });

  it("deletes a theme when trash button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByDisplayValue("coding")).toBeInTheDocument();
    const deleteButtons = screen.getAllByLabelText("Delete theme");
    await user.click(deleteButtons[0]);
    await waitFor(() =>
      expect(screen.queryByDisplayValue("coding")).not.toBeInTheDocument()
    );
  });

  it("adds a theme when '+ Add theme' is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    const addButtons = screen.getAllByText("+ Add theme");
    await user.click(addButtons[0]);
    // Should now have 4 inputs in first category (was 3)
    const inputs = screen.getAllByDisplayValue((v) => v === "");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("disables '+ Add theme' when 6 themes exist", async () => {
    mockExtractedThemes = {
      categories: [
        { label: "What I Love", themes: ["t1", "t2", "t3", "t4", "t5", "t6"] },
        ...MOCK_THEMES.categories.slice(1),
      ],
    };
    renderPage();
    const addButtons = screen.getAllByText("+ Add theme");
    expect(addButtons[0]).toBeDisabled();
  });

  it("enforces 40-char limit on theme inputs", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByDisplayValue("coding");
    await user.clear(input);
    await user.type(input, "a".repeat(50));
    const value = (input as HTMLInputElement).value;
    expect(value.length).toBeLessThanOrEqual(40);
  });

  it("MergeMode toggle switches between Merge and Replace", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Override (start fresh)"));
    expect(screen.getByText(/All existing Mind Map nodes will be deleted/i)).toBeInTheDocument();
    await user.click(screen.getByText("Extend existing map"));
    expect(screen.queryByText(/All existing Mind Map nodes will be deleted/i)).not.toBeInTheDocument();
  });

  it("shows Replace warning text when Replace mode is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Override (start fresh)"));
    expect(screen.getByText(/All existing Mind Map nodes will be deleted/i)).toBeInTheDocument();
  });

  it("calls seedMindMap API when Seed button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() => expect(mockSeedMindMap).toHaveBeenCalledTimes(1));
  });

  it("calls setHasSeededMindMap(true) on success", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() => expect(mockSetHasSeededMindMap).toHaveBeenCalledWith(true));
  });

  it("navigates to /map on success", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/map"));
  });

  it("shows error snackbar on seed failure", async () => {
    mockSeedMindMap.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() =>
      expect(screen.getByText("Could not seed mind map. Please try again.")).toBeInTheDocument()
    );
  });

  it("sticky bottom bar is present", () => {
    renderPage();
    expect(screen.getByText("Seed my Mind Map")).toBeInTheDocument();
    expect(screen.getByText("Extend existing map")).toBeInTheDocument();
    expect(screen.getByText("Override (start fresh)")).toBeInTheDocument();
  });

  it("seed button is disabled while seeding", async () => {
    mockSeedMindMap.mockReturnValue(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() =>
      expect(screen.getByText("Seeding…")).toBeInTheDocument()
    );
    expect(screen.getByText("Seeding…").closest("button")).toBeDisabled();
  });

  it("theme edits are reflected in the API call", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByDisplayValue("coding");
    await user.clear(input);
    await user.type(input, "my new theme");
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() => {
      const call = mockSeedMindMap.mock.calls[0];
      const themes = call[1];
      expect(themes.categories[0].themes).toContain("my new theme");
    });
  });

  it("empty themes are filtered out before seeding", async () => {
    const user = userEvent.setup();
    renderPage();
    // Clear the first theme
    const input = screen.getByDisplayValue("coding");
    await user.clear(input);
    await user.click(screen.getByText("Seed my Mind Map"));
    await waitFor(() => {
      const call = mockSeedMindMap.mock.calls[0];
      const themes = call[1];
      expect(themes.categories[0].themes).not.toContain("");
    });
  });

  it("all 4 category sections are present", () => {
    renderPage();
    const headings = MOCK_THEMES.categories.map((c) => c.label);
    headings.forEach((h) => expect(screen.getByText(h)).toBeInTheDocument());
  });
});
