import { useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import type { MindMapNodeDto } from "@/api/mindMapApi";
import { LIFE_AREA_COLORS } from "./nodes";
import { runForceLayout } from "./forceDirectedLayout";

const VB = 1000;
const NODE_R = 9;

function blendWithWhite(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * t + 255 * (1 - t))},${Math.round(g * t + 255 * (1 - t))},${Math.round(b * t + 255 * (1 - t))})`;
}

interface NodeInfo {
  depth: number;
  color: string;
}

function computeNodeInfo(nodes: MindMapNodeDto[]): Map<string, NodeInfo> {
  const root = nodes.find((n) => n.parentNodeId === null);
  if (!root) return new Map();

  const childrenMap = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentNodeId) {
      if (!childrenMap.has(n.parentNodeId)) childrenMap.set(n.parentNodeId, []);
      childrenMap.get(n.parentNodeId)!.push(n.id);
    }
  }

  const result = new Map<string, NodeInfo>();
  result.set(root.id, { depth: 0, color: "#0EA5E9" });

  const rootChildren = childrenMap.get(root.id) ?? [];
  const queue: Array<{ id: string; depth: number; branchColor: string }> =
    rootChildren.map((childId, i) => ({
      id: childId,
      depth: 1,
      branchColor: LIFE_AREA_COLORS[i % LIFE_AREA_COLORS.length],
    }));

  while (queue.length) {
    const { id, depth, branchColor } = queue.shift()!;
    const color =
      depth === 1
        ? branchColor
        : blendWithWhite(branchColor, Math.max(0.38, 1 - (depth - 1) * 0.28));
    result.set(id, { depth, color });
    const children = childrenMap.get(id) ?? [];
    children.forEach((childId) => queue.push({ id: childId, depth: depth + 1, branchColor }));
  }

  return result;
}

function truncate(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
}

export interface ForceDirectedViewProps {
  nodes: MindMapNodeDto[];
  canGoUp: boolean;
  onZoomIn: (nodeId: string) => void;
  onZoomOut: () => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onRename: (nodeId: string, label: string, x: number, y: number) => void;
  onHover: (label: string | null, x: number, y: number) => void;
  focusMode?: boolean;
  focusColorMap?: Map<string, string>;
}

export default function ForceDirectedView({
  nodes,
  canGoUp,
  onZoomIn,
  onZoomOut,
  onContextMenu,
  onRename,
  onHover,
  focusMode = false,
  focusColorMap,
}: ForceDirectedViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const labelFill   = isDark ? "#FFFFFF" : "#374151";
  const labelStroke = isDark ? "rgba(0,0,0,0.55)" : "none";

  // Run simulation synchronously — result memoised until nodes change
  const positions = useMemo(() => runForceLayout(nodes), [nodes]);
  const nodeInfo = useMemo(() => computeNodeInfo(nodes), [nodes]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startLP(id: string, x: number, y: number) {
    lpTimer.current = setTimeout(() => {
      onContextMenu(id, x, y);
      lpTimer.current = null;
    }, 600);
  }
  function cancelLP() {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  }

  const root = nodes.find((n) => n.parentNodeId === null);
  if (!root) return null;

  const nonRootNodes = nodes.filter((n) => n.parentNodeId !== null);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="fdCenterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </radialGradient>
      </defs>

      <g transform={`translate(${VB / 2},${VB / 2})`}>
        {/* Links — drawn before nodes so nodes appear on top */}
        {nonRootNodes.map((n) => {
          const from = positions.get(n.parentNodeId!);
          const to = positions.get(n.id);
          if (!from || !to) return null;
          const info = nodeInfo.get(n.id);
          return (
            <line
              key={`link-${n.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={info?.color ?? "#9CA3AF"}
              strokeWidth={2}
              strokeOpacity={0.4}
            />
          );
        })}

        {/* Non-root nodes */}
        {nonRootNodes.map((n) => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const info = nodeInfo.get(n.id);
          const isGoal = n.nodeType === "Goal";
          const color =
            focusMode && focusColorMap?.has(n.id)
              ? focusColorMap.get(n.id)!
              : (info?.color ?? "#9CA3AF");
          const isHovered = hoveredId === n.id;
          const nodeIcon = n.icon ? n.icon + " " : "";
          const labelText = nodeIcon + (isGoal ? "🎯 " : "") + n.label;

          return (
            <g
              key={n.id}
              onClick={(e) => {
                e.stopPropagation();
                onZoomIn(n.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRename(n.id, n.label, e.clientX, e.clientY);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(n.id, e.clientX, e.clientY);
              }}
              onMouseEnter={(e) => {
                setHoveredId(n.id);
                onHover(n.label, e.clientX, e.clientY);
              }}
              onMouseMove={(e) => onHover(n.label, e.clientX, e.clientY)}
              onMouseLeave={() => {
                setHoveredId(null);
                onHover(null, 0, 0);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                startLP(n.id, e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={cancelLP}
              onTouchMove={cancelLP}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? NODE_R + 2 : NODE_R}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={pos.x + NODE_R + 6}
                y={pos.y}
                dominantBaseline="middle"
                fontSize={15}
                fontWeight={info?.depth === 1 ? 600 : 400}
                fill={labelFill}
                stroke={labelStroke}
                strokeWidth={isDark ? 3 : 0}
                paintOrder="stroke fill"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {truncate(labelText, 22)}
              </text>
            </g>
          );
        })}

        {/* Root node — fixed at (0, 0) in translated coords */}
        {(() => {
          const pos = positions.get(root.id) ?? { x: 0, y: 0 };
          const truncCenter =
            root.label.length > 14 ? root.label.slice(0, 12) + "…" : root.label;
          return (
            <g>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={22}
                fill={canGoUp ? "white" : "url(#fdCenterGrad)"}
                stroke={canGoUp ? "#0EA5E9" : "none"}
                strokeWidth={canGoUp ? 2.5 : 0}
                filter={canGoUp ? undefined : "drop-shadow(0 2px 8px rgba(14,165,233,0.45))"}
                style={{ cursor: canGoUp ? "pointer" : "default" }}
                onClick={canGoUp ? (e) => { e.stopPropagation(); onZoomOut(); } : undefined}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(root.id, e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  startLP(root.id, e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchEnd={cancelLP}
                onTouchMove={cancelLP}
              />
              <text
                x={pos.x}
                y={canGoUp ? pos.y - 13 : pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={15}
                fontWeight={700}
                fill={canGoUp ? "#0EA5E9" : "white"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {truncCenter}
              </text>
              {canGoUp && (
                <text
                  x={pos.x}
                  y={pos.y + 13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="#94A3B8"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  ↑ back
                </text>
              )}
            </g>
          );
        })()}
      </g>
    </svg>
  );
}
