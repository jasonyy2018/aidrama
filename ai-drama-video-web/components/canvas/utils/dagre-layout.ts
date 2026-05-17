import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;

export function layoutPipeline(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 150, marginx: 50, marginy: 50 });

  for (const node of nodes) {
    g.setNode(node.id, {
      width: (node.data as Record<string, unknown>)?.initialWidth as number ?? NODE_WIDTH,
      height: (node.data as Record<string, unknown>)?.initialHeight as number ?? NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x - (pos.width ?? NODE_WIDTH) / 2, y: pos.y - (pos.height ?? NODE_HEIGHT) / 2 },
    };
  });
}
