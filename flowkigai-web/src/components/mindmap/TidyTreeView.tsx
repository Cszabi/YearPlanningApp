import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { HierarchyPointNode } from "d3";
import type { MindMapNodeDto } from "@/api/mindMapApi";
import { LIFE_AREA_COLORS } from "./nodes";

// Horizontal left-to-right tidy tree layout (Reingold–Tilford via d3.tree)
// ViewBox 1000×1000, root on the left, leaves on the right.
const VB = 1000;
const MAX_DEPTH = 3;
const NODE_R = 7;
const ML = 70;   // left margin (root area)
const MT = 40;   // top/bottom margin
const MR = 200;  // right margin (space for leaf labels)

function blendWithWhite(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * t + 255 * (1 - t))},${Math.round(g * t + 255 * (1 - t))},${Math.round(b * t + 255 * (1 - t))})`;
}

function limitDepth(nodes: MindMapNodeDto[], maxDepth: number): MindMapNodeDto[] {
  const rootNode = nodes.find((n) => n.parentNodeId === null);
  if (!rootNode) return nodes;
  const allowed = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: rootNode.id, depth: 0 }];
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    allowed.add(id);
    if (depth < maxDepth) {
      nodes.filter((n) => n.parentNodeId === id).forEach((n) => queue.push({ id: n.id, depth: depth + 1 }));
    }
  }
  return nodes.filter((n) => allowed.has(n.id));
}

type PNode = HierarchyPointNode<MindMapNodeDto>;

function buildTidyTree(nodes: MindMapNodeDto[]): PNode | null {
  if (!nodes.length) return null;
  const limited = limitDepth(nodes, MAX_DEPTH);
  try {
    const root = d3
      .stratify<MindMapNodeDto>()
      .id((d) => d.id)
      .parentId((d) => d.parentNodeId)(limited);
    // size([height = vertical spread, width = horizontal depth])
    return d3.tree<MindMapNodeDto>().size([VB - MT * 2, VB - ML - MR])(root);
  } catch {
    return null;
  }
}

// Screen position: x = depth (node.y), y = vertical (node.x)
function sx(d: PNode): number { return d.y + ML; }
function sy(d: PNode): number { return d.x + MT; }

function linkPath(source: PNode, target: PNode): string {
  const midX = (sx(source) + sx(target)) / 2;
  return `M${sx(source)},${sy(source)}C${midX},${sy(source)},${midX},${sy(target)},${sx(target)},${sy(target)}`;
}

function getBranchColor(d: PNode): string {
  if (d.depth === 0) return "#0EA5E9";
  let node: PNode = d;
  while (node.depth > 1 && node.parent) node = node.parent as PNode;
  const idx = node.parent?.children?.indexOf(node) ?? 0;
  const base = LIFE_AREA_COLORS[idx % LIFE_AREA_COLORS.length];
  if (d.depth === 1) return base;
  return blendWithWhite(base, Math.max(0.38, 1 - (d.depth - 1) * 0.28));
}

function truncate(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
}

export interface TidyTreeViewProps {
  nodes: MindMapNodeDto[];
  canGoUp: boolean;
  onZoomIn: (nodeId: string) => void;
  onZoomOut: () => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onRename: (nodeId: string, label: string) => void;
  onHover: (label: string | null, x: number, y: number) => void;
}

export default function TidyTreeView({
  nodes,
  canGoUp,
  onZoomIn,
  onZoomOut,
  onContextMenu,
  onRename,
  onHover,
}: TidyTreeViewProps) {
  const root = useMemo(() => buildTidyTree(nodes), [nodes]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!root) return null;

  const links = root.links();
  const descendants = root.descendants();

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="ttCenterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </radialGradient>
      </defs>

      {/* Links */}
      {links.map((link, i) => (
        <path
          key={i}
          d={linkPath(link.source as PNode, link.target as PNode)}
          fill="none"
          stroke={getBranchColor(link.target as PNode)}
          strokeWidth={2}
          strokeOpacity={0.4}
        />
      ))}

      {/* Nodes */}
      {descendants.map((d) => {
        const color = getBranchColor(d);
        const isRoot = d.depth === 0;
        const isHovered = hoveredId === d.data.id;
        const isGoal = d.data.nodeType === "Goal";
        const labelText = isGoal ? "🎯 " + d.data.label : d.data.label;
        const canClick = !!(d.children || d.depth >= MAX_DEPTH);
        const nodeX = sx(d);
        const nodeY = sy(d);
        const r = isRoot ? 22 : isHovered ? NODE_R + 2 : NODE_R;

        return (
          <g
            key={d.data.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isRoot && canGoUp) { onZoomOut(); return; }
              if (!isRoot && canClick) onZoomIn(d.data.id);
            }}
            onDoubleClick={(e) => { e.stopPropagation(); if (!isRoot) onRename(d.data.id, d.data.label); }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(d.data.id, e.clientX, e.clientY);
            }}
            onMouseEnter={(e) => {
              if (!isRoot) { setHoveredId(d.data.id); onHover(d.data.label, e.clientX, e.clientY); }
            }}
            onMouseMove={(e) => { if (!isRoot) onHover(d.data.label, e.clientX, e.clientY); }}
            onMouseLeave={() => { setHoveredId(null); onHover(null, 0, 0); }}
            style={{ cursor: isRoot ? (canGoUp ? "pointer" : "default") : (canClick ? "pointer" : "default") }}
          >
            <circle
              cx={nodeX}
              cy={nodeY}
              r={r}
              fill={isRoot ? (canGoUp ? "white" : "url(#ttCenterGrad)") : color}
              stroke={isRoot && canGoUp ? "#0EA5E9" : "white"}
              strokeWidth={isRoot ? 2.5 : 1.5}
              filter={isRoot && !canGoUp ? "drop-shadow(0 2px 8px rgba(14,165,233,0.45))" : undefined}
            />

            {/* Root label */}
            {isRoot && (
              <>
                <text
                  x={nodeX}
                  y={canGoUp ? nodeY - 13 : nodeY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={canGoUp ? "#0EA5E9" : "white"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {truncate(d.data.label, 14)}
                </text>
                {canGoUp && (
                  <text
                    x={nodeX}
                    y={nodeY + 13}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="#94A3B8"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    ↑ back
                  </text>
                )}
              </>
            )}

            {/* Non-root label */}
            {!isRoot && (
              <text
                x={nodeX + NODE_R + 5}
                y={nodeY}
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={d.depth === 1 ? 600 : 400}
                fill="#374151"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {truncate(labelText, 26)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
