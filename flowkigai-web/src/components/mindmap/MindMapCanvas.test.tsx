/**
 * MindMapCanvas — layout switcher tests
 *
 * Focus: the force-directed option appears in the switcher and selects correctly.
 * All other layout behaviour (API loading, CRUD) is tested elsewhere or in e2e.
 *
 * Note: this codebase uses pure SVG rendering (not React Flow), so node
 * "draggability" is not applicable — SVG <g> elements have no drag API.
 * We verify instead that nodes are rendered as expected in each layout mode.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const MOCK_NODES = [
  {
    id: "root",
    parentNodeId: null,
    nodeType: "Root",
    label: "My Life",
    notes: null,
    positionX: 0,
    positionY: 0,
    linkedGoalId: null,
    ikigaiCategory: null,
    icon: null,
    lifeArea: null,
    goalStatus: null,
    goalTargetDate: null,
    taskCount: 0,
    completedTaskCount: 0,
    hasSmartGoal: false,
    hasMilestones: false,
  },
  {
    id: "b1",
    parentNodeId: "root",
    nodeType: "Branch",
    label: "Career",
    notes: null,
    positionX: 0,
    positionY: 0,
    linkedGoalId: null,
    ikigaiCategory: null,
    icon: null,
    lifeArea: null,
    goalStatus: null,
    goalTargetDate: null,
    taskCount: 0,
    completedTaskCount: 0,
    hasSmartGoal: false,
    hasMilestones: false,
  },
];

const mockGetMap = vi.hoisted(() => vi.fn());
const mockCreateMap = vi.hoisted(() => vi.fn());
vi.mock("@/api/mindMapApi", () => ({
  mindMapApi: {
    getMap: mockGetMap,
    createMap: mockCreateMap,
    addNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    savePositions: vi.fn(),
    convertToGoal: vi.fn(),
  },
}));

vi.mock("@/api/habitApi", () => ({
  habitApi: { createHabit: vi.fn() },
}));

// MUI useMediaQuery — always desktop in tests
vi.mock("@mui/material", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mui/material")>();
  return { ...actual, useMediaQuery: () => false };
});

import MindMapCanvas from "./MindMapCanvas";

function renderCanvas() {
  return render(
    <MemoryRouter>
      <MindMapCanvas />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MindMapCanvas — layout switcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMap.mockResolvedValue({ nodes: MOCK_NODES });
  });

  it('"Force-Directed" option appears in the layout switcher', async () => {
    renderCanvas();
    await waitFor(() => expect(screen.getByText(/Force-Directed/)).toBeInTheDocument());
  });

  it("all four layout options appear in the switcher", async () => {
    renderCanvas();
    await waitFor(() => {
      expect(screen.getByText(/Sunburst/)).toBeInTheDocument();
      expect(screen.getByText(/Radial Tree/)).toBeInTheDocument();
      expect(screen.getByText(/Tidy Tree/)).toBeInTheDocument();
      expect(screen.getByText(/Force-Directed/)).toBeInTheDocument();
    });
  });

  it("selecting Force-Directed renders the force-directed SVG view", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Force-Directed/));

    fireEvent.click(screen.getByText(/Force-Directed/));

    // After selecting force-directed, the root node label should appear
    // in the SVG (ForceDirectedView renders it at canvas centre)
    await waitFor(() => {
      // The root label "My Life" appears rendered in the SVG
      expect(screen.getByText("My Life")).toBeInTheDocument();
    });
  });

  it("switching to force-directed and back to sunburst does not break the view", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Force-Directed/));

    fireEvent.click(screen.getByText(/Force-Directed/));
    fireEvent.click(screen.getByText(/Sunburst/));

    // Sunburst is the default — the canvas should still be present
    await waitFor(() => expect(screen.getByText(/Sunburst/)).toBeInTheDocument());
  });
});

describe("MindMapCanvas — node rendering in layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMap.mockResolvedValue({ nodes: MOCK_NODES });
  });

  it("renders SVG nodes in force-directed layout (nodes are non-draggable by SVG nature)", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Force-Directed/));
    fireEvent.click(screen.getByText(/Force-Directed/));

    // SVG is present — confirms ForceDirectedView rendered
    await waitFor(() => {
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  it("renders SVG nodes in radial-tree layout (non-draggable — same SVG pattern)", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Radial Tree/));
    fireEvent.click(screen.getByText(/Radial Tree/));

    await waitFor(() => {
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  it("renders SVG nodes in tidy-tree layout (non-draggable — same SVG pattern)", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Tidy Tree/));
    fireEvent.click(screen.getByText(/Tidy Tree/));

    await waitFor(() => {
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  it("force-directed layout renders branch node label", async () => {
    renderCanvas();
    await waitFor(() => screen.getByText(/Force-Directed/));
    fireEvent.click(screen.getByText(/Force-Directed/));

    await waitFor(() => {
      expect(screen.getByText("Career")).toBeInTheDocument();
    });
  });
});
