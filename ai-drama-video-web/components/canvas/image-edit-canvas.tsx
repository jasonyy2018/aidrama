"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api/client";
import { usePipelineStore } from "@/lib/store/pipeline-store";
import ImageSourceNode from "./nodes/image-source-node";
import InpaintMaskNode from "./nodes/inpaint-mask-node";
import GenResultNode from "./nodes/gen-result-node";
import type {
  ImageSourceNodeData,
  InpaintMaskNodeData,
  GenResultNodeData,
} from "@/types/image-editor";
import { IMAGE_EDIT_NODE_IDS } from "@/types/image-editor";

const nodeTypes: NodeTypes = {
  "source-image": ImageSourceNode,
  "inpaint-mask": InpaintMaskNode,
  "gen-result": GenResultNode,
};

let maskIdCounter = 0;
let resultIdCounter = 0;

const MASK_W = 200;
const MASK_H = 220;
const RESULT_W = 140;
const RESULT_H = 100;

function InnerImageEditor({
  imageUrl,
  storyboardItemId,
  onClose,
}: {
  imageUrl: string;
  storyboardItemId: number | null;
  onClose: () => void;
}) {
  const reactFlow = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: IMAGE_EDIT_NODE_IDS.source,
      type: "source-image",
      position: { x: 0, y: 0 },
      data: { imageUrl, width: 500, height: 380, storyboardItemId },
      selected: false,
    } as Node<ImageSourceNodeData>,
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { addPipeline, setPanelExpanded } = usePipelineStore();

  useEffect(() => {
    setTimeout(() => reactFlow.fitView({ duration: 300, padding: 0.1 }), 100);
  }, []);

  const handleAddMask = useCallback(() => {
    maskIdCounter++;
    const id = `mask_${Date.now()}_${maskIdCounter}`;
    const offset = (maskIdCounter - 1) * 30;
    const newNode: Node<InpaintMaskNodeData> = {
      id,
      type: "inpaint-mask",
      position: { x: 100 + offset, y: 420 + offset },
      data: {
        label: `区域 ${maskIdCounter}`,
        prompt: "",
        x: 100 + offset,
        y: 420 + offset,
        width: MASK_W,
        height: MASK_H,
        resultImageUrl: null,
        generationStatus: "idle",
      },
    };
    setNodes(prev => [...prev, newNode]);
    setEdges(prev => addEdge({
      id: `e-source-${id}`,
      source: IMAGE_EDIT_NODE_IDS.source,
      target: id,
      sourceHandle: "region",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#fbbf24", strokeWidth: 2 },
    }, prev));
    setTimeout(() => reactFlow.fitView({ duration: 300, padding: 0.15 }), 50);
  }, [setNodes, setEdges, reactFlow]);

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const selected = params.nodes;
    setSelectedNodeId(selected.length === 1 && selected[0].type === "inpaint-mask" ? selected[0].id : null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedNodeId) return;
    const nodesSnapshot = reactFlow.getNodes();
    const maskNode = nodesSnapshot.find(n => n.id === selectedNodeId) as Node<InpaintMaskNodeData> | undefined;
    if (!maskNode || !promptInput.trim()) return;

    setIsGenerating(true);

    setNodes(prev => prev.map(n =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, prompt: promptInput.trim(), generationStatus: "generating" } } : n
    ));

    resultIdCounter++;
    const resultId = `result_${Date.now()}_${resultIdCounter}`;
    const resultNode: Node<GenResultNodeData> = {
      id: resultId,
      type: "gen-result",
      position: {
        x: maskNode.position.x + MASK_W + 40,
        y: maskNode.position.y + (MASK_H - RESULT_H) / 2,
      },
      data: {
        imageUrl: null,
        maskRegionId: selectedNodeId,
        generationStatus: "generating",
      },
    };
    setNodes(prev => [...prev, resultNode]);
    setEdges(prev => addEdge({
      id: `e-mask-${resultId}`,
      source: selectedNodeId,
      target: resultId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#60a5fa", strokeWidth: 2 },
    }, prev));

    addPipeline({
      label: "局部重绘", projectId: 0,
      request: {
        message: promptInput.trim(),
        projectId: 0,
        agentType: "asset_image_gen",
        context: {
          imageUrl,
          prompt: promptInput.trim(),
          maskRegionId: selectedNodeId,
          storyboardItemId,
        },
      },
      onComplete: () => {
        setNodes(prev => prev.map(n => {
          if (n.id === selectedNodeId) {
            return { ...n, data: { ...n.data, generationStatus: "done", resultImageUrl: imageUrl } };
          }
          if (n.id === resultId) {
            return { ...n, data: { ...n.data, imageUrl, generationStatus: "done" } };
          }
          return n;
        }));
        setIsGenerating(false);
        setTimeout(() => reactFlow.fitView({ duration: 300, padding: 0.15 }), 50);
      },
    });
    setPanelExpanded(true);
  }, [selectedNodeId, promptInput, setNodes, setEdges, imageUrl, storyboardItemId, reactFlow, addPipeline, setPanelExpanded]);

  const handleConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({
      ...conn,
      id: `e-conn-${Date.now()}`,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#8b5cf6", strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setEdges(prev => prev.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px",
          background: "rgba(20,20,28,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <button onClick={handleAddMask}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 8,
            border: "1px solid rgba(251,191,36,0.3)",
            background: "rgba(251,191,36,0.1)",
            color: "#fcd34d", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "system-ui, sans-serif",
          }}
        >
          <Plus size={12} /> 添加遮罩区域
        </button>

        {selectedNodeId && (
          <>
            <input
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="输入该区域的生成提示词..."
              disabled={isGenerating}
              style={{
                flex: 1, maxWidth: 300,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "5px 10px", fontSize: 11, color: "rgba(255,255,255,0.75)",
                outline: "none", fontFamily: "system-ui, sans-serif",
              }}
            />
            <button onClick={handleGenerate} disabled={isGenerating || !promptInput.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 8, border: "none",
                background: isGenerating || !promptInput.trim()
                  ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.4)",
                color: isGenerating || !promptInput.trim() ? "rgba(147,197,253,0.3)" : "#93c5fd",
                fontSize: 11, fontWeight: 500, cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {isGenerating ? <Loader2 size={12} className="ie-spin" /> : <Sparkles size={12} />}
              {isGenerating ? "生成中..." : "生成"}
            </button>
            <button onClick={handleDeleteSelected}
              style={{
                padding: "5px 10px", borderRadius: 8,
                border: "1px solid rgba(248,113,113,0.2)",
                background: "rgba(248,113,113,0.08)",
                color: "#fca5a5", fontSize: 11, cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              删除
            </button>
          </>
        )}
      </div>

      {/* ReactFlow */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
          panOnDrag={[1, 2]}
          panOnScroll
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
          }}
        >
          <Background color="rgba(255,255,255,0.04)" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function ImageEditCanvas({
  open,
  imageUrl,
  storyboardItemId,
  onClose,
}: {
  open: boolean;
  imageUrl: string | null;
  storyboardItemId: number | null;
  onClose: () => void;
}) {
  if (!open || !imageUrl) return null;

  const resolvedUrl = resolveMediaUrl(imageUrl) || imageUrl;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "90vw",
          height: "85vh",
          borderRadius: 16,
          overflow: "hidden",
          background: "rgba(12,12,18,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "system-ui, sans-serif",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
            图片编辑 · {storyboardItemId ? `镜头 #${storyboardItemId}` : "参考图"}
          </span>
          <button onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <ReactFlowProvider>
          <InnerImageEditor
            imageUrl={resolvedUrl}
            storyboardItemId={storyboardItemId}
            onClose={onClose}
          />
        </ReactFlowProvider>
      </div>

      <style>{`
        @keyframes ie-spin { to { transform: rotate(360deg); } }
        .ie-spin { animation: ie-spin 0.8s linear infinite; }
        @keyframes gen-pulse { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:0.5;transform:scale(0.7); } }
        @keyframes gen-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
