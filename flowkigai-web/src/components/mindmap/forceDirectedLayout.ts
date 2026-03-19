// Force-directed layout engine for the MindMap.
// d3-force is bundled inside the 'd3' package (already installed) — no extra dependency needed.
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3";
import type { MindMapNodeDto } from "@/api/mindMapApi";

// Collision radius in viewBox units: half of (node visual width + 20px gap)
// Two nodes must be at least (2 * COLLISION_RADIUS) units apart after layout.
export const FD_COLLISION_RADIUS = 60;

interface SimNode extends SimulationNodeDatum {
  id: string;
  fx?: number | null;
  fy?: number | null;
}

type SimLink = SimulationLinkDatum<SimNode>;

/**
 * Run a force-directed layout simulation on the given flat node list.
 *
 * Behaviour:
 * - Root node (parentNodeId === null) is fixed at (0, 0) — the canvas centre
 *   in the translated SVG group used by ForceDirectedView.
 * - Non-root nodes start from their stored positionX/Y.
 *   If all non-root nodes are at the origin (e.g. a freshly seeded map),
 *   they are spread in a deterministic phyllotaxis pattern to avoid collapse.
 * - Forces: link (proportional strength) + charge (-300) + centre (0.05) + collision
 * - Simulation runs synchronously to alpha < 0.01, then stops.
 * - Returns Map<id, {x, y}> with final stable positions.
 * - Does NOT mutate the input nodes array.
 */
export function runForceLayout(
  nodes: MindMapNodeDto[],
  collisionRadius: number = FD_COLLISION_RADIUS,
): Map<string, { x: number; y: number }> {
  if (!nodes.length) return new Map();

  const nonRoot = nodes.filter((n) => n.parentNodeId !== null);
  const allAtOrigin = nonRoot.every((n) => n.positionX === 0 && n.positionY === 0);

  // Build simulation nodes — copy positions, do not mutate originals
  const simNodes: SimNode[] = nodes.map((n, i) => {
    const isRoot = n.parentNodeId === null;

    let x: number;
    let y: number;
    if (isRoot) {
      x = 0;
      y = 0;
    } else if (allAtOrigin) {
      // Phyllotaxis: deterministic spiral spread so nodes don't all start colocated
      const r = Math.sqrt(i + 1) * 80;
      const angle = i * Math.PI * (3 - Math.sqrt(5)); // golden angle ≈ 137.5°
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
    } else {
      x = n.positionX ?? 0;
      y = n.positionY ?? 0;
    }

    return {
      id: n.id,
      x,
      y,
      fx: isRoot ? 0 : null,
      fy: isRoot ? 0 : null,
    };
  });

  const links: SimLink[] = nodes
    .filter((n) => n.parentNodeId !== null)
    .map((n) => ({ source: n.parentNodeId!, target: n.id }));

  // Count connections per node for proportional link strength
  const connections = new Map<string, number>();
  for (const l of links) {
    const s = l.source as string;
    const t = l.target as string;
    connections.set(s, (connections.get(s) ?? 0) + 1);
    connections.set(t, (connections.get(t) ?? 0) + 1);
  }

  const linkForce = forceLink<SimNode, SimLink>(links)
    .id((d) => d.id)
    .strength((link) => {
      const sId = typeof link.source === "string" ? link.source : (link.source as SimNode).id;
      const tId = typeof link.target === "string" ? link.target : (link.target as SimNode).id;
      const maxConn = Math.max(connections.get(sId) ?? 1, connections.get(tId) ?? 1, 1);
      // More connections → stronger pull, capped at 0.9
      return Math.min(0.9, 0.3 + maxConn * 0.06);
    });

  const simulation = forceSimulation<SimNode>(simNodes)
    .force("link", linkForce)
    .force("charge", forceManyBody<SimNode>().strength(-300))
    .force("center", forceCenter(0, 0).strength(0.05))
    .force("collision", forceCollide<SimNode>(collisionRadius))
    .alphaMin(0.01)
    .stop();

  // Compute exact tick count needed to reach alphaMin, then run synchronously
  const tickCount = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()),
  );
  simulation.tick(tickCount);

  const result = new Map<string, { x: number; y: number }>();
  for (const node of simNodes) {
    result.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }

  return result;
}
