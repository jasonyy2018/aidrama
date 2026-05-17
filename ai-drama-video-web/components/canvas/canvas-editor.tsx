"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles, Film, TreePine, Bot } from "lucide-react";
import CanvasAgentChat from "./canvas-agent-chat";
import ImageEditCanvas from "./image-edit-canvas";
import WorkbenchDialog from "./workbench-dialog";
import type { AgentTagEvent } from "./utils/parse-agent-tags";
import ShotCardNode from "./nodes/shot-card-node";
import type { ShotCardNodeData } from "./nodes/shot-card-node";
import CharacterAnchorNode from "./nodes/character-anchor-node";
import type { CharacterAnchorNodeData } from "./nodes/character-anchor-node";
import ScriptNode from "./nodes/script-node";
import ScriptPlanNode from "./nodes/script-plan-node";
import StoryboardTableNode from "./nodes/storyboard-table-node";
import StoryboardGridNode from "./nodes/storyboard-grid-node";
import WorkbenchNode from "./nodes/workbench-node";
import AssetsListNode from "./nodes/assets-list-node";
import type { ShapeBindings, CanvasSnapshotData } from "@/types/canvas";
import type { StoryboardItem } from "@/lib/db/schema";
import {
  PIPELINE_NODE_IDS, PIPELINE_EDGES,
  type ScriptNodeData, type AssetsNodeData, type ScriptPlanNodeData,
  type StoryboardTableNodeData, type StoryboardNodeData, type WorkbenchNodeData,
  type AssetItem as PipelineAssetItem,
} from "@/types/pipeline";
import { usePipelineStore } from "@/lib/store/pipeline-store";
import dynamic from "next/dynamic";
import { layoutPipeline } from "./utils/dagre-layout";
import { storyboardApi, type StoryboardEpisode } from "@/lib/api/storyboard";

const ShotPropertiesPanel = dynamic(() => import("./shot-properties-panel"), { ssr: false });
const AssetPropertiesPanel = dynamic(() => import("./asset-properties-panel"), { ssr: false });

type FlowNode = Node;

const nodeTypes: NodeTypes = {
  "shot-card": ShotCardNode,
  "character-anchor": CharacterAnchorNode,
  "script": ScriptNode,
  "scriptPlan": ScriptPlanNode,
  "storyboardTable": StoryboardTableNode,
  "storyboard": StoryboardGridNode,
  "workbench": WorkbenchNode,
  "assets": AssetsListNode,
};

let nodeIdCounter = 0;
function createNodeId(prefix = "n"): string {
  return `${prefix}_${Date.now()}_${++nodeIdCounter}`;
}

interface AssetItem {
  id: number;
  type: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
}

interface CanvasEditorProps {
  projectId: number;
  storyboardId?: number | null;
  initialSnapshot: CanvasSnapshotData | null;
  storyboardItems?: StoryboardItem[];
  onSaved?: () => void;
}

const PIPELINE_NODE_DEFS: { id: string; type: string; x: number; y: number }[] = [
  { id: PIPELINE_NODE_IDS.script, type: "script", x: -600, y: -100 },
  { id: PIPELINE_NODE_IDS.assets, type: "assets", x: -200, y: -280 },
  { id: PIPELINE_NODE_IDS.scriptPlan, type: "scriptPlan", x: -200, y: 80 },
  { id: PIPELINE_NODE_IDS.storyboardTable, type: "storyboardTable", x: 200, y: -100 },
  { id: PIPELINE_NODE_IDS.storyboard, type: "storyboard", x: 650, y: -100 },
  { id: PIPELINE_NODE_IDS.workbench, type: "workbench", x: 1100, y: -100 },
];

function createPipelineNode(nodeId: string, type: string, x: number, y: number): Node {
  const data: Record<string, unknown> = { initialWidth: 300, initialHeight: 200 };
  return { id: nodeId, type, position: { x, y }, data };
}

function getDefaultDataForNode(nodeId: string, storyboardItems: StoryboardItem[]): Record<string, unknown> {
  if (nodeId === PIPELINE_NODE_IDS.script) {
    return { scriptId: null, title: "", content: "", episodeCount: 0, initialWidth: 320, initialHeight: 280 };
  }
  if (nodeId === PIPELINE_NODE_IDS.assets) {
    return { assets: [], loading: true, initialWidth: 300, initialHeight: 300 };
  }
  if (nodeId === PIPELINE_NODE_IDS.scriptPlan) {
    return { content: "", loading: true, initialWidth: 280, initialHeight: 260 };
  }
  if (nodeId === PIPELINE_NODE_IDS.storyboardTable) {
    return { storyboardId: null, shotCount: 0, tableMarkdown: "", loading: true, initialWidth: 360, initialHeight: 320 };
  }
  if (nodeId === PIPELINE_NODE_IDS.storyboard) {
    return { storyboardId: null, items: [], loading: true, initialWidth: 380, initialHeight: 340 };
  }
  if (nodeId === PIPELINE_NODE_IDS.workbench) {
    return { episodes: [], loading: true, initialWidth: 280, initialHeight: 300 };
  }
  return { initialWidth: 300, initialHeight: 200 };
}

function itemToData(item: StoryboardItem): ShotCardNodeData {
  return {
    storyboardItemId: item.id,
    shotNumber: item.shotNumber ?? item.autoShotNumber ?? String(item.sortOrder ?? ""),
    content: item.content ?? "",
    sceneExpectation: item.sceneExpectation ?? "",
    generatedImageUrl: item.generatedImageUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    generatedVideoUrl: item.generatedVideoUrl ?? null,
    shotType: item.shotType ?? "中景",
    duration: item.duration ?? "3",
    dialogue: item.dialogue ?? "",
    cameraMovement: item.cameraMovement ?? "",
    generationStatus: item.generatedVideoUrl ? "done"
      : item.generatedImageUrl ? "done"
      : "idle",
    episodeTitle: "",
    sceneHeading: "",
  };
}

function useAutoSave(
  nodes: FlowNode[],
  edges: Edge[],
  projectId: number,
  onSaved?: () => void
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await fetch(`/api/canvas/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: { nodes, edges } }),
      });
      onSaved?.();
    } catch (err) {
      console.error("[canvas] save failed", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [nodes, edges, projectId, onSaved]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save]);

  return { save, scheduleAutoSave };
}

function InnerFlow({
  projectId,
  storyboardId,
  storyboardItems = [],
  initialNodes,
  initialEdges,
  onNodesUpdate,
  onEdgesUpdate,
  onSelectionChange,
  onNodeClick,
  onReady,
}: {
  projectId: number;
  storyboardId?: number | null;
  storyboardItems?: StoryboardItem[];
  initialNodes: FlowNode[];
  initialEdges: Edge[];
  onNodesUpdate: (nodes: FlowNode[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
  onSelectionChange: (node: FlowNode | null) => void;
  onNodeClick?: (event: React.MouseEvent, node: FlowNode) => void;
  onReady: (instance: ReturnType<typeof useReactFlow>) => void;
}) {
  const reactFlow = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { scheduleAutoSave } = useAutoSave(nodes, edges, projectId);
  const pipelineInitRef = useRef(false);

  useEffect(() => { onReady(reactFlow); }, []);
  useEffect(() => { onNodesUpdate(nodes); }, [nodes]);
  useEffect(() => { onEdgesUpdate(edges); }, [edges]);

  // Ensure pipeline nodes exist
  useEffect(() => {
    if (pipelineInitRef.current) return;
    pipelineInitRef.current = true;
    setNodes(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const pipelineNodes: Node[] = [];
      for (const def of PIPELINE_NODE_DEFS) {
        if (!existingIds.has(def.id)) {
          pipelineNodes.push(createPipelineNode(def.id, def.type, def.x, def.y));
        }
      }
      if (pipelineNodes.length === 0) return prev;
      return [...prev, ...pipelineNodes];
    });
    setEdges(prev => {
      const existingEdgeKeys = new Set(prev.map(e => `${e.source}->${e.target}`));
      const newEdges: Edge[] = [];
      for (const pe of PIPELINE_EDGES) {
        if (!existingEdgeKeys.has(`${pe.source}->${pe.target}`)) {
          newEdges.push({
            ...pe,
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
            type: "workflow",
          });
        }
      }
      if (newEdges.length === 0) return prev;
      return [...prev, ...newEdges];
    });
  }, [setNodes, setEdges]);

  // Load data for pipeline nodes
  useEffect(() => {
    if (!storyboardId) return;

    const loadStoryboardData = async () => {
      try {
        const res = await fetch(`/api/storyboards/${storyboardId}/items`);
        const json = await res.json() as { code: number; data: StoryboardItem[] };
        if (json.code !== 200) return;
        const items = json.data ?? [];

        // Build markdown table
        const header = "| # | 景别 | 内容 | 时长 |\n|---|---|---|---|\n";
        const rows = items.map((s, i) =>
          `| ${s.shotNumber ?? i + 1} | ${s.shotType ?? "—"} | ${(s.content ?? "").slice(0, 40)} | ${s.duration ?? "—"}s |`
        ).join("\n");

        // Build grid items
        const gridItems = items.map((s, idx) => ({
          id: s.id,
          shotNumber: s.shotNumber ?? s.autoShotNumber ?? String(s.sortOrder ?? idx),
          content: s.content ?? "",
          imageUrl: s.imageUrl ?? null,
          generatedImageUrl: s.generatedImageUrl ?? null,
          videoUrl: s.videoUrl ?? null,
          generatedVideoUrl: s.generatedVideoUrl ?? null,
          shotType: s.shotType ?? "",
          duration: s.duration ?? "",
          generationStatus: s.generatedVideoUrl ? "done" : s.generatedImageUrl ? "done" : "idle",
        }));

        setNodes(prev => prev.map(n => {
          if (n.id === PIPELINE_NODE_IDS.storyboardTable) {
            return {
              ...n,
              data: {
                ...n.data,
                storyboardId: Number(storyboardId),
                shotCount: items.length,
                tableMarkdown: header + rows,
                loading: false,
              },
            };
          }
          if (n.id === PIPELINE_NODE_IDS.storyboard) {
            return {
              ...n,
              data: { ...n.data, storyboardId: Number(storyboardId), items: gridItems, loading: false },
            };
          }
          return n;
        }));
      } catch (err) {
        console.error("[canvas] load storyboard data failed", err);
      }
    };

    loadStoryboardData();
  }, [storyboardId, setNodes]);

  // Load assets for pipeline
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/assets?type=character,scene,prop`);
        const json = await res.json() as { code: number; data: AssetItem[] };
        if (json.code !== 200) return;
        const items = json.data ?? [];
        setNodes(prev => prev.map(n => {
          if (n.id === PIPELINE_NODE_IDS.assets) {
            return {
              ...n,
              data: {
                ...n.data,
                assets: items.map(a => ({ id: a.id, name: a.name, coverUrl: a.coverUrl, description: a.description ?? "", type: a.type })),
                loading: false,
              },
            };
          }
          return n;
        }));
      } catch (err) {
        console.error("[canvas] load assets failed", err);
      }
    };
    loadAssets();
  }, [projectId, setNodes]);

  // Load workbench episodes
  useEffect(() => {
    if (!storyboardId) return;
    const loadWorkbench = async () => {
      try {
        const episodes = await storyboardApi.listEpisodes(storyboardId);
        setNodes(prev => prev.map(n => {
          if (n.id === PIPELINE_NODE_IDS.workbench) {
            return {
              ...n,
              data: {
                ...n.data,
                episodes: episodes.map(ep => ({
                  id: ep.id,
                  episodeNumber: ep.episodeNumber ?? 0,
                  title: ep.title ?? "",
                  composedVideoUrl: ep.composedVideoUrl,
                  composeStatus: ep.composeStatus === 0 ? "idle" : ep.composeStatus === 1 ? "processing" : ep.composeStatus === 2 ? "done" : "error",
                })),
                loading: false,
              },
            };
          }
          return n;
        }));
      } catch (err) {
        console.error("[canvas] load workbench failed", err);
        setNodes(prev => prev.map(n =>
          n.id === PIPELINE_NODE_IDS.workbench ? { ...n, data: { ...n.data, loading: false } } : n
        ));
      }
    };
    loadWorkbench();
  }, [storyboardId, setNodes]);

  // Sync storyboard items with shot-card nodes
  useEffect(() => {
    if (storyboardItems.length === 0) return;
    setNodes(prev => prev.map(n => {
      if (n.type !== "shot-card") return n;
      const item = storyboardItems.find(i => i.id === (n.data as ShotCardNodeData).storyboardItemId);
      if (!item) return n;
      return { ...n, data: itemToData(item) };
    }));
  }, [storyboardItems]);

  const onConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({
      ...conn,
      type: "workflow",
      animated: true,
      style: { stroke: "#8b5cf6", strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  useEffect(() => { scheduleAutoSave(); }, [nodes, edges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={(params: OnSelectionChangeParams) => {
        const selected = params.nodes;
        if (selected.length === 1) {
          onSelectionChange(selected[0] as FlowNode);
        } else {
          onSelectionChange(null);
        }
      }}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={{
        type: "workflow",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      }}
      fitView
      colorMode="dark"
      panOnDrag={[1, 2]}
      selectionOnDrag
      panOnScroll
    >
      <Background color="rgba(255,255,255,0.04)" />
      <Controls
        style={{
          background: "rgba(20,20,28,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
        }}
      />
      <MiniMap
        style={{
          background: "rgba(20,20,28,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
        }}
        nodeColor={(n) => {
          if (n.type === "shot-card") return "#8b5cf6";
          if (n.type === "character-anchor") return "#34d399";
          if (n.type === "script") return "#6366f1";
          if (n.type === "scriptPlan") return "#fbbf24";
          if (n.type === "storyboardTable" || n.type === "assets") return "#34d399";
          if (n.type === "storyboard") return "#8b5cf6";
          if (n.type === "workbench") return "#f472b6";
          return "#52525b";
        }}
        maskColor="rgba(0,0,0,0.6)"
      />
    </ReactFlow>
  );
}

export default function CanvasEditor({
  projectId,
  storyboardId,
  initialSnapshot,
  storyboardItems = [],
  onSaved,
}: CanvasEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [conversationId] = useState(() => `canvas_${projectId}_${Date.now()}`);
  const [editingShotImage, setEditingShotImage] = useState<{ storyboardItemId: number | null; imageUrl: string | null } | null>(null);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);

  const reactFlowRef = useRef<ReturnType<typeof useReactFlow> | null>(null);
  const nodesRef = useRef<FlowNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  const { addPipeline, setNotificationOpen: setPipeNotify, setPanelExpanded: setPipeExpand } = usePipelineStore();

  const snapshotData = initialSnapshot?.snapshot as { nodes?: FlowNode[]; edges?: Edge[] } | null;
  const initialNodes: FlowNode[] = snapshotData?.nodes ?? [];
  const initialEdges: Edge[] = snapshotData?.edges ?? [];

  // Build shapeBindings from nodes
  const shapeBindingsRef = useRef<ShapeBindings>({});
  useEffect(() => {
    const bindings: ShapeBindings = {};
    for (const n of nodesRef.current) {
      if (n.type === "shot-card" && (n.data as ShotCardNodeData).storyboardItemId) {
        bindings[n.id] = { type: "storyboard_item", entityId: (n.data as ShotCardNodeData).storyboardItemId! };
      }
      if (n.type === "character-anchor" && (n.data as CharacterAnchorNodeData).assetId) {
        bindings[n.id] = { type: "asset", entityId: (n.data as CharacterAnchorNodeData).assetId! };
      }
    }
    shapeBindingsRef.current = bindings;
  }, [nodesRef.current]);

  const handleSelectionChange = useCallback((node: FlowNode | null) => {
    setSelectedNode(node);
    if (node) setPanelOpen(true);
  }, []);

  const handlePropsUpdated = useCallback((nodeId: string, _type: string, data: Record<string, unknown>) => {
    const rf = reactFlowRef.current;
    if (!rf) return;
    rf.setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } as FlowNode : n));
  }, []);

  // Handle AI agent tag events → update pipeline nodes
  const handleAgentTagEvents = useCallback((events: AgentTagEvent[]) => {
    const rf = reactFlowRef.current;
    if (!rf) return;
    rf.setNodes(prev => {
      let updated = prev;
      for (const ev of events) {
        if (ev.tag === "script") {
          updated = updated.map(n =>
            n.id === PIPELINE_NODE_IDS.script
              ? { ...n, data: { ...n.data, content: ev.content, loading: false } }
              : n
          );
        } else if (ev.tag === "scriptPlan") {
          updated = updated.map(n =>
            n.id === PIPELINE_NODE_IDS.scriptPlan
              ? { ...n, data: { ...n.data, content: ev.content, loading: false } }
              : n
          );
        } else if (ev.tag === "storyboardTable") {
          updated = updated.map(n =>
            n.id === PIPELINE_NODE_IDS.storyboardTable
              ? { ...n, data: { ...n.data, tableMarkdown: ev.content, loading: false } }
              : n
          );
        } else if (ev.tag === "storyboardItem") {
          // Parse single item and add to storyboard grid
          // Format: id|shotNumber|content|shotType|duration
          const parts = ev.content.split("|").map(s => s.trim());
          if (parts.length >= 3) {
            const newItem = {
              id: Date.now() + Math.random(),
              shotNumber: parts[0],
              content: parts[1],
              shotType: parts[2] ?? "",
              duration: parts[3] ?? "3",
              imageUrl: null, generatedImageUrl: null,
              videoUrl: null, generatedVideoUrl: null,
              generationStatus: "idle",
            };
            updated = updated.map(n =>
              n.id === PIPELINE_NODE_IDS.storyboard
                ? { ...n, data: { ...n.data, items: [...(n.data as any).items ?? [], newItem] } }
                : n
            );
          }
        }
      }
      return updated;
    });
  }, []);

  // Import from storyboard (individual shot-cards)
  const handleImportFromStoryboard = useCallback(async () => {
    if (!reactFlowRef.current || !storyboardId) return;
    try {
      const res = await fetch(`/api/storyboards/${storyboardId}/items`);
      const data = await res.json() as { code: number; data: StoryboardItem[] };
      if (data.code !== 200 || !data.data?.length) return;

      const items = data.data;
      const existingIds = new Set(
        nodesRef.current.filter(n => n.type === "shot-card" && n.data.storyboardItemId).map(n => n.data.storyboardItemId)
      );
      const newItems = items.filter(item => !existingIds.has(item.id));
      if (newItems.length === 0) { alert("所有分镜条目已在画布中"); return; }

      const center = reactFlowRef.current.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const COLS = Math.min(Math.ceil(Math.sqrt(newItems.length)), 5);
      const W = 280, GAP = 24;

      const newNodes: FlowNode[] = newItems.map((item, idx) => ({
        id: createNodeId("shot"),
        type: "shot-card",
        position: {
          x: center.x - ((COLS * W + (COLS - 1) * GAP) / 2) + (idx % COLS) * (W + GAP),
          y: center.y - 200 + Math.floor(idx / COLS) * 380,
        },
        data: itemToData(item),
      }));

      reactFlowRef.current.setNodes(prev => [...prev, ...newNodes]);
    } catch (err) { console.error("[canvas] import failed", err); }
  }, [storyboardId]);

  // Import assets (individual anchors)
  const handleImportAssets = useCallback(async () => {
    if (!reactFlowRef.current) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/assets?type=character,scene,prop`);
      const data = await res.json() as { code: number; data: AssetItem[] };
      if (data.code !== 200 || !data.data?.length) return;

      const existingIds = new Set(
        nodesRef.current.filter(n => n.type === "character-anchor" && n.data.assetId).map(n => n.data.assetId)
      );
      const newAssets = data.data.filter(a => !existingIds.has(a.id));
      if (newAssets.length === 0) { alert("所有素材已在画布中"); return; }

      const center = reactFlowRef.current.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const COLS = Math.min(Math.ceil(Math.sqrt(newAssets.length)), 4);
      const W = 200, GAP = 16;

      const newNodes: FlowNode[] = newAssets.map((asset, idx) => ({
        id: createNodeId("anchor"),
        type: "character-anchor",
        position: {
          x: center.x - ((COLS * W + (COLS - 1) * GAP) / 2) + (idx % COLS) * (W + GAP),
          y: center.y + 200 + Math.floor(idx / COLS) * 90,
        },
        data: { assetId: asset.id, name: asset.name, coverUrl: asset.coverUrl, description: asset.description ?? "", assetType: asset.type },
      }));

      reactFlowRef.current.setNodes(prev => [...prev, ...newNodes]);
    } catch (err) { console.error("[canvas] import assets failed", err); }
  }, [projectId]);

  const handleGenerateImage = useCallback((itemId: number, nodeId: string) => {
    addPipeline({
      label: "画布单图生成", projectId,
      request: { message: "", projectId, agentType: "storyboard_video_gen", context: { selectedStoryboardItemIds: [itemId], skipVideo: true } },
      onComplete: () => {
        reactFlowRef.current?.setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, generationStatus: "done" } } as FlowNode : n
        ));
      },
    });
    reactFlowRef.current?.setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, generationStatus: "generating-image" } } as FlowNode : n
    ));
    setPipeNotify(true); setPipeExpand(true);
  }, [projectId, addPipeline, setPipeNotify, setPipeExpand]);

  const handleGenerateVideo = useCallback((itemId: number, nodeId: string) => {
    addPipeline({
      label: "画布单条视频生成", projectId,
      request: { message: "", projectId, agentType: "storyboard_video_gen", context: { selectedStoryboardItemIds: [itemId] } },
      onComplete: () => {
        reactFlowRef.current?.setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, generationStatus: "done" } } as FlowNode : n
        ));
      },
    });
    reactFlowRef.current?.setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, generationStatus: "generating-video" } } as FlowNode : n
    ));
    setPipeNotify(true); setPipeExpand(true);
  }, [projectId, addPipeline, setPipeNotify, setPipeExpand]);

  const handleBatchGenerate = useCallback((mode: "image" | "video") => {
    const rf = reactFlowRef.current;
    if (!rf) return;
    const selected = rf.getNodes().filter(n => n.selected);
    const shotCards = selected.filter(n => n.type === "shot-card") as Node<ShotCardNodeData>[];
    if (shotCards.length === 0) return;
    const itemIds = shotCards.map(n => n.data.storyboardItemId).filter(Boolean) as number[];
    if (itemIds.length === 0) { alert("选中的镜头未关联分镜条目"); return; }

    const statusKey = mode === "image" ? "generating-image" : "generating-video";
    const agentType = mode === "image" ? ("asset_image_gen" as const) : ("storyboard_video_gen" as const);

    rf.setNodes(prev => prev.map(n =>
      shotCards.find(s => s.id === n.id) ? { ...n, data: { ...n.data, generationStatus: statusKey } } : n
    ));

    addPipeline({
      label: mode === "image" ? "画布批量生图" : "画布批量生视频", projectId,
      request: { message: "", projectId, agentType, context: { selectedStoryboardItemIds: itemIds } },
      onComplete: () => {
        rf.setNodes(prev => prev.map(n =>
          shotCards.find(s => s.id === n.id) ? { ...n, data: { ...n.data, generationStatus: "done" } } : n
        ));
      },
    });
    setPipeNotify(true); setPipeExpand(true);
  }, [projectId, addPipeline, setPipeNotify, setPipeExpand]);

  const handleZoomToFit = useCallback(() => {
    reactFlowRef.current?.fitView({ duration: 300 });
  }, []);

  const handleOpenImageEditor = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    if (node.type === "shot-card") {
      const data = node.data as ShotCardNodeData;
      if (data.generatedImageUrl) {
        setEditingShotImage({ storyboardItemId: data.storyboardItemId, imageUrl: data.generatedImageUrl });
      }
    }
    if (node.type === "workbench") {
      setWorkbenchOpen(true);
    }
  }, []);

  const handleWorkbenchEpisodesUpdated = useCallback((episodes: WorkbenchNodeData["episodes"]) => {
    reactFlowRef.current?.setNodes(prev => prev.map(n =>
      n.id === PIPELINE_NODE_IDS.workbench ? { ...n, data: { ...n.data, episodes, loading: false } } : n
    ));
  }, []);

  // Dagre auto-layout
  const handleOrganizeLayout = useCallback(() => {
    const rf = reactFlowRef.current;
    if (!rf) return;
    const allNodes = rf.getNodes();
    const allEdges = rf.getEdges();
    const pipelineNodeIds: Set<string> = new Set(Object.values(PIPELINE_NODE_IDS));
    const pipelineNodes = allNodes.filter(n => pipelineNodeIds.has(n.id));
    const otherNodes = allNodes.filter(n => !pipelineNodeIds.has(n.id));

    if (pipelineNodes.length === 0) return;

    const laidOut = layoutPipeline(pipelineNodes, allEdges, "LR");

    const pipelineNodeMap = new Map(laidOut.map(n => [n.id, n.position]));
    const updatedNodes = allNodes.map(n => {
      const pos = pipelineNodeMap.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });

    rf.setNodes(updatedNodes);
    setTimeout(() => rf.fitView({ duration: 300 }), 50);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ReactFlowProvider>
        <div style={{
          position: "absolute", inset: 0,
          right: (panelOpen && selectedNode ? 320 : 0) + (agentChatOpen ? 360 : 0),
          transition: "right 0.2s ease",
        }}>
          <InnerFlow
            projectId={projectId}
            storyboardId={storyboardId}
            storyboardItems={storyboardItems}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onNodesUpdate={(n) => { nodesRef.current = n; }}
            onEdgesUpdate={(e) => { edgesRef.current = e; }}
            onSelectionChange={handleSelectionChange}
            onNodeClick={handleOpenImageEditor}
            onReady={(rf) => { reactFlowRef.current = rf; }}
          />

          {/* Floating toolbar */}
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(20,20,28,0.85)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            padding: "6px 10px", zIndex: 500, pointerEvents: "all",
          }}>
            {storyboardId && (
              <button onClick={handleImportFromStoryboard}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: 8,
                  border: "1px solid rgba(139,92,246,0.3)",
                  background: "rgba(139,92,246,0.12)",
                  color: "#c4b5fd", fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
                }}
                title="将分镜条目导入为镜头节点"
              >
                <span style={{ fontSize: 14 }}>🎬</span>分镜
              </button>
            )}

            <button onClick={handleImportAssets}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 8,
                border: "1px solid rgba(52,211,153,0.3)",
                background: "rgba(52,211,153,0.12)",
                color: "#34d399", fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
              }}
              title="从资产库导入角色/场景/道具"
            >
              <span style={{ fontSize: 14 }}>📦</span>素材
            </button>

            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

            <button onClick={() => handleBatchGenerate("image")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 8,
                border: "1px solid rgba(96,165,250,0.3)",
                background: "rgba(96,165,250,0.1)",
                color: "#93c5fd", fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
              }}
              title="批量生成选中镜头的图片"
            >
              <Sparkles size={12} />批量生图
            </button>
            <button onClick={() => handleBatchGenerate("video")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 8,
                border: "1px solid rgba(167,139,250,0.3)",
                background: "rgba(167,139,250,0.1)",
                color: "#c4b5fd", fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
              }}
              title="批量生成选中镜头的视频"
            >
              <Film size={12} />批量生视频
            </button>

            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

            <button onClick={handleZoomToFit}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: "transparent", color: "rgba(255,255,255,0.6)",
                fontSize: 14, cursor: "pointer",
              }}
              title="缩放至适应"
            >⊞</button>
            <button onClick={handleOrganizeLayout}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: "transparent", color: "rgba(255,255,255,0.6)",
                fontSize: 14, cursor: "pointer",
              }}
              title="自动排列 (dagre)"
            >
              <TreePine size={16} />
            </button>

            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

            <button onClick={() => setAgentChatOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: agentChatOpen ? "rgba(139,92,246,0.2)" : "transparent",
                color: agentChatOpen ? "#c4b5fd" : "rgba(255,255,255,0.6)",
                fontSize: 14, cursor: "pointer",
              }}
              title={agentChatOpen ? "关闭 AI 助手" : "打开 AI 导演助手"}
            >
              <Bot size={16} />
            </button>

            <span style={{
              fontSize: 11, whiteSpace: "nowrap",
              color: saveStatus === "saved" ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.3)",
            }}>
              ✓ 已保存
            </span>
          </div>
        </div>

        {/* Properties panels */}
        {panelOpen && selectedNode?.type === "shot-card" && (
          <ShotPropertiesPanel
            selectedShape={{ id: selectedNode.id, type: "shot-card", props: { ...selectedNode.data, w: 280, h: 340 } } as any}
            shapeBindings={shapeBindingsRef.current}
            projectId={projectId}
            onClose={() => { setPanelOpen(false); setSelectedNode(null); }}
            onPropsUpdated={(id, type, props) => handlePropsUpdated(id, type, props)}
            onGenerateImage={(itemId, _shapeId) => handleGenerateImage(itemId, selectedNode.id)}
            onGenerateVideo={(itemId, _shapeId) => handleGenerateVideo(itemId, selectedNode.id)}
          />
        )}
        {panelOpen && selectedNode?.type === "character-anchor" && (
          <AssetPropertiesPanel
            selectedShape={{ id: selectedNode.id, type: "character-anchor", props: { ...selectedNode.data, w: 200, h: 56 } } as any}
            shapeBindings={shapeBindingsRef.current}
            onClose={() => { setPanelOpen(false); setSelectedNode(null); }}
            onPropsUpdated={(id, type, props) => handlePropsUpdated(id, type, props)}
          />
        )}

        {/* AI Agent Chat Panel */}
        <CanvasAgentChat
          open={agentChatOpen}
          onClose={() => setAgentChatOpen(false)}
          conversationId={conversationId}
          onTagEvents={handleAgentTagEvents}
        />

        {/* Image Edit Sub-Canvas */}
        <ImageEditCanvas
          open={!!editingShotImage}
          imageUrl={editingShotImage?.imageUrl ?? null}
          storyboardItemId={editingShotImage?.storyboardItemId ?? null}
          onClose={() => setEditingShotImage(null)}
        />

        {/* Workbench Dialog */}
        <WorkbenchDialog
          open={workbenchOpen}
          projectId={projectId}
          storyboardId={storyboardId ?? null}
          onClose={() => setWorkbenchOpen(false)}
          onEpisodesUpdated={handleWorkbenchEpisodesUpdated}
        />
      </ReactFlowProvider>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes gen-spin { to { transform: rotate(360deg); } }
        @keyframes gen-pulse { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:0.5;transform:scale(0.7); } }
      `}</style>
    </div>
  );
}
