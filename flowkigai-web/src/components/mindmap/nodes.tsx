import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

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

export interface MindMapNodeData {
  label: string;
  notes: string | null;
  linkedGoalId: string | null;
  editing: boolean;
  colorIndex: number;
  onLabelSave: (id: string, label: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
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

  if (!data.editing) return <span style={style}>{data.label}</span>;

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
