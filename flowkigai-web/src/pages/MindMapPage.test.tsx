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
vi.mock("@/api/ikigaiApi", () => ({
  ikigaiApi: { getJourney: mockGetJourney },
}));

// Mock MindMapCanvas — it's complex and not what we're testing here
vi.mock("@/components/mindmap/MindMapCanvas", () => ({
  default: () => <div data-testid="mindmap-canvas">MindMap Canvas</div>,
}));

vi.mock("@/hooks/usePageAnalytics", () => ({ usePageAnalytics: vi.fn() }));

import MindMapPage from "./MindMapPage";

const JOURNEY_NEEDS_SEEDING = {
  id: "j1",
  year: 2026,
  status: "Complete",
  completedAt: null,
  hasSeededMindMap: false,
  rooms: [],
  northStar: { id: "ns1", statement: "My North Star", year: 2026 },
  values: [],
};

const JOURNEY_ALREADY_SEEDED = { ...JOURNEY_NEEDS_SEEDING, hasSeededMindMap: true };
const JOURNEY_NO_NORTH_STAR = { ...JOURNEY_NEEDS_SEEDING, northStar: null };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MindMapPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MindMapPage — seeding banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows banner when northStar is saved and hasSeededMindMap is false", async () => {
    mockGetJourney.mockResolvedValue(JOURNEY_NEEDS_SEEDING);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Seed your Mind Map from your Ikigai/)).toBeInTheDocument()
    );
  });

  it("does not show banner when hasSeededMindMap is true", async () => {
    mockGetJourney.mockResolvedValue(JOURNEY_ALREADY_SEEDED);
    renderPage();
    await waitFor(() => screen.getByTestId("mindmap-canvas"));
    expect(screen.queryByText(/Seed your Mind Map from your Ikigai/)).not.toBeInTheDocument();
  });

  it("does not show banner when there is no northStar", async () => {
    mockGetJourney.mockResolvedValue(JOURNEY_NO_NORTH_STAR);
    renderPage();
    await waitFor(() => screen.getByTestId("mindmap-canvas"));
    expect(screen.queryByText(/Seed your Mind Map from your Ikigai/)).not.toBeInTheDocument();
  });

  it("banner click navigates to /ikigai/complete", async () => {
    mockGetJourney.mockResolvedValue(JOURNEY_NEEDS_SEEDING);
    renderPage();
    await waitFor(() => screen.getByText(/Seed your Mind Map from your Ikigai/));
    fireEvent.click(screen.getByText(/Seed your Mind Map from your Ikigai/));
    expect(mockNavigate).toHaveBeenCalledWith("/ikigai/complete");
  });
});
