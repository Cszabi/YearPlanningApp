import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGetJourney = vi.hoisted(() => vi.fn());
const mockExtractThemes = vi.hoisted(() => vi.fn());
vi.mock("@/api/ikigaiApi", () => ({
  ikigaiApi: {
    getJourney: mockGetJourney,
    extractThemes: mockExtractThemes,
  },
}));

const mockSetExtractedThemes = vi.hoisted(() => vi.fn());
vi.mock("@/stores/ikigaiStore", () => ({
  useIkigaiStore: (selector: (s: { setExtractedThemes: typeof mockSetExtractedThemes }) => unknown) =>
    selector({ setExtractedThemes: mockSetExtractedThemes }),
}));

vi.mock("@/hooks/usePageAnalytics", () => ({ usePageAnalytics: vi.fn() }));

import IkigaiCompletePage from "./IkigaiCompletePage";

const JOURNEY_WITH_NORTH_STAR = {
  id: "j1",
  year: 2026,
  status: "Complete",
  completedAt: null,
  hasSeededMindMap: false,
  rooms: [],
  northStar: { id: "ns1", statement: "To inspire and empower", year: 2026 },
  values: [],
};

const JOURNEY_WITHOUT_NORTH_STAR = {
  ...JOURNEY_WITH_NORTH_STAR,
  northStar: null,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <IkigaiCompletePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("IkigaiCompletePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetJourney.mockResolvedValue(JOURNEY_WITH_NORTH_STAR);
  });

  it("redirects to /ikigai when no north star", async () => {
    mockGetJourney.mockResolvedValue(JOURNEY_WITHOUT_NORTH_STAR);
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/ikigai", { replace: true }));
  });

  it("renders the NorthStar quote", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("To inspire and empower")).toBeInTheDocument()
    );
  });

  it("shows loading spinner while extracting", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Build my mind map"));
    // Make extract take forever
    mockExtractThemes.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByText("Build my mind map"));
    expect(screen.getByText("Extracting themes…")).toBeInTheDocument();
  });

  it("navigates to /ikigai/seed on successful extract", async () => {
    const extractResult = { categories: [{ label: "What I Love", themes: ["coding"] }] };
    mockExtractThemes.mockResolvedValue(extractResult);
    renderPage();
    await waitFor(() => screen.getByText("Build my mind map"));
    fireEvent.click(screen.getByText("Build my mind map"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/ikigai/seed"));
    expect(mockSetExtractedThemes).toHaveBeenCalledWith(extractResult);
  });

  it("shows error snackbar on extract failure", async () => {
    mockExtractThemes.mockRejectedValue(new Error("network"));
    renderPage();
    await waitFor(() => screen.getByText("Build my mind map"));
    fireEvent.click(screen.getByText("Build my mind map"));
    await waitFor(() =>
      expect(screen.getByText("Could not extract themes. Please try again.")).toBeInTheDocument()
    );
  });

  it("navigates to /map when 'Start from scratch' is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Start from scratch →"));
    fireEvent.click(screen.getByText("Start from scratch →"));
    expect(mockNavigate).toHaveBeenCalledWith("/map");
  });

  it("renders NorthStarIllustration SVG", async () => {
    const { container } = renderPage();
    await waitFor(() => screen.getByText("To inspire and empower"));
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("does not call extractThemes when 'Start from scratch' is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Start from scratch →"));
    fireEvent.click(screen.getByText("Start from scratch →"));
    expect(mockExtractThemes).not.toHaveBeenCalled();
  });
});
