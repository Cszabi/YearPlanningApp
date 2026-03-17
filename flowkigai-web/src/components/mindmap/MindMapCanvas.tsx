import { useEffect, useMemo, useRef, useState } from "react";

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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { mindMapApi, type MindMapNodeDto } from "@/api/mindMapApi";
import { LIFE_AREA_COLORS, LIFE_AREA_NAMES } from "./nodes";

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

function buildPartition(nodes: MindMapNodeDto[]): HNode | null {
  if (!nodes.length) return null;
  try {
    const root = d3
      .stratify<MindMapNodeDto>()
      .id((d) => d.id)
      .parentId((d) => d.parentNodeId)(nodes);
    root.sum(() => 1).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    d3.partition<MindMapNodeDto>().size([2 * Math.PI, root.height + 1])(root);
    return root as unknown as HNode;
  } catch {
    return null;
  }
}

// ── Label word-wrap helper ────────────────────────────────────────────────────
// Splits a label into up to 2 lines that fit within `arcLen` viewBox units,
// then scales the font down if the 2 lines still overflow the ring height.
function wrapLabel(label: string, arcLen: number, ringW: number, baseFontSize: number): { lines: string[]; fs: number } {
  const charW = baseFontSize * 0.56;
  const maxChars = Math.max(5, Math.floor(arcLen / charW));

  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + "…" : word;
    }
  }
  if (current) lines.push(current);

  // Cap at 2 lines; truncate the second if needed
  if (lines.length > 2) {
    lines.length = 2;
    if (lines[1].length > maxChars - 1) lines[1] = lines[1].slice(0, maxChars - 2) + "…";
  }

  // Scale font down if total line height exceeds available ring depth
  const lineH = baseFontSize * 1.25;
  const totalH = lines.length * lineH;
  const availH = ringW * 0.78;
  const fs = totalH > availH && lines.length > 1 ? Math.max(14, baseFontSize * (availH / totalH)) : baseFontSize;

  return { lines, fs };
}

// ── Sunburst SVG (pure rendering) ─────────────────────────────────────────────

interface SunburstSvgProps {
  root: HNode;
  canGoUp: boolean;
  onZoomIn: (nodeId: string) => void;
  onZoomOut: () => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onRename: (nodeId: string, label: string) => void;
}

function SunburstSvg({ root, canGoUp, onZoomIn, onZoomOut, onContextMenu, onRename }: SunburstSvgProps) {
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
                if (d.children) onZoomIn(d.data.id);
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
              onMouseEnter={() => setHoveredId(d.data.id)}
              onMouseLeave={() => setHoveredId(null)}
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
          Click a section to zoom in · Right-click for options
        </Typography>
      )}

      {/* Sunburst — viewBox keeps circle fully visible at any screen size */}
      {root ? (
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
          {/* Soft halo */}
          <circle cx={VB / 2} cy={VB / 2} r={RADIUS * 1.01} fill="url(#bgGrad)" />
          <g transform={`translate(${VB / 2},${VB / 2})`}>
            <SunburstSvg
              root={root}
              canGoUp={focusedId !== null}
              onZoomIn={setFocusedId}
              onZoomOut={() => setFocusedId(focusedParentId)}
              onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
              onRename={(id, label) => { setRenameModal({ nodeId: id, label }); setRenameLabel(label); }}
            />
          </g>
        </svg>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <p className="text-4xl">🗺️</p>
          <p className="text-sm text-gray-400">Complete the Ikigai journey to populate your map</p>
        </div>
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
