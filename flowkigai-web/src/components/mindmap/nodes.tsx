import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { MindMapNodeDto } from "@/api/mindMapApi";

export const LIFE_AREA_COLORS = [
  "#0EA5E9", // CareerWork     – sky blue
  "#10B981", // HealthBody     – emerald
  "#F43F5E", // Relationships  – rose
  "#8B5CF6", // LearningGrowth – violet
  "#F59E0B", // Finance        – amber
  "#F97316", // Creativity     – orange
  "#06B6D4", // Environment    – cyan
  "#6366F1", // Contribution   – indigo
];

export const LIFE_AREA_NAMES = [
  "Career & Work",
  "Health & Body",
  "Relationships",
  "Learning & Growth",
  "Finance",
  "Creativity & Hobbies",
  "Environment",
  "Contribution",
];

// ── Focus mode colour coding ───────────────────────────────────────────────────
export function getFocusColor(node: MindMapNodeDto): string {
  if (!node.goalStatus) return "#9CA3AF";
  switch (node.goalStatus) {
    case "Achieved": return "#10B981"; // emerald
    case "Dropped":  return "#9CA3AF"; // grey
    case "Paused":   return "#F5A623"; // amber
    default: { // Active
      // No tasks and no milestones = no progress data → treat as "no data"
      if (node.taskCount === 0 && !node.hasMilestones) return "#9CA3AF";
      if (node.goalTargetDate) {
        const daysLeft = Math.ceil((new Date(node.goalTargetDate).getTime() - Date.now()) / 86400000);
        if (daysLeft <= 30) return "#E8705A"; // coral = at risk
      }
      return "#0D6E6E"; // teal = on track
    }
  }
}

export const FOCUS_LEGEND = [
  { color: "#0D6E6E", label: "Active – on track" },
  { color: "#E8705A", label: "Active – due ≤30 days" },
  { color: "#F5A623", label: "Paused" },
  { color: "#10B981", label: "Achieved" },
  { color: "#9CA3AF", label: "Dropped / no data" },
];

// Priority order for aggregating child goal colours onto parent nodes
// (most urgent first — first match wins)
const FOCUS_COLOR_PRIORITY = ["#E8705A", "#F5A623", "#0D6E6E", "#10B981", "#9CA3AF"];

/**
 * Builds a Map<nodeId, focusColor> for every node in the list.
 * Goal nodes get their own colour via getFocusColor.
 * Non-goal nodes get the "worst" (highest-priority) colour among their
 * goal descendants; nodes with no goal descendants are omitted from the map.
 */
export function buildFocusColorMap(nodes: MindMapNodeDto[]): Map<string, string> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentNodeId) {
      if (!childrenMap.has(n.parentNodeId)) childrenMap.set(n.parentNodeId, []);
      childrenMap.get(n.parentNodeId)!.push(n.id);
    }
  }

  const cache = new Map<string, string | null>();
  function worstGoalColor(id: string): string | null {
    if (cache.has(id)) return cache.get(id) as string | null;
    const n = nodeMap.get(id);
    if (!n) { cache.set(id, null); return null; }
    let result: string | null;
    if (n.nodeType === "Goal") {
      result = getFocusColor(n);
    } else {
      const childColors = (childrenMap.get(id) ?? [])
        .map(worstGoalColor)
        .filter(Boolean) as string[];
      result = FOCUS_COLOR_PRIORITY.find((c) => childColors.includes(c)) ?? null;
    }
    cache.set(id, result);
    return result;
  }

  const map = new Map<string, string>();
  for (const n of nodes) {
    const c = worstGoalColor(n.id);
    if (c !== null) map.set(n.id, c);
  }
  return map;
}

// ── Ikigai category config ─────────────────────────────────────────────────────

export const IKIGAI_CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  Love:        { label: "💛 Love",        color: "#F43F5E" },
  GoodAt:      { label: "💪 Good At",     color: "#7C3AED" },
  WorldNeeds:  { label: "🌍 World Needs", color: "#0D6E6E" },
  PaidFor:     { label: "💰 Paid For",    color: "#F5A623" },
  Intersection:{ label: "✨ Intersection", color: "#E8705A" },
};

export interface MindMapNodeData {
  label: string;
  notes: string | null;
  linkedGoalId: string | null;
  editing: boolean;
  colorIndex: number;
  ikigaiCategory: string | null;
  icon: string | null;
  onLabelSave: (id: string, label: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}

// ── Ikigai category badge ──────────────────────────────────────────────────────
function IkigaiBadge({ category }: { category: string }) {
  const cfg = IKIGAI_CATEGORY_CONFIG[category];
  if (!cfg) return null;
  return (
    <div
      style={{
        display: "inline-block",
        marginTop: 4,
        padding: "1px 6px",
        borderRadius: 10,
        backgroundColor: cfg.color + "22",
        color: cfg.color,
        fontSize: 10,
        fontWeight: 600,
        maxWidth: 90,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </div>
  );
}

// ── Shared editable label ──────────────────────────────────────────────────────
function EditableLabel({
  id,
  data,
  style,
}: {
  id: string;
  data: MindMapNodeData;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(data.label);
  useEffect(() => setText(data.label), [data.label]);

  if (!data.editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...style }}>
        {data.icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{data.icon}</span>}
        <span>{data.label}</span>
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => data.onLabelSave(id, text)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") data.onLabelSave(id, data.label);
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...style,
        background: "transparent",
        border: "none",
        outline: "none",
        textAlign: "center",
        width: "100%",
      }}
    />
  );
}

// ── RootNode ──────────────────────────────────────────────────────────────────
export const RootNode = memo(({ data, id }: NodeProps<MindMapNodeData>) => (
  <div
    onContextMenu={(e) => {
      e.preventDefault();
      data.onContextMenu(id, e.clientX, e.clientY);
    }}
    style={{
      width: 160,
      height: 160,
      borderRadius: "50%",
      backgroundColor: "#0D6E6E",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      textAlign: "center",
      fontFamily: "Georgia, serif",
      fontSize: 13,
      lineHeight: 1.4,
      boxShadow: "0 4px 24px rgba(13,110,110,0.35)",
      cursor: "default",
    }}
  >
    <EditableLabel id={id} data={data} />
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
  </div>
));

// ── BranchNode ────────────────────────────────────────────────────────────────
export const BranchNode = memo(({ data, id }: NodeProps<MindMapNodeData>) => {
  const color = LIFE_AREA_COLORS[data.colorIndex % LIFE_AREA_COLORS.length];
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        data.onContextMenu(id, e.clientX, e.clientY);
      }}
      style={{
        minWidth: 120,
        padding: "10px 16px",
        borderRadius: 12,
        backgroundColor: "white",
        border: `2px solid ${color}`,
        color: "#374151",
        fontSize: 13,
        fontWeight: 500,
        textAlign: "center",
        boxShadow: `0 2px 12px ${color}33`,
        cursor: "grab",
      }}
    >
      <EditableLabel id={id} data={data} />
      {data.ikigaiCategory && <IkigaiBadge category={data.ikigaiCategory} />}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
});

// ── LeafNode ──────────────────────────────────────────────────────────────────
export const LeafNode = memo(({ data, id }: NodeProps<MindMapNodeData>) => (
  <div
    onContextMenu={(e) => {
      e.preventDefault();
      data.onContextMenu(id, e.clientX, e.clientY);
    }}
    style={{
      minWidth: 90,
      padding: "7px 12px",
      borderRadius: 8,
      backgroundColor: "white",
      border: "1.5px solid #D1D5DB",
      color: "#6B7280",
      fontSize: 12,
      textAlign: "center",
      cursor: "grab",
    }}
  >
    <EditableLabel id={id} data={data} style={{ color: "#6B7280" }} />
    {data.ikigaiCategory && <IkigaiBadge category={data.ikigaiCategory} />}
    <Handle type="source" position={Position.Right} style={{ width: 8, height: 8 }} />
    <Handle type="target" position={Position.Left} style={{ width: 8, height: 8 }} />
  </div>
));

// ── GoalNode ──────────────────────────────────────────────────────────────────
export const GoalNode = memo(({ data, id }: NodeProps<MindMapNodeData>) => (
  <div
    onContextMenu={(e) => {
      e.preventDefault();
      data.onContextMenu(id, e.clientX, e.clientY);
    }}
    style={{
      minWidth: 110,
      padding: "8px 14px",
      borderRadius: 10,
      backgroundColor: "white",
      border: "2px solid #0D6E6E",
      color: "#374151",
      fontSize: 12,
      textAlign: "center",
      cursor: "grab",
    }}
  >
    <div style={{ fontSize: 10, marginBottom: 2 }}>🎯</div>
    <EditableLabel id={id} data={data} />
    {data.ikigaiCategory && <IkigaiBadge category={data.ikigaiCategory} />}
    <Handle type="source" position={Position.Right} style={{ width: 8, height: 8 }} />
    <Handle type="target" position={Position.Left} style={{ width: 8, height: 8 }} />
  </div>
));

export const nodeTypes = {
  rootNode: RootNode,
  branchNode: BranchNode,
  leafNode: LeafNode,
  goalNode: GoalNode,
};
