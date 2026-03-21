import { describe, it, expect } from "vitest";
import type { MindMapNodeDto } from "@/api/mindMapApi";
import { getFocusColor, buildFocusColorMap } from "./nodes";

// ── Constants matching nodes.tsx ──────────────────────────────────────────────
const GREY  = "#9CA3AF"; // Dropped / no data / plain leaf
const TEAL  = "#0D6E6E"; // Active
const CORAL = "#E8705A"; // Active – due ≤30 days
const AMBER = "#F5A623"; // Paused
const GREEN = "#10B981"; // Achieved
const RED   = "#EF4444"; // Overdue

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  parentNodeId: string | null,
  overrides: Partial<MindMapNodeDto> = {},
): MindMapNodeDto {
  return {
    id,
    parentNodeId,
    nodeType: parentNodeId === null ? "Root" : "Leaf",
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

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── getFocusColor ─────────────────────────────────────────────────────────────

describe("getFocusColor — goal status", () => {
  it("returns grey when goalStatus is null (not a goal)", () => {
    const n = makeNode("n", "root");
    expect(getFocusColor(n)).toBe(GREY);
  });

  it("returns green for Achieved", () => {
    const n = makeNode("n", "root", { nodeType: "Goal", goalStatus: "Achieved" });
    expect(getFocusColor(n)).toBe(GREEN);
  });

  it("returns grey for Dropped", () => {
    const n = makeNode("n", "root", { nodeType: "Goal", goalStatus: "Dropped" });
    expect(getFocusColor(n)).toBe(GREY);
  });

  it("returns amber for Paused", () => {
    const n = makeNode("n", "root", { nodeType: "Goal", goalStatus: "Paused" });
    expect(getFocusColor(n)).toBe(AMBER);
  });

  it("returns teal for Active goal with no tasks and no milestones (no longer 'no data')", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      taskCount: 0, hasMilestones: false,
    });
    expect(getFocusColor(n)).toBe(TEAL);
  });

  it("returns teal for Active goal with no target date", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: null,
    });
    expect(getFocusColor(n)).toBe(TEAL);
  });

  it("returns coral for Active goal due within 30 days", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: daysFromNow(15),
    });
    expect(getFocusColor(n)).toBe(CORAL);
  });

  it("returns coral for Active goal due exactly today (daysLeft = 0)", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: daysFromNow(0),
    });
    expect(getFocusColor(n)).toBe(CORAL);
  });

  it("returns teal for Active goal due in exactly 31 days", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: daysFromNow(31),
    });
    expect(getFocusColor(n)).toBe(TEAL);
  });

  it("returns red for Active goal that is overdue (past target date)", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: daysFromNow(-1),
    });
    expect(getFocusColor(n)).toBe(RED);
  });

  it("returns red for Active goal overdue by many days", () => {
    const n = makeNode("n", "root", {
      nodeType: "Goal", goalStatus: "Active",
      goalTargetDate: daysFromNow(-60),
    });
    expect(getFocusColor(n)).toBe(RED);
  });
});

// ── buildFocusColorMap — leaf non-goal nodes (core new behaviour) ─────────────

describe("buildFocusColorMap — leaf non-goal nodes get grey (no data)", () => {
  it("plain Leaf node with no children maps to grey", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("leaf", "branch", { nodeType: "Leaf" }),
    ];
    const map = buildFocusColorMap(nodes);
    expect(map.get("leaf")).toBe(GREY);
  });

  it("Branch node with no children (also a leaf) maps to grey", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
    ];
    const map = buildFocusColorMap(nodes);
    expect(map.get("branch")).toBe(GREY);
  });

  it("parent of only non-goal leaves bubbles up to grey", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("l1", "branch", { nodeType: "Leaf" }),
      makeNode("l2", "branch", { nodeType: "Leaf" }),
    ];
    const map = buildFocusColorMap(nodes);
    expect(map.get("branch")).toBe(GREY);
  });
});

// ── buildFocusColorMap — goal nodes keep their own colour ─────────────────────

describe("buildFocusColorMap — goal nodes use getFocusColor", () => {
  it("Active on-track goal leaf gets teal", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("goal", "root", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 2, hasMilestones: true, goalTargetDate: daysFromNow(90),
      }),
    ];
    expect(buildFocusColorMap(nodes).get("goal")).toBe(TEAL);
  });

  it("Achieved goal leaf gets green", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("goal", "root", { nodeType: "Goal", goalStatus: "Achieved" }),
    ];
    expect(buildFocusColorMap(nodes).get("goal")).toBe(GREEN);
  });

  it("Dropped goal leaf gets grey", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("goal", "root", { nodeType: "Goal", goalStatus: "Dropped" }),
    ];
    expect(buildFocusColorMap(nodes).get("goal")).toBe(GREY);
  });
});

// ── buildFocusColorMap — parent colour aggregation ────────────────────────────

describe("buildFocusColorMap — parent inherits worst child colour", () => {
  it("parent of a single goal leaf inherits that goal's colour", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("goal", "branch", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(90),
      }),
    ];
    const map = buildFocusColorMap(nodes);
    expect(map.get("branch")).toBe(TEAL);
  });

  it("coral (at-risk) beats teal (on-track) in priority", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("g1", "branch", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(90),
      }),
      makeNode("g2", "branch", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(10),
      }),
    ];
    expect(buildFocusColorMap(nodes).get("branch")).toBe(CORAL);
  });

  it("coral beats amber", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("g1", "branch", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(10),
      }),
      makeNode("g2", "branch", { nodeType: "Goal", goalStatus: "Paused" }),
    ];
    expect(buildFocusColorMap(nodes).get("branch")).toBe(CORAL);
  });

  it("mixed: goal sibling and plain-leaf sibling — parent gets goal colour", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("branch", "root", { nodeType: "Branch" }),
      makeNode("goal", "branch", {
        nodeType: "Goal", goalStatus: "Achieved",
      }),
      makeNode("leaf", "branch", { nodeType: "Leaf" }), // plain, non-goal
    ];
    // plain leaf contributes grey, achieved goal contributes green
    // priority: coral > amber > teal > green > grey → green wins over grey
    expect(buildFocusColorMap(nodes).get("branch")).toBe(GREEN);
  });

  it("root inherits worst colour from entire tree", () => {
    const nodes = [
      makeNode("root", null),
      makeNode("b1", "root", { nodeType: "Branch" }),
      makeNode("b2", "root", { nodeType: "Branch" }),
      makeNode("g1", "b1", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(90),
      }),
      makeNode("g2", "b2", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 1, hasMilestones: true, goalTargetDate: daysFromNow(5),
      }),
    ];
    // b1 → teal, b2 → coral; root should get coral
    expect(buildFocusColorMap(nodes).get("root")).toBe(CORAL);
  });
});

// ── buildFocusColorMap — edge cases ───────────────────────────────────────────

describe("buildFocusColorMap — edge cases", () => {
  it("returns empty map for empty node list", () => {
    expect(buildFocusColorMap([])).toEqual(new Map());
  });

  it("root-only map: root (leaf) gets grey since it is not a Goal", () => {
    const nodes = [makeNode("root", null)];
    const map = buildFocusColorMap(nodes);
    expect(map.get("root")).toBe(GREY);
  });

  it("all entries in the map use one of the six known focus colours", () => {
    const VALID = new Set([GREY, TEAL, CORAL, AMBER, GREEN, RED]);
    const nodes = [
      makeNode("root", null),
      makeNode("b1", "root", { nodeType: "Branch" }),
      makeNode("b2", "root", { nodeType: "Branch" }),
      makeNode("leaf", "b1", { nodeType: "Leaf" }),
      makeNode("goal", "b2", {
        nodeType: "Goal", goalStatus: "Active",
        taskCount: 2, hasMilestones: true, goalTargetDate: daysFromNow(60),
      }),
    ];
    for (const color of buildFocusColorMap(nodes).values()) {
      expect(VALID.has(color)).toBe(true);
    }
  });
});
