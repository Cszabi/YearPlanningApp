import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Coordinate system: fixed 1000×1000 viewBox, radius 460 units ─────────────
// The SVG uses preserveAspectRatio="xMidYMid meet" so it always fits fully
// in its container without clipping, regardless of screen size.
const VB = 1000;           // viewBox side length
const RADIUS = 460;        // sunburst radius in viewBox units (20px margin each side)
import * as d3 from "d3";
import type { HierarchyRectangularNode } from "d3";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  Typography, Stack, Divider, Paper, IconButton, Box,
  List, ListItemButton, ListItemText,
  ToggleButtonGroup, ToggleButton, Alert, Checkbox, useMediaQuery,
} from "@mui/material";
import { IKIGAI_CATEGORY_CONFIG, getFocusColor, FOCUS_LEGEND, buildFocusColorMap } from "./nodes";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { mindMapApi, type MindMapNodeDto } from "@/api/mindMapApi";
import { habitApi } from "@/api/habitApi";
import { LIFE_AREA_COLORS, LIFE_AREA_NAMES } from "./nodes";
import RadialTreeView from "./RadialTreeView";
import TidyTreeView from "./TidyTreeView";

// ── View registry ─────────────────────────────────────────────────────────────
const VIEW_OPTIONS = [
  { value: "sunburst",    label: "Sunburst",    icon: "☀️" },
  { value: "radial-tree", label: "Radial Tree", icon: "🌿" },
  { value: "tidy-tree",   label: "Tidy Tree",   icon: "🌳" },
] as const;
type ViewMode = (typeof VIEW_OPTIONS)[number]["value"];

const YEAR = new Date().getFullYear();

const LIFE_AREA_KEYS = [
  "CareerWork", "HealthBody", "RelationshipsFamily", "LearningGrowth",
  "Finance", "CreativityHobbies", "EnvironmentLifestyle", "ContributionPurpose",
];

type HNode = HierarchyRectangularNode<MindMapNodeDto>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function blendWithWhite(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * t + 255 * (1 - t))},${Math.round(g * t + 255 * (1 - t))},${Math.round(b * t + 255 * (1 - t))})`;
}

// Returns [branchBaseColor, branchIndex] for a node
function getBranchInfo(d: HNode): { base: string; idx: number } {
  if (d.depth === 0) return { base: "#0EA5E9", idx: 0 };
  let node: HNode = d;
  while (node.depth > 1 && node.parent) node = node.parent as HNode;
  const idx = node.parent?.children?.indexOf(node) ?? 0;
  return { base: LIFE_AREA_COLORS[idx % LIFE_AREA_COLORS.length], idx };
}

function getBranchColor(d: HNode): string {
  if (d.depth === 0) return "#0EA5E9";
  const { base } = getBranchInfo(d);
  if (d.depth === 1) return base;
  // Keep depth-2 still quite vibrant (0.65), depth-3 a bit lighter (0.45)
  return blendWithWhite(base, Math.max(0.38, 1 - (d.depth - 1) * 0.28));
}

function getSubtree(nodes: MindMapNodeDto[], rootId: string): MindMapNodeDto[] {
  const ids = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    ids.add(id);
    nodes.filter((n) => n.parentNodeId === id).forEach((n) => queue.push(n.id));
  }
  return nodes
    .filter((n) => ids.has(n.id))
    .map((n) => (n.id === rootId ? { ...n, parentNodeId: null } : n));
}

const MAX_DEPTH = 3; // center (depth 0) + 3 rings visible at once

// Keep only nodes within MAX_DEPTH levels of the local root so that
// d3.stratify receives a tree of the correct height (root.height <= MAX_DEPTH).
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

function buildPartition(nodes: MindMapNodeDto[]): HNode | null {
  if (!nodes.length) return null;
  const limited = limitDepth(nodes, MAX_DEPTH);
  try {
    const root = d3
      .stratify<MindMapNodeDto>()
      .id((d) => d.id)
      .parentId((d) => d.parentNodeId)(limited);
    root.sum(() => 1).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    d3.partition<MindMapNodeDto>().size([2 * Math.PI, root.height + 1])(root);
    return root as unknown as HNode;
  } catch {
    return null;
  }
}

// ── Label word-wrap helper ────────────────────────────────────────────────────
// Tries progressively smaller font sizes (baseFontSize → MIN_FS) until the
// word-wrapped lines fit both the arc length (width) and ring depth (height).
// Never truncates with "…" — if even MIN_FS doesn't fit, renders as many
// complete lines as the ring allows at MIN_FS.
function wrapLabel(label: string, arcLen: number, ringW: number, baseFontSize: number): { lines: string[]; fs: number } {
  const MIN_FS = 13;
  const availH = ringW * 0.78;

  function doWrap(words: string[], maxChars: number): string[] {
    const result: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) result.push(current);
        current = word; // long single word gets its own line, no truncation
      }
    }
    if (current) result.push(current);
    return result;
  }

  const words = label.split(/\s+/).filter(Boolean);

  for (let fs = baseFontSize; fs >= MIN_FS; fs -= 1) {
    const charW = fs * 0.56;
    const maxChars = Math.max(2, Math.floor(arcLen / charW));
    const lineH = fs * 1.25;
    const lines = doWrap(words, maxChars);
    const longestLineLen = Math.max(...lines.map((l) => l.length));
    const totalH = lines.length * lineH;
    if (longestLineLen <= maxChars && totalH <= availH) {
      return { lines, fs };
    }
  }

  // Fallback: MIN_FS, keep as many complete lines as fit vertically
  const charW = MIN_FS * 0.56;
  const maxChars = Math.max(2, Math.floor(arcLen / charW));
  const lineH = MIN_FS * 1.25;
  const lines = doWrap(words, maxChars);
  const maxLineCount = Math.max(1, Math.floor(availH / lineH));
  return { lines: lines.slice(0, maxLineCount), fs: MIN_FS };
}

// ── Sunburst SVG (pure rendering) ─────────────────────────────────────────────

interface SunburstSvgProps {
  root: HNode;
  canGoUp: boolean;
  onZoomIn: (nodeId: string) => void;
  onZoomOut: () => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onRename: (nodeId: string, label: string, x: number, y: number) => void;
  onHover: (label: string | null, x: number, y: number) => void;
  focusMode?: boolean;
  focusColorMap?: Map<string, string>;
}

function SunburstSvg({ root, canGoUp, onZoomIn, onZoomOut, onContextMenu, onRename, onHover, focusMode = false, focusColorMap }: SunburstSvgProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startLP(id: string, x: number, y: number) {
    lpTimer.current = setTimeout(() => { onContextMenu(id, x, y); lpTimer.current = null; }, 600);
  }
  function cancelLP() {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; }
  }

  const { arcs, centerR, centerLabel } = useMemo(() => {
    const xs = d3.scaleLinear().domain([root.x0, root.x1]).range([0, 2 * Math.PI]).clamp(true);
    const ys = d3.scaleLinear()
      .domain([root.y0, root.y0 + root.height + 1])
      .range([0, RADIUS])
      .clamp(true);

    const arcGen = d3
      .arc<HNode>()
      .startAngle((d) => xs(d.x0))
      .endAngle((d) => xs(d.x1))
      .padAngle((d) => Math.min((xs(d.x1) - xs(d.x0)) / 2, 0.005))
      .padRadius(RADIUS * 1.5)
      .innerRadius((d) => ys(d.y0))
      .outerRadius((d) => Math.max(ys(d.y0), ys(d.y1) - 1.5));

    const builtArcs = root
      .descendants()
      .filter((d) => d.depth > 0)
      .map((d) => {
        const path = arcGen(d) ?? "";
        const midAngleDeg = ((xs(d.x0) + xs(d.x1)) / 2) * (180 / Math.PI);
        const midRPx = (ys(d.y0) + ys(d.y1)) / 2;
        const arcSpan = xs(d.x1) - xs(d.x0);
        const arcLen = arcSpan * midRPx;
        const ringW = ys(d.y1) - ys(d.y0);
        // Thresholds in viewBox units — proportional to RADIUS
        const showLabel = arcLen > RADIUS * 0.07 && ringW > RADIUS * 0.025;
        const flip = midAngleDeg > 180;
        const labelTransform = `rotate(${midAngleDeg - 90}) translate(${midRPx},0) rotate(${flip ? 180 : 0})`;
        return { d, path, color: getBranchColor(d), showLabel, labelTransform, arcLen, ringW };
      });

    return {
      arcs: builtArcs,
      centerR: Math.max(ys(root.y0 + 1) - 1.5, RADIUS * 0.12),
      centerLabel: root.data.label,
    };
  }, [root]);

  const truncCenter =
    centerLabel.length > 18 ? centerLabel.slice(0, 16) + "…" : centerLabel;
  // Font sizes in viewBox units (~24 ≈ 14px at typical screen scale)
  const fs = 24;

  return (
    <>
      {arcs.map(({ d, path, color, showLabel, labelTransform, arcLen, ringW }) => {
        const isHovered = hoveredId === d.data.id;
        const isGoal = d.data.nodeType === "Goal";
        const arcColor = (focusMode && focusColorMap?.has(d.data.id))
          ? focusColorMap.get(d.data.id)!
          : color;
        const nodeIcon = d.data.icon ? d.data.icon + " " : "";
        const rawLabel = nodeIcon + (isGoal ? "🎯 " : "") + d.data.label;
        const { lines, fs: lineFs } = wrapLabel(rawLabel, arcLen, ringW, fs);
        const lineH = lineFs * 1.25;
        return (
          <g key={d.data.id}>
            <path
              d={path}
              fill={isHovered ? blendWithWhite(arcColor.startsWith("rgb") ? "#888" : arcColor, 0.7) : arcColor}
              stroke="white"
              strokeWidth={1.5}
              opacity={isHovered ? 0.82 : 1}
              style={{ cursor: "pointer", transition: "opacity 0.12s" }}
              onClick={(e) => {
                e.stopPropagation();
                // Zoom in if node has visible children OR is at the depth limit
                // (it may have hidden children beyond the 3-ring view)
                if (d.children || d.depth >= MAX_DEPTH) onZoomIn(d.data.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRename(d.data.id, d.data.label, e.clientX, e.clientY);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(d.data.id, e.clientX, e.clientY);
              }}
              onMouseEnter={(e) => { setHoveredId(d.data.id); onHover(d.data.label, e.clientX, e.clientY); }}
              onMouseMove={(e) => onHover(d.data.label, e.clientX, e.clientY)}
              onMouseLeave={() => { setHoveredId(null); onHover(null, 0, 0); }}
              onTouchStart={(e) => { e.stopPropagation(); startLP(d.data.id, e.touches[0].clientX, e.touches[0].clientY); }}
              onTouchEnd={cancelLP}
              onTouchMove={cancelLP}
            />
            {showLabel && (
              <text
                transform={labelTransform}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={lineFs}
                fontWeight={d.depth === 1 ? 600 : 400}
                fill={d.depth === 1 ? "white" : "#374151"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x="0" dy={i === 0 ? -(lines.length - 1) * lineH / 2 : lineH}>
                    {line}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        );
      })}

      {/* Defs for center gradient */}
      <defs>
        <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </radialGradient>
      </defs>

      {/* Center circle — click to go back (when zoomed), right-click for options */}
      <circle
        r={centerR}
        fill={canGoUp ? "white" : "url(#centerGrad)"}
        stroke={canGoUp ? "#0EA5E9" : "none"}
        strokeWidth={canGoUp ? 2.5 : 0}
        filter={canGoUp ? undefined : "drop-shadow(0 2px 8px rgba(14,165,233,0.45))"}
        style={{ cursor: "pointer" }}
        onClick={canGoUp ? (e) => { e.stopPropagation(); onZoomOut(); } : undefined}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(root.data.id, e.clientX, e.clientY);
        }}
        onTouchStart={(e) => { e.stopPropagation(); startLP(root.data.id, e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={cancelLP}
        onTouchMove={cancelLP}
      />
      <text
        textAnchor="middle"
        y={canGoUp ? -fs * 0.7 : 0}
        dominantBaseline="middle"
        fontSize={fs}
        fontWeight={700}
        fill={canGoUp ? "#0EA5E9" : "white"}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {truncCenter}
      </text>
      {canGoUp && (
        <text
          textAnchor="middle"
          y={fs * 0.9}
          dominantBaseline="middle"
          fontSize={fs * 0.78}
          fill="#94A3B8"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          ↑ back
        </text>
      )}
    </>
  );
}

// ── Main canvas (state + modals) ───────────────────────────────────────────────

export default function MindMapCanvas() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [apiNodes, setApiNodes] = useState<MindMapNodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("sunburst");
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [focusMode, setFocusMode] = useState(false);
  const [deadlineFilter, setDeadlineFilter] = useState<number | null>(null);
  const [visibleFocusColors, setVisibleFocusColors] = useState<Set<string>>(
    () => new Set(FOCUS_LEGEND.map((l) => l.color))
  );

  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [creating, setCreating] = useState<{ parentId: string } | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [editPanel, setEditPanel] = useState<{
    nodeId: string; nodeType: string; label: string;
    notes: string; ikigaiCategory: string; icon: string; lifeArea: string;
  } | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ nodeId: string; label: string; x: number; y: number } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [convertModal, setConvertModal] = useState<{ nodeId: string } | null>(null);
  const [convertGoalType, setConvertGoalType] = useState<string | null>(null);
  const [convertLifeArea, setConvertLifeArea] = useState("CareerWork");
  const [converting, setConverting] = useState(false);
  const [habitFrequency, setHabitFrequency] = useState("Daily");
  const [habitMvd, setHabitMvd] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  const handleHover = useCallback(
    (label: string | null, x: number, y: number) =>
      label ? setTooltip({ label, x, y }) : setTooltip(null),
    []
  );

  // Load map
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let map: Awaited<ReturnType<typeof mindMapApi.getMap>>;
        try {
          map = await mindMapApi.getMap(YEAR);
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            map = await mindMapApi.createMap(YEAR);
          } else throw err;
        }
        setApiNodes(map.nodes);
      } catch {
        setError("Could not load your mind map.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadKey]);

  const displayNodes = useMemo(
    () => (focusedId ? getSubtree(apiNodes, focusedId) : apiNodes),
    [apiNodes, focusedId]
  );

  const filteredDisplayNodes = useMemo(() => {
    if (!deadlineFilter) return displayNodes;
    const cutoff = Date.now() + deadlineFilter * 86400000;
    const matchingIds = new Set(
      displayNodes
        .filter((n) => n.nodeType === "Goal" && n.goalTargetDate && new Date(n.goalTargetDate).getTime() <= cutoff)
        .map((n) => n.id)
    );
    if (matchingIds.size === 0) return displayNodes;
    const nodeMap = new Map(displayNodes.map((n) => [n.id, n]));
    const neededIds = new Set<string>();
    const addAncestors = (id: string) => {
      if (neededIds.has(id)) return;
      neededIds.add(id);
      const node = nodeMap.get(id);
      if (node?.parentNodeId) addAncestors(node.parentNodeId);
    };
    matchingIds.forEach((id) => addAncestors(id));
    return displayNodes.filter((n) => neededIds.has(n.id));
  }, [displayNodes, deadlineFilter]);

  const focusFilteredNodes = useMemo(() => {
    if (!focusMode) return filteredDisplayNodes;

    const nodeMap = new Map(filteredDisplayNodes.map((n) => [n.id, n]));
    const childrenMap = new Map<string, string[]>();
    for (const n of filteredDisplayNodes) {
      if (n.parentNodeId) {
        if (!childrenMap.has(n.parentNodeId)) childrenMap.set(n.parentNodeId, []);
        childrenMap.get(n.parentNodeId)!.push(n.id);
      }
    }

    // Goals whose colour is unchecked in the legend
    const excludedGoalIds = new Set(
      filteredDisplayNodes
        .filter((n) => n.nodeType === "Goal" && !visibleFocusColors.has(getFocusColor(n)))
        .map((n) => n.id)
    );

    // Does this node's subtree contain any goal?
    const anyGoalCache = new Map<string, boolean>();
    function hasAnyGoal(id: string): boolean {
      if (anyGoalCache.has(id)) return anyGoalCache.get(id)!;
      const n = nodeMap.get(id);
      if (!n) { anyGoalCache.set(id, false); return false; }
      const result = n.nodeType === "Goal"
        ? true
        : (childrenMap.get(id) ?? []).some(hasAnyGoal);
      anyGoalCache.set(id, result);
      return result;
    }

    // Does this node's subtree contain at least one *visible* (unchecked) goal?
    const visibleGoalCache = new Map<string, boolean>();
    function hasVisibleGoal(id: string): boolean {
      if (visibleGoalCache.has(id)) return visibleGoalCache.get(id)!;
      const n = nodeMap.get(id);
      if (!n) { visibleGoalCache.set(id, false); return false; }
      const result = n.nodeType === "Goal"
        ? !excludedGoalIds.has(id)
        : (childrenMap.get(id) ?? []).some(hasVisibleGoal);
      visibleGoalCache.set(id, result);
      return result;
    }

    const excludedIds = new Set<string>();
    for (const n of filteredDisplayNodes) {
      if (n.nodeType === "Root") continue; // root is always visible
      if (n.nodeType === "Goal") {
        if (excludedGoalIds.has(n.id)) excludedIds.add(n.id);
      } else {
        // Hide a non-goal parent only when it has goal descendants and none are visible
        if (hasAnyGoal(n.id) && !hasVisibleGoal(n.id)) excludedIds.add(n.id);
      }
    }

    // Propagate downward so no orphan nodes remain
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of filteredDisplayNodes) {
        if (!excludedIds.has(n.id) && n.parentNodeId !== null && excludedIds.has(n.parentNodeId)) {
          excludedIds.add(n.id);
          changed = true;
        }
      }
    }

    return filteredDisplayNodes.filter((n) => !excludedIds.has(n.id));
  }, [filteredDisplayNodes, focusMode, visibleFocusColors]);

  const focusColorMap = useMemo(
    () => focusMode ? buildFocusColorMap(focusFilteredNodes) : new Map<string, string>(),
    [focusFilteredNodes, focusMode]
  );

  const root = useMemo(() => buildPartition(focusFilteredNodes), [focusFilteredNodes]);

  const focusedParentId = useMemo(
    () => (focusedId ? (apiNodes.find((n) => n.id === focusedId)?.parentNodeId ?? null) : null),
    [focusedId, apiNodes]
  );

  const rootNodeId = apiNodes.find((n) => n.nodeType === "Root")?.id ?? null;

  // ── Create node ──────────────────────────────────────────────────────────────
  async function handleCreateNode() {
    if (!newNodeLabel.trim() || !creating) return;
    const parent = apiNodes.find((n) => n.id === creating.parentId);
    const nodeType = parent?.nodeType === "Root" ? "Branch" : "Leaf";
    const apiNode = await mindMapApi
      .addNode(YEAR, { parentNodeId: creating.parentId, nodeType, label: newNodeLabel.trim(), positionX: 0, positionY: 0 })
      .catch(() => null);
    if (apiNode) setApiNodes((prev) => [...prev, apiNode]);
    setCreating(null);
    setNewNodeLabel("");
  }

  // ── Open edit panel ───────────────────────────────────────────────────────────
  function openEditPanel(nodeId: string) {
    const n = apiNodes.find((x) => x.id === nodeId);
    if (!n) return;
    setEditPanel({ nodeId, nodeType: n.nodeType, label: n.label, notes: n.notes ?? "", ikigaiCategory: n.ikigaiCategory ?? "", icon: n.icon ?? "", lifeArea: n.lifeArea ?? "" });
  }

  // ── Save edit panel ───────────────────────────────────────────────────────────
  async function handleEditPanelSave() {
    if (!editPanel) return;
    const { nodeId, label, notes, ikigaiCategory, icon, lifeArea } = editPanel;
    if (!label.trim()) return;
    await mindMapApi.updateNode(YEAR, nodeId, { label: label.trim(), notes, ikigaiCategory, icon, lifeArea }).catch(() => {});
    setApiNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, label: label.trim(), notes: notes || null, ikigaiCategory: ikigaiCategory || null, icon: icon || null, lifeArea: lifeArea || null }
          : n
      )
    );
    setEditPanel(null);
  }

  // ── Inline label edit ────────────────────────────────────────────────────────
  async function handleInlineEditSave() {
    if (!inlineEdit) return;
    const { nodeId } = inlineEdit;
    const label = inlineEditValue.trim();
    setInlineEdit(null);
    if (!label) return;
    await mindMapApi.updateNode(YEAR, nodeId, { label }).catch(() => {});
    setApiNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, label } : n)));
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  function handleDeleteRequest(nodeId: string) {
    setContextMenu(null);
    setEditPanel(null);
    if (apiNodes.some((n) => n.parentNodeId === nodeId)) {
      setDeleteConfirm(nodeId);
    } else {
      doDelete(nodeId);
    }
  }

  async function doDelete(nodeId: string) {
    setDeleteConfirm(null);
    const toDelete = new Set<string>();
    const queue = [nodeId];
    while (queue.length) {
      const id = queue.shift()!;
      toDelete.add(id);
      apiNodes.filter((n) => n.parentNodeId === id).forEach((n) => queue.push(n.id));
    }
    await mindMapApi.deleteNode(YEAR, nodeId).catch(() => {});
    setApiNodes((prev) => prev.filter((n) => !toDelete.has(n.id)));
    if (focusedId && toDelete.has(focusedId)) setFocusedId(null);
  }

  // ── Convert to goal ───────────────────────────────────────────────────────────
  async function handleConvertConfirm() {
    if (!convertModal || !convertGoalType) return;
    if (convertGoalType === "Repetitive" && !habitMvd.trim()) {
      setConvertError("Please enter a minimal viable dose.");
      return;
    }
    setConverting(true);
    setConvertError(null);
    try {
      const result = await mindMapApi.convertToGoal(YEAR, convertModal.nodeId, convertGoalType, convertLifeArea);
      if (convertGoalType === "Repetitive") {
        await habitApi.createHabit({
          goalId: result.id,
          year: YEAR,
          title: result.title,
          frequency: habitFrequency,
          minimumViableDose: habitMvd.trim(),
          trackingMethod: "Streak",
        });
      }
      setApiNodes((prev) =>
        prev.map((n) => (n.id === convertModal.nodeId ? { ...n, nodeType: "Goal" } : n))
      );
      setConvertModal(null);
      navigate(`/goals/${result.id}`);
    } catch {
      setConvertError("Failed to create goal. Please try again.");
      setConverting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#FAFAF8" }}>
        <span className="text-sm text-gray-400">Loading your map…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <span className="text-sm text-red-400">{error}</span>
        <button
          onClick={() => setLoadKey((k) => k + 1)}
          className="px-5 py-2 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const addParentId = focusedId ?? rootNodeId;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      style={{ background: "var(--bg-app)", touchAction: "none" }}
      onClick={() => setContextMenu(null)}
    >
      {/* View switcher */}
      <Box sx={{ position: "absolute", top: 12, left: isMobile ? 56 : 12, zIndex: 10 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v as ViewMode); }}
          size="small"
          sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}
        >
          {VIEW_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={{ px: isMobile ? 0.75 : 1.5, fontSize: "0.72rem", gap: isMobile ? 0 : 0.5, minWidth: isMobile ? 36 : undefined }}>
              {isMobile ? opt.icon : `${opt.icon} ${opt.label}`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Toolbar */}
      <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 12, right: 16, zIndex: 10 }}>
        {/* Deadline filter — hidden on mobile */}
        {!isMobile && (
          <Select
            size="small"
            value={deadlineFilter?.toString() ?? ""}
            onChange={(e) => setDeadlineFilter(e.target.value === "" ? null : Number(e.target.value))}
            displayEmpty
            sx={{ bgcolor: "background.paper", borderRadius: 2, fontSize: "0.78rem", minWidth: 130, height: 36 }}
          >
            <MenuItem value="">All deadlines</MenuItem>
            <MenuItem value="7">Due in 7 days</MenuItem>
            <MenuItem value="14">Due in 14 days</MenuItem>
            <MenuItem value="30">Due in 30 days</MenuItem>
          </Select>
        )}

        {/* Focus mode toggle */}
        <Button
          size="small"
          variant={focusMode ? "contained" : "outlined"}
          onClick={() => setFocusMode((v) => !v)}
          sx={{ borderRadius: 3, bgcolor: focusMode ? "primary.main" : "background.paper", minWidth: isMobile ? 36 : 100, px: isMobile ? 0.5 : undefined }}
        >
          {isMobile ? "🎯" : "🎯 Focus"}
        </Button>

        {focusedId && (
          <Button size="small" variant="outlined"
            startIcon={isMobile ? undefined : <ArrowBackIcon />}
            onClick={() => setFocusedId(focusedParentId)}
            sx={{ borderRadius: 3, bgcolor: "background.paper", minWidth: isMobile ? 36 : undefined, px: isMobile ? 0.5 : undefined }}>
            {isMobile ? <ArrowBackIcon fontSize="small" /> : "Back"}
          </Button>
        )}
        {addParentId && (
          <Button size="small" variant="contained"
            startIcon={isMobile ? undefined : <AddCircleOutlineIcon />}
            onClick={() => { setCreating({ parentId: addParentId }); setNewNodeLabel(""); }}
            sx={{ borderRadius: 3, minWidth: isMobile ? 36 : undefined, px: isMobile ? 0.5 : undefined }}>
            {isMobile ? <AddCircleOutlineIcon fontSize="small" /> : "Add node"}
          </Button>
        )}
      </Stack>

      {/* Hint */}
      {!focusedId && (
        <Typography variant="caption" color="text.disabled"
          sx={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
          {isMobile
            ? "Tap to zoom · Long-press for options"
            : viewMode === "sunburst"
              ? "Click a section to zoom in · Right-click for options"
              : "Click a node to zoom in · Right-click for options"}
        </Typography>
      )}

      {/* Focus mode legend */}
      {focusMode && (
        <Paper elevation={2} sx={{ position: "absolute", bottom: 40, left: 12, zIndex: 10, px: 2, py: 1.5, borderRadius: 2 }}>
          <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>Goal status</Typography>
          <Stack spacing={0.25}>
            {FOCUS_LEGEND.map(({ color, label }) => (
              <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                <Checkbox
                  size="small"
                  checked={visibleFocusColors.has(color)}
                  onChange={(e) => {
                    setVisibleFocusColors((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(color); else next.delete(color);
                      return next;
                    });
                  }}
                  sx={{ p: 0.25 }}
                />
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Views ─────────────────────────────────────────────────────────────── */}
      {!root && viewMode === "sunburst" && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <p className="text-4xl">🗺️</p>
          <p className="text-sm text-gray-400">Complete the Ikigai journey to populate your map</p>
        </div>
      )}

      {root && viewMode === "sunburst" && (
        <svg
          width="100%" height="100%"
          viewBox={`0 0 ${VB} ${VB}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={() => setContextMenu(null)}
          style={{ display: "block" }}
        >
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F0F9FF" />
              <stop offset="100%" stopColor="#FAFAF8" />
            </radialGradient>
          </defs>
          <circle cx={VB / 2} cy={VB / 2} r={RADIUS * 1.01} fill="url(#bgGrad)" />
          <g transform={`translate(${VB / 2},${VB / 2})`}>
            <SunburstSvg
              root={root}
              canGoUp={focusedId !== null}
              onZoomIn={setFocusedId}
              onZoomOut={() => setFocusedId(focusedParentId)}
              onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
              onRename={(id, label, x, y) => { setInlineEdit({ nodeId: id, label, x, y }); setInlineEditValue(label); }}
              onHover={handleHover}
              focusMode={focusMode}
              focusColorMap={focusColorMap}
            />
          </g>
        </svg>
      )}

      {viewMode === "radial-tree" && (
        focusFilteredNodes.some((n) => n.parentNodeId === null) ? (
          <RadialTreeView
            nodes={focusFilteredNodes}
            canGoUp={focusedId !== null}
            onZoomIn={setFocusedId}
            onZoomOut={() => setFocusedId(focusedParentId)}
            onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
            onRename={(id, label, x, y) => { setInlineEdit({ nodeId: id, label, x, y }); setInlineEditValue(label); }}
            onHover={handleHover}
            focusMode={focusMode}
            focusColorMap={focusColorMap}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <p className="text-4xl">🗺️</p>
            <p className="text-sm text-gray-400">Complete the Ikigai journey to populate your map</p>
          </div>
        )
      )}

      {viewMode === "tidy-tree" && (
        focusFilteredNodes.some((n) => n.parentNodeId === null) ? (
          <TidyTreeView
            nodes={focusFilteredNodes}
            canGoUp={focusedId !== null}
            onZoomIn={setFocusedId}
            onZoomOut={() => setFocusedId(focusedParentId)}
            onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
            onRename={(id, label, x, y) => { setInlineEdit({ nodeId: id, label, x, y }); setInlineEditValue(label); }}
            onHover={handleHover}
            focusMode={focusMode}
            focusColorMap={focusColorMap}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <p className="text-4xl">🗺️</p>
            <p className="text-sm text-gray-400">Complete the Ikigai journey to populate your map</p>
          </div>
        )
      )}

      {/* ── Context menu ──────────────────────────────────────────────────────── */}
      {contextMenu && (() => {
        const n = apiNodes.find((x) => x.id === contextMenu.nodeId);
        return (
          <Paper
            elevation={8}
            sx={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 1400, borderRadius: 2, minWidth: 180, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <List dense disablePadding>
              <ListItemButton onClick={() => { setContextMenu(null); setCreating({ parentId: contextMenu.nodeId }); setNewNodeLabel(""); }}>
                <ListItemText primary="+ Add child node" />
              </ListItemButton>
              <ListItemButton onClick={() => { if (n) openEditPanel(n.id); setContextMenu(null); }}>
                <ListItemText primary="✏️ Edit node" />
              </ListItemButton>
              {(n?.nodeType === "Leaf" || n?.nodeType === "Branch") && (
                <ListItemButton onClick={() => { setConvertModal({ nodeId: contextMenu.nodeId }); setConvertGoalType(null); setConvertLifeArea("CareerWork"); setHabitFrequency("Daily"); setHabitMvd(""); setConvertError(null); setContextMenu(null); }}>
                  <ListItemText primary="🎯 Convert to goal" />
                </ListItemButton>
              )}
              {n?.nodeType !== "Root" && (
                <>
                  <Divider />
                  <ListItemButton onClick={() => handleDeleteRequest(contextMenu.nodeId)} sx={{ color: "error.main" }}>
                    <ListItemText primary="Delete" primaryTypographyProps={{ color: "error" }} />
                  </ListItemButton>
                </>
              )}
            </List>
          </Paper>
        );
      })()}

      {/* ── Create node dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!creating} onClose={() => setCreating(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Add child node</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Label" value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateNode(); if (e.key === "Escape") setCreating(null); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreating(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateNode} disabled={!newNodeLabel.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Inline label edit overlay ─────────────────────────────────────── */}
      {inlineEdit && (
        <input
          autoFocus
          value={inlineEditValue}
          onChange={(e) => setInlineEditValue(e.target.value)}
          onBlur={handleInlineEditSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.currentTarget.blur(); }
            if (e.key === "Escape") { setInlineEdit(null); }
          }}
          style={{
            position: "fixed",
            left: inlineEdit.x,
            top: inlineEdit.y - 16,
            zIndex: 2100,
            border: "2px solid #0D6E6E",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            background: "white",
            outline: "none",
            minWidth: 150,
            boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
          }}
        />
      )}

      {/* ── Unified edit node panel ──────────────────────────────────────────── */}
      {editPanel && (
        <Paper
          elevation={4}
          sx={isMobile
            ? { position: "fixed", left: 0, right: 0, bottom: 0, maxHeight: "75vh", zIndex: 1200, display: "flex", flexDirection: "column", borderTopLeftRadius: 12, borderTopRightRadius: 12 }
            : { position: "absolute", right: 0, top: 0, bottom: 0, width: 320, zIndex: 900, display: "flex", flexDirection: "column", borderRadius: 0 }
          }
          onClick={(e) => e.stopPropagation()}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight={600}>Edit node</Typography>
            <IconButton size="small" onClick={() => setEditPanel(null)}>✕</IconButton>
          </Stack>
          <Stack spacing={2.5} sx={{ p: 2.5, flex: 1, overflowY: "auto" }}>
            <TextField
              size="small" label="Label" fullWidth
              value={editPanel.label}
              onChange={(e) => setEditPanel({ ...editPanel, label: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") handleEditPanelSave(); }}
            />
            <TextField
              size="small" label="Icon" placeholder="e.g. 🎯 or 📚"
              value={editPanel.icon}
              onChange={(e) => setEditPanel({ ...editPanel, icon: e.target.value })}
              helperText="Paste any emoji"
              inputProps={{ maxLength: 10 }}
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>Ikigai category</InputLabel>
              <Select
                label="Ikigai category"
                value={editPanel.ikigaiCategory}
                onChange={(e) => setEditPanel({ ...editPanel, ikigaiCategory: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {Object.entries(IKIGAI_CATEGORY_CONFIG).map(([key, cfg]) => (
                  <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small" label="Notes" multiline rows={4} fullWidth
              placeholder="Add notes about this node…"
              value={editPanel.notes}
              onChange={(e) => setEditPanel({ ...editPanel, notes: e.target.value })}
            />
            {(editPanel.nodeType === "Branch" || editPanel.nodeType === "Leaf") && (
              <FormControl fullWidth size="small">
                <InputLabel>Life area</InputLabel>
                <Select
                  label="Life area"
                  value={editPanel.lifeArea}
                  onChange={(e) => setEditPanel({ ...editPanel, lifeArea: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {LIFE_AREA_NAMES.map((name, i) => (
                    <MenuItem key={LIFE_AREA_KEYS[i]} value={LIFE_AREA_KEYS[i]}>{name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Stack sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }} spacing={1}>
            <Button variant="contained" fullWidth onClick={handleEditPanelSave} disabled={!editPanel.label.trim()} sx={{ borderRadius: 3 }}>Save</Button>
            {editPanel.nodeType !== "Root" && (
              <Button variant="outlined" color="error" fullWidth onClick={() => handleDeleteRequest(editPanel.nodeId)} sx={{ borderRadius: 3 }}>
                Delete node
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {/* ── Convert to goal dialog ───────────────────────────────────────────── */}
      <Dialog open={!!convertModal} onClose={() => setConvertModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Convert to goal</DialogTitle>
        <DialogContent>
          {!convertGoalType ? (
            <Stack spacing={1.5} mt={1}>
              <Paper variant="outlined" sx={{ p: 2, cursor: "pointer", borderRadius: 2, "&:hover": { borderColor: "primary.main" } }}
                onClick={() => setConvertGoalType("Project")}>
                <Typography fontWeight={600} fontSize={14}>🎯 Project goal</Typography>
                <Typography variant="caption" color="text.secondary">One-time achievement</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, cursor: "pointer", borderRadius: 2, "&:hover": { borderColor: "warning.main" } }}
                onClick={() => setConvertGoalType("Repetitive")}>
                <Typography fontWeight={600} fontSize={14}>🔁 Habit goal</Typography>
                <Typography variant="caption" color="text.secondary">Recurring practice</Typography>
              </Paper>
            </Stack>
          ) : (
            <Stack spacing={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel>Life area</InputLabel>
                <Select label="Life area" value={convertLifeArea} onChange={(e) => setConvertLifeArea(e.target.value)}>
                  {LIFE_AREA_NAMES.map((name, i) => (
                    <MenuItem key={LIFE_AREA_KEYS[i]} value={LIFE_AREA_KEYS[i]}>{name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {convertGoalType === "Repetitive" && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select label="Frequency" value={habitFrequency} onChange={(e) => setHabitFrequency(e.target.value)}>
                      <MenuItem value="Daily">Daily</MenuItem>
                      <MenuItem value="Weekly">Weekly</MenuItem>
                      <MenuItem value="Monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth size="small"
                    label="Minimal viable dose"
                    placeholder="e.g. 10 push-ups, 20 min read"
                    value={habitMvd}
                    onChange={(e) => setHabitMvd(e.target.value)}
                    helperText="The smallest version of this habit that counts"
                    required
                  />
                </>
              )}
              {convertError && <Alert severity="error">{convertError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConvertModal(null)}>Cancel</Button>
          {convertGoalType && (
            <Button variant="contained" onClick={handleConvertConfirm} disabled={converting}>
              {converting ? "Converting…" : "Create goal →"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Hover tooltip ────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 14,
            top: tooltip.y - 32,
            background: "rgba(26, 26, 46, 0.93)",
            color: "#fff",
            borderRadius: 8,
            padding: "5px 11px",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            pointerEvents: "none",
            zIndex: 2000,
            maxWidth: 240,
            boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tooltip.label}
        </div>
      )}

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete node?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This node has children. They will all be deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && doDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
