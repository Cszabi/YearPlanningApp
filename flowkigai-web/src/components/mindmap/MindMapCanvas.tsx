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
  ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { mindMapApi, type MindMapNodeDto } from "@/api/mindMapApi";
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
  onRename: (nodeId: string, label: string) => void;
  onHover: (label: string | null, x: number, y: number) => void;
}

function SunburstSvg({ root, canGoUp, onZoomIn, onZoomOut, onContextMenu, onRename, onHover }: SunburstSvgProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
        const rawLabel = isGoal ? "🎯 " + d.data.label : d.data.label;
        const { lines, fs: lineFs } = wrapLabel(rawLabel, arcLen, ringW, fs);
        const lineH = lineFs * 1.25;
        return (
          <g key={d.data.id}>
            <path
              d={path}
              fill={isHovered ? blendWithWhite(color.startsWith("rgb") ? "#888" : color, 0.7) : color}
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
                onRename(d.data.id, d.data.label);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(d.data.id, e.clientX, e.clientY);
              }}
              onMouseEnter={(e) => { setHoveredId(d.data.id); onHover(d.data.label, e.clientX, e.clientY); }}
              onMouseMove={(e) => onHover(d.data.label, e.clientX, e.clientY)}
              onMouseLeave={() => { setHoveredId(null); onHover(null, 0, 0); }}
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

  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [creating, setCreating] = useState<{ parentId: string } | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [renameModal, setRenameModal] = useState<{ nodeId: string; label: string } | null>(null);
  const [renameLabel, setRenameLabel] = useState("");
  const [notesPanel, setNotesPanel] = useState<{ nodeId: string; notes: string } | null>(null);
  const [convertModal, setConvertModal] = useState<{ nodeId: string } | null>(null);
  const [convertGoalType, setConvertGoalType] = useState<string | null>(null);
  const [convertLifeArea, setConvertLifeArea] = useState("CareerWork");
  const [converting, setConverting] = useState(false);
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

  const root = useMemo(() => buildPartition(displayNodes), [displayNodes]);

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

  // ── Rename ────────────────────────────────────────────────────────────────────
  async function handleRenameSave() {
    if (!renameModal || !renameLabel.trim()) return;
    await mindMapApi.updateNode(YEAR, renameModal.nodeId, { label: renameLabel.trim() }).catch(() => {});
    setApiNodes((prev) =>
      prev.map((n) => (n.id === renameModal.nodeId ? { ...n, label: renameLabel.trim() } : n))
    );
    setRenameModal(null);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────────
  async function handleNotesSave() {
    if (!notesPanel) return;
    await mindMapApi.updateNode(YEAR, notesPanel.nodeId, { notes: notesPanel.notes }).catch(() => {});
    setApiNodes((prev) =>
      prev.map((n) => (n.id === notesPanel.nodeId ? { ...n, notes: notesPanel.notes } : n))
    );
    setNotesPanel(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  function handleDeleteRequest(nodeId: string) {
    setContextMenu(null);
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
    setConverting(true);
    try {
      await mindMapApi.convertToGoal(YEAR, convertModal.nodeId, convertGoalType, convertLifeArea);
      setApiNodes((prev) =>
        prev.map((n) => (n.id === convertModal.nodeId ? { ...n, nodeType: "Goal" } : n))
      );
      setConvertModal(null);
      navigate("/goals");
    } catch {
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
      style={{ background: "var(--bg-app)" }}
      onClick={() => setContextMenu(null)}
    >
      {/* View switcher */}
      <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v as ViewMode); }}
          size="small"
          sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}
        >
          {VIEW_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.5, fontSize: "0.72rem", gap: 0.5 }}>
              {opt.icon} {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Toolbar */}
      <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 12, right: 16, zIndex: 10 }}>
        {focusedId && (
          <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => setFocusedId(focusedParentId)} sx={{ borderRadius: 3, bgcolor: "background.paper" }}>
            Back
          </Button>
        )}
        {addParentId && (
          <Button size="small" variant="contained" startIcon={<AddCircleOutlineIcon />}
            onClick={() => { setCreating({ parentId: addParentId }); setNewNodeLabel(""); }} sx={{ borderRadius: 3 }}>
            Add node
          </Button>
        )}
      </Stack>

      {/* Hint */}
      {!focusedId && (
        <Typography variant="caption" color="text.disabled"
          sx={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
          {viewMode === "sunburst"
            ? "Click a section to zoom in · Right-click for options"
            : "Click a node to zoom in · Right-click for options"}
        </Typography>
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
              onRename={(id, label) => { setRenameModal({ nodeId: id, label }); setRenameLabel(label); }}
              onHover={handleHover}
            />
          </g>
        </svg>
      )}

      {viewMode === "radial-tree" && (
        displayNodes.some((n) => n.parentNodeId === null) ? (
          <RadialTreeView
            nodes={displayNodes}
            canGoUp={focusedId !== null}
            onZoomIn={setFocusedId}
            onZoomOut={() => setFocusedId(focusedParentId)}
            onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
            onRename={(id, label) => { setRenameModal({ nodeId: id, label }); setRenameLabel(label); }}
            onHover={handleHover}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <p className="text-4xl">🗺️</p>
            <p className="text-sm text-gray-400">Complete the Ikigai journey to populate your map</p>
          </div>
        )
      )}

      {viewMode === "tidy-tree" && (
        displayNodes.some((n) => n.parentNodeId === null) ? (
          <TidyTreeView
            nodes={displayNodes}
            canGoUp={focusedId !== null}
            onZoomIn={setFocusedId}
            onZoomOut={() => setFocusedId(focusedParentId)}
            onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
            onRename={(id, label) => { setRenameModal({ nodeId: id, label }); setRenameLabel(label); }}
            onHover={handleHover}
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
              <ListItemButton onClick={() => { if (n) { setRenameModal({ nodeId: n.id, label: n.label }); setRenameLabel(n.label); } setContextMenu(null); }}>
                <ListItemText primary="Rename" />
              </ListItemButton>
              <ListItemButton onClick={() => { if (n) setNotesPanel({ nodeId: n.id, notes: n.notes ?? "" }); setContextMenu(null); }}>
                <ListItemText primary="Edit notes" />
              </ListItemButton>
              {(n?.nodeType === "Leaf" || n?.nodeType === "Branch") && (
                <ListItemButton onClick={() => { setConvertModal({ nodeId: contextMenu.nodeId }); setConvertGoalType(null); setConvertLifeArea("CareerWork"); setContextMenu(null); }}>
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

      {/* ── Rename dialog ───────────────────────────────────────────────────── */}
      <Dialog open={!!renameModal} onClose={() => setRenameModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Label" value={renameLabel}
            onChange={(e) => setRenameLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") setRenameModal(null); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameModal(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRenameSave} disabled={!renameLabel.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Notes side panel ─────────────────────────────────────────────────── */}
      {notesPanel && (
        <Paper
          elevation={4}
          sx={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 320, zIndex: 900, display: "flex", flexDirection: "column", borderRadius: 0 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight={600}>Notes</Typography>
            <IconButton size="small" onClick={() => setNotesPanel(null)}>✕</IconButton>
          </Stack>
          <TextField
            multiline fullWidth placeholder="Add notes about this node…"
            value={notesPanel.notes}
            onChange={(e) => setNotesPanel({ ...notesPanel, notes: e.target.value })}
            variant="standard" InputProps={{ disableUnderline: true }}
            sx={{ flex: 1, "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start", p: 2.5 } }}
          />
          <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Button variant="contained" fullWidth onClick={handleNotesSave} sx={{ borderRadius: 3 }}>Save notes</Button>
          </Box>
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
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Life area</InputLabel>
              <Select label="Life area" value={convertLifeArea} onChange={(e) => setConvertLifeArea(e.target.value)}>
                {LIFE_AREA_NAMES.map((name, i) => (
                  <MenuItem key={LIFE_AREA_KEYS[i]} value={LIFE_AREA_KEYS[i]}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
