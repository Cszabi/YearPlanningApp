import { describe, it, expect } from "vitest";
import { runForceLayout, FD_COLLISION_RADIUS } from "./forceDirectedLayout";
import type { MindMapNodeDto } from "@/api/mindMapApi";

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  parentNodeId: string | null,
  overrides: Partial<MindMapNodeDto> = {},
): MindMapNodeDto {
  return {
    id,
    parentNodeId,
    nodeType: parentNodeId === null ? "Root" : "Branch",
    label: id,
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
    ...overrides,
  };
}

// Minimal map: root + 4 branches + 4 leaves
function makeTestNodes(): MindMapNodeDto[] {
  return [
    makeNode("root", null),
    makeNode("b1", "root"),
    makeNode("b2", "root"),
    makeNode("b3", "root"),
    makeNode("b4", "root"),
    makeNode("l1", "b1"),
    makeNode("l2", "b1"),
    makeNode("l3", "b2"),
    makeNode("l4", "b3"),
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runForceLayout — root position", () => {
  it("root node is fixed at (0, 0) after simulation", () => {
    const nodes = makeTestNodes();
    const positions = runForceLayout(nodes);

    const rootPos = positions.get("root");
    expect(rootPos).toBeDefined();
    expect(rootPos!.x).toBeCloseTo(0, 3);
    expect(rootPos!.y).toBeCloseTo(0, 3);
  });
});

describe("runForceLayout — no overlap", () => {
  it("all pairwise node distances >= 2 * collision radius after simulation", () => {
    const nodes = makeTestNodes();
    const positions = runForceLayout(nodes);
    const posArray = Array.from(positions.values());
    // d3 collision force is a soft constraint; allow 5% tolerance below the theoretical minimum
    const minDist = FD_COLLISION_RADIUS * 2 * 0.95;

    for (let i = 0; i < posArray.length; i++) {
      for (let j = i + 1; j < posArray.length; j++) {
        const dx = posArray[i].x - posArray[j].x;
        const dy = posArray[i].y - posArray[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(minDist);
      }
    }
  });
});

describe("runForceLayout — canvas bounds", () => {
  it("all nodes remain within ±2000 units of canvas centre after simulation", () => {
    const nodes = makeTestNodes();
    const positions = runForceLayout(nodes);
    const BOUND = 2000;

    for (const [_id, pos] of positions) {
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(BOUND);
      expect(Math.abs(pos.y)).toBeLessThanOrEqual(BOUND);
    }
  });
});

describe("runForceLayout — determinism", () => {
  it("produces the same positions for the same input", () => {
    const nodes = makeTestNodes();
    const result1 = runForceLayout(nodes);
    const result2 = runForceLayout(nodes);

    for (const [id, pos1] of result1) {
      const pos2 = result2.get(id)!;
      expect(pos2).toBeDefined();
      expect(pos1.x).toBeCloseTo(pos2.x, 6);
      expect(pos1.y).toBeCloseTo(pos2.y, 6);
    }
  });

  it("same result when called with identical stored positions", () => {
    const nodes = makeTestNodes().map((n, i) => ({
      ...n,
      positionX: n.parentNodeId === null ? 0 : Math.cos(i) * 200,
      positionY: n.parentNodeId === null ? 0 : Math.sin(i) * 200,
    }));
    const result1 = runForceLayout(nodes);
    const result2 = runForceLayout([...nodes]); // shallow copy of input array

    for (const [id, pos1] of result1) {
      const pos2 = result2.get(id)!;
      expect(pos1.x).toBeCloseTo(pos2.x, 6);
      expect(pos1.y).toBeCloseTo(pos2.y, 6);
    }
  });
});

describe("runForceLayout — immutability", () => {
  it("does not mutate original node positionX/positionY values", () => {
    const nodes = makeTestNodes();
    const originalPositions = nodes.map((n) => ({ id: n.id, x: n.positionX, y: n.positionY }));

    runForceLayout(nodes);

    nodes.forEach((n, i) => {
      expect(n.positionX).toBe(originalPositions[i].x);
      expect(n.positionY).toBe(originalPositions[i].y);
    });
  });

  it("result positions are independent — switching away and back gives fresh layout", () => {
    const nodes = makeTestNodes();
    const result1 = runForceLayout(nodes);

    // Simulate stored positions being the result of a previous layout
    // (but the original nodes are unaffected)
    const storedPositions = nodes.map((n) => ({ id: n.id, x: n.positionX, y: n.positionY }));
    nodes.forEach((n, i) => {
      expect(n.positionX).toBe(storedPositions[i].x);
    });

    const result2 = runForceLayout(nodes);

    // Both runs from the same starting state produce the same output
    for (const [id, pos1] of result1) {
      const pos2 = result2.get(id)!;
      expect(pos1.x).toBeCloseTo(pos2.x, 6);
    }
  });
});

describe("runForceLayout — edge cases", () => {
  it("returns empty map for empty node list", () => {
    expect(runForceLayout([])).toEqual(new Map());
  });

  it("returns just root at origin for single root node", () => {
    const nodes = [makeNode("root", null)];
    const positions = runForceLayout(nodes);
    expect(positions.get("root")).toEqual({ x: 0, y: 0 });
  });
});
