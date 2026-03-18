import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { HierarchyPointNode } from "d3";
import type { MindMapNodeDto } from "@/api/mindMapApi";
import { LIFE_AREA_COLORS } from "./nodes";

const VB = 1000;
const TREE_R = 360;  // tighter rings
const MAX_DEPTH = 3;
const NODE_R = 9;

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

function buildRadialTree(nodes: MindMapNodeDto[]): PNode | null {
  if (!nodes.length) return null;
  const limited = limitDepth(nodes, MAX_DEPTH);
  try {
    const root = d3
      .stratify<MindMapNodeDto>()
      .id((d) => d.id)
      .parentId((d) => d.parentNodeId)(limited);
    return d3.cluster<MindMapNodeDto>().size([2 * Math.PI, TREE_R])(root);
  } catch {
    return null;
  }
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

function radialPoint(angle: number, radius: number): [number, number] {
  return [Math.cos(angle - Math.PI / 2) * radius, Math.sin(angle - Math.PI / 2) * radius];
}

function radialLinkPath(source: PNode, target: PNode): string {
  const [sx, sy] = radialPoint(source.x, source.y);
  const [tx, ty] = radialPoint(target.x, target.y);
  const [c1x, c1y] = radialPoint(target.x, source.y);
  return `M${sx.toFixed(1)},${sy.toFixed(1)}C${c1x.toFixed(1)},${c1y.toFixed(1)},${tx.toFixed(1)},${ty.toFixed(1)},${tx.toFixed(1)},${ty.toFixed(1)}`;
}

export interface RadialTreeViewProps {
  nodes: MindMapNodeDto[];
  canGoUp: boolean;
  onZoomIn: (nodeId: string) => void;
  onZoomOut: () => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onRename: (nodeId: string, label: string) => void;
  onHover: (label: string | null, x: number, y: number) => void;
}

export default function RadialTreeView({
  nodes,
  canGoUp,
  onZoomIn,
  onZoomOut,
  onContextMenu,
  onRename,
  onHover,
}: RadialTreeViewProps) {
  const root = useMemo(() => buildRadialTree(nodes), [nodes]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!root) return null;

  const links = root.links();
  const descendants = root.descendants();
  const centerLabel = root.data.label;
  const truncCenter = centerLabel.length > 14 ? centerLabel.slice(0, 12) + "…" : centerLabel;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="rtCenterGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </radialGradient>
      </defs>
      <g transform={`translate(${VB / 2},${VB / 2})`}>
        {/* Links */}
        {links.map((link, i) => (
          <path
            key={i}
            d={radialLinkPath(link.source as PNode, link.target as PNode)}
            fill="none"
            stroke={getBranchColor(link.target as PNode)}
            strokeWidth={2}
            strokeOpacity={0.4}
          />
        ))}

        {/* Nodes (depth > 0) */}
        {descendants
          .filter((d) => d.depth > 0)
          .map((d) => {
            const color = getBranchColor(d);
            const isHovered = hoveredId === d.data.id;
            const isGoal = d.data.nodeType === "Goal";
            const nodeIcon = d.data.icon ? d.data.icon + " " : "";
            const label = nodeIcon + (isGoal ? "🎯 " : "") + d.data.label;
            const canClick = !!(d.children || d.depth >= MAX_DEPTH);
            const angleDeg = (d.x * 180) / Math.PI - 90;
            const flipLabel = d.x >= Math.PI;

            return (
              <g
                key={d.data.id}
                transform={`rotate(${angleDeg}) translate(${d.y},0)`}
                onClick={(e) => { e.stopPropagation(); if (canClick) onZoomIn(d.data.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); onRename(d.data.id, d.data.label); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(d.data.id, e.clientX, e.clientY);
                }}
                onMouseEnter={(e) => { setHoveredId(d.data.id); onHover(d.data.label, e.clientX, e.clientY); }}
                onMouseMove={(e) => onHover(d.data.label, e.clientX, e.clientY)}
                onMouseLeave={() => { setHoveredId(null); onHover(null, 0, 0); }}
                style={{ cursor: canClick ? "pointer" : "default" }}
              >
                <circle
                  r={isHovered ? NODE_R + 2 : NODE_R}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  dy="0.31em"
                  x={flipLabel ? -(NODE_R + 6) : NODE_R + 6}
                  textAnchor={flipLabel ? "end" : "start"}
                  transform={flipLabel ? "rotate(180)" : undefined}
                  fontSize={15}
                  fontWeight={d.depth === 1 ? 600 : 400}
                  fill="#374151"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

        {/* Root center */}
        <circle
          r={22}
          fill={canGoUp ? "white" : "url(#rtCenterGrad)"}
          stroke={canGoUp ? "#0EA5E9" : "none"}
          strokeWidth={canGoUp ? 2.5 : 0}
          filter={canGoUp ? undefined : "drop-shadow(0 2px 8px rgba(14,165,233,0.45))"}
          style={{ cursor: canGoUp ? "pointer" : "default" }}
          onClick={canGoUp ? (e) => { e.stopPropagation(); onZoomOut(); } : undefined}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(root.data.id, e.clientX, e.clientY);
          }}
        />
        <text
          textAnchor="middle"
          y={canGoUp ? -13 : 0}
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
            textAnchor="middle"
            y={13}
            dominantBaseline="middle"
            fontSize={12}
            fill="#94A3B8"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            ↑ back
          </text>
        )}
      </g>
    </svg>
  );
}
