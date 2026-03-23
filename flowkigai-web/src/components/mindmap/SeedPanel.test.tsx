import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGetJourney = vi.hoisted(() => vi.fn());
vi.mock("@/api/ikigaiApi", () => ({
  ikigaiApi: { getJourney: mockGetJourney },
}));

const mockSeedMap = vi.hoisted(() => vi.fn());
const mockBatchCreateNodes = vi.hoisted(() => vi.fn());
vi.mock("@/api/mindMapApi", () => ({
  mindMapApi: {
    getMap: vi.fn(),
    createMap: vi.fn(),
    addNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    savePositions: vi.fn(),
    convertToGoal: vi.fn(),
    seedMap: mockSeedMap,
    batchCreateNodes: mockBatchCreateNodes,
  },
}));

// MUI useMediaQuery — always desktop in tests
vi.mock("@mui/material", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mui/material")>();
  return { ...actual, useMediaQuery: () => false };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import SeedPanel from "./SeedPanel";
import { useMindMapSeedStore } from "@/stores/mindMapSeedStore";
import type { MindMapNodeDto } from "@/api/mindMapApi";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NODE_BASE = {
  notes: null, positionX: 0, positionY: 0, linkedGoalId: null,
  ikigaiCategory: null, icon: null, lifeArea: null,
  goalStatus: null, goalTargetDate: null,
  taskCount: 0, completedTaskCount: 0, hasSmartGoal: false, hasMilestones: false,
};

const ROOT_NODE: MindMapNodeDto = { ...NODE_BASE, id: "root", parentNodeId: null, nodeType: "Root", label: "Me" };
const BRANCH_NODE: MindMapNodeDto = { ...NODE_BASE, id: "b1", parentNodeId: "root", nodeType: "Branch", label: "Career" };

const JOURNEY_NO_IKIGAI = {
  id: "j1", year: 2026, status: "Complete", completedAt: null,
  hasSeededMindMap: false, rooms: [], northStar: null, values: [],
};
const JOURNEY_WITH_IKIGAI = {
  ...JOURNEY_NO_IKIGAI,
  northStar: { id: "ns1", statement: "Create meaningful software", year: 2026 },
};

const mockOnNodesAdded = vi.fn();

function renderPanel(nodes: MindMapNodeDto[] = []) {
  return render(
    <MemoryRouter>
      <SeedPanel apiNodes={nodes} onNodesAdded={mockOnNodesAdded} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SeedPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMindMapSeedStore.getState().reset();
    mockGetJourney.mockResolvedValue(JOURNEY_NO_IKIGAI);
  });

  // ── Warning step ─────────────────────────────────────────────────────────

  describe("warning step", () => {
    it("shows non-root node count", () => {
      useMindMapSeedStore.getState().setStep("warning");
      renderPanel([ROOT_NODE, BRANCH_NODE]); // 1 non-root (Branch)
      expect(screen.getByText(/Your map already has 1 node/)).toBeInTheDocument();
    });

    it("Continue button advances to path-choice", async () => {
      useMindMapSeedStore.getState().setStep("warning");
      const user = userEvent.setup();
      renderPanel([ROOT_NODE, BRANCH_NODE]);
      await user.click(screen.getByText("Continue →"));
      expect(useMindMapSeedStore.getState().step).toBe("path-choice");
    });

    it("Cancel button resets the store", async () => {
      useMindMapSeedStore.getState().setStep("warning");
      const user = userEvent.setup();
      renderPanel([ROOT_NODE, BRANCH_NODE]);
      await user.click(screen.getByText("Cancel"));
      expect(useMindMapSeedStore.getState().step).toBe("idle");
    });

    it("header close button resets the store", async () => {
      useMindMapSeedStore.getState().setStep("warning");
      const user = userEvent.setup();
      renderPanel([ROOT_NODE, BRANCH_NODE]);
      // Header close is the first button (before body Cancel/Continue)
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[0]);
      expect(useMindMapSeedStore.getState().step).toBe("idle");
    });

    it("backdrop click resets the store", () => {
      useMindMapSeedStore.getState().setStep("warning");
      const { container } = renderPanel([ROOT_NODE, BRANCH_NODE]);
      // Fragment renders [backdrop div, paper div]; container.children[0] is backdrop
      fireEvent.click(container.children[0]);
      expect(useMindMapSeedStore.getState().step).toBe("idle");
    });
  });

  // ── Path choice — no Ikigai ───────────────────────────────────────────────

  describe("path choice — no Ikigai journey", () => {
    beforeEach(() => {
      useMindMapSeedStore.getState().setStep("path-choice");
    });

    it("shows loading spinner while journey is fetching", () => {
      mockGetJourney.mockReturnValue(new Promise(() => {})); // never resolves
      renderPanel();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("shows two options when user has no Ikigai", async () => {
      renderPanel();
      await waitFor(() =>
        expect(screen.getByText("✦ Answer practical questions")).toBeInTheDocument()
      );
      expect(screen.getByText("🌸 Do the Ikigai journey first")).toBeInTheDocument();
    });

    it("clicking 'Do the Ikigai journey first' navigates to /ikigai", async () => {
      const user = userEvent.setup();
      renderPanel();
      await waitFor(() => screen.getByText("🌸 Do the Ikigai journey first"));
      await user.click(screen.getByText("🌸 Do the Ikigai journey first"));
      expect(mockNavigate).toHaveBeenCalledWith("/ikigai");
    });

    it("clicking practical questions advances to questions step", async () => {
      const user = userEvent.setup();
      renderPanel();
      await waitFor(() => screen.getByText("✦ Answer practical questions"));
      await user.click(screen.getByText("✦ Answer practical questions"));
      expect(useMindMapSeedStore.getState().step).toBe("questions");
    });
  });

  // ── Path choice — has Ikigai ──────────────────────────────────────────────

  describe("path choice — has Ikigai journey", () => {
    beforeEach(() => {
      mockGetJourney.mockResolvedValue(JOURNEY_WITH_IKIGAI);
      useMindMapSeedStore.getState().setStep("path-choice");
    });

    it("shows Ikigai-based options when north star is present", async () => {
      renderPanel();
      await waitFor(() =>
        expect(screen.getByText("✨ Use my Ikigai themes")).toBeInTheDocument()
      );
      expect(screen.getByText("✦ Answer fresh questions")).toBeInTheDocument();
    });

    it("clicking 'Use my Ikigai themes' triggers generation", async () => {
      mockSeedMap.mockReturnValue(new Promise(() => {})); // never resolves — stays in generating
      const user = userEvent.setup();
      renderPanel();
      await waitFor(() => screen.getByText("✨ Use my Ikigai themes"));
      await user.click(screen.getByText("✨ Use my Ikigai themes"));
      await waitFor(() =>
        expect(useMindMapSeedStore.getState().step).toBe("generating")
      );
    });

    it("clicking 'Answer fresh questions' advances to questions step", async () => {
      const user = userEvent.setup();
      renderPanel();
      await waitFor(() => screen.getByText("✦ Answer fresh questions"));
      await user.click(screen.getByText("✦ Answer fresh questions"));
      expect(useMindMapSeedStore.getState().step).toBe("questions");
    });
  });

  // ── Questions step ────────────────────────────────────────────────────────

  describe("questions step", () => {
    beforeEach(() => {
      useMindMapSeedStore.getState().setStep("questions");
    });

    it("shows first question with progress indicator", () => {
      renderPanel();
      expect(screen.getByText(/1 \/ 6/)).toBeInTheDocument();
      expect(
        screen.getByText(/What area of life matters most to you right now\?/)
      ).toBeInTheDocument();
    });

    it("submitting an answer advances to the next question", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.type(screen.getByPlaceholderText("Type your answer…"), "Career growth");
      await user.click(screen.getByText("Next →"));
      await waitFor(() => expect(screen.getByText(/2 \/ 6/)).toBeInTheDocument());
    });

    it("last question button reads 'Generate ✨'", () => {
      const store = useMindMapSeedStore.getState();
      for (let i = 0; i < 5; i++) store.addAnswer({ question: `Q${i}`, answer: `A${i}` });
      renderPanel();
      expect(screen.getByText("Generate ✨")).toBeInTheDocument();
    });

    it("submitting last answer calls seedMap API", async () => {
      mockSeedMap.mockReturnValue(new Promise(() => {})); // never resolves
      const store = useMindMapSeedStore.getState();
      for (let i = 0; i < 5; i++) store.addAnswer({ question: `Q${i}`, answer: `A${i}` });
      const user = userEvent.setup();
      renderPanel();
      await user.type(screen.getByPlaceholderText("Type your answer…"), "Final answer");
      await user.click(screen.getByText("Generate ✨"));
      await waitFor(() => expect(mockSeedMap).toHaveBeenCalledTimes(1));
    });

    it("failed generation shows error and returns to questions step", async () => {
      mockSeedMap.mockRejectedValue(new Error("network error"));
      const store = useMindMapSeedStore.getState();
      for (let i = 0; i < 5; i++) store.addAnswer({ question: `Q${i}`, answer: `A${i}` });
      const user = userEvent.setup();
      renderPanel();
      await user.type(screen.getByPlaceholderText("Type your answer…"), "Final answer");
      await user.click(screen.getByText("Generate ✨"));
      await waitFor(() =>
        expect(
          screen.getByText("Could not generate nodes. Please try again.")
        ).toBeInTheDocument()
      );
      expect(useMindMapSeedStore.getState().step).toBe("questions");
    });
  });

  // ── Generating step ───────────────────────────────────────────────────────

  describe("generating step", () => {
    it("shows spinner and message", () => {
      useMindMapSeedStore.getState().setStep("generating");
      renderPanel();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByText(/Building your mind map nodes/)).toBeInTheDocument();
    });
  });

  // ── Proposal step ─────────────────────────────────────────────────────────

  describe("proposal step", () => {
    const PROPOSED_NODES = [
      { label: "Career", nodeType: "Branch", parentLabel: null, ikigaiCategory: null, icon: "💼", notes: null },
      { label: "Side project", nodeType: "Leaf", parentLabel: "Career", ikigaiCategory: null, icon: null, notes: null },
    ];

    beforeEach(() => {
      useMindMapSeedStore.getState().setStep("proposal");
      useMindMapSeedStore.getState().setProposedNodes(PROPOSED_NODES, "Your career-focused map.");
    });

    it("renders the seed summary", () => {
      renderPanel();
      expect(screen.getByText("Your career-focused map.")).toBeInTheDocument();
    });

    it("renders all proposed nodes as editable inputs", () => {
      renderPanel();
      expect(screen.getByDisplayValue("Career")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Side project")).toBeInTheDocument();
    });

    it("editing a node label updates the store", async () => {
      const user = userEvent.setup();
      renderPanel();
      const input = screen.getByDisplayValue("Career");
      await user.clear(input);
      await user.type(input, "My Career");
      expect(useMindMapSeedStore.getState().proposedNodes[0].label).toBe("My Career");
    });

    it("deleting a node removes it from the store and view", async () => {
      const user = userEvent.setup();
      renderPanel();
      expect(screen.getByDisplayValue("Career")).toBeInTheDocument();
      // Buttons in proposal: close(0), Career-delete(1), SideProject-delete(2), AddToMap(3), Discard(4)
      const allButtons = screen.getAllByRole("button");
      await user.click(allButtons[1]); // Career's delete button
      await waitFor(() =>
        expect(screen.queryByDisplayValue("Career")).not.toBeInTheDocument()
      );
      expect(useMindMapSeedStore.getState().proposedNodes).toHaveLength(1);
    });

    it("'Add N nodes to my map' button shows correct count", () => {
      renderPanel();
      expect(screen.getByText("Add 2 nodes to my map")).toBeInTheDocument();
    });

    it("clicking 'Add to map' calls batchCreateNodes with proposed nodes", async () => {
      mockBatchCreateNodes.mockResolvedValue({ id: "map1", year: 2026, nodes: [] });
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Add 2 nodes to my map"));
      await waitFor(() =>
        expect(mockBatchCreateNodes).toHaveBeenCalledWith(
          expect.any(Number),
          PROPOSED_NODES
        )
      );
    });

    it("calls onNodesAdded after successful add", async () => {
      mockBatchCreateNodes.mockResolvedValue({ id: "map1", year: 2026, nodes: [] });
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Add 2 nodes to my map"));
      await waitFor(() => expect(mockOnNodesAdded).toHaveBeenCalledTimes(1));
    });

    it("resets store to idle after successful add", async () => {
      mockBatchCreateNodes.mockResolvedValue({ id: "map1", year: 2026, nodes: [] });
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Add 2 nodes to my map"));
      await waitFor(() =>
        expect(useMindMapSeedStore.getState().step).toBe("idle")
      );
    });

    it("shows 'All nodes removed.' when all nodes are deleted", () => {
      useMindMapSeedStore.getState().setProposedNodes([], "");
      renderPanel();
      expect(screen.getByText("All nodes removed.")).toBeInTheDocument();
    });

    it("Discard button resets the store", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByText("Discard"));
      expect(useMindMapSeedStore.getState().step).toBe("idle");
    });
  });
});
