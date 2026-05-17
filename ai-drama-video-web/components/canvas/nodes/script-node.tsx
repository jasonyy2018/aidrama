"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import type { ScriptNodeData } from "@/types/pipeline";

function ScriptNode({ data }: NodeProps<Node<ScriptNodeData>>) {
  return (
    <div style={{
      width: 320, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(99,102,241,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="source" id="assets" position={Position.Bottom}
        style={{ left: "30%", width: 10, height: 10, background: "#6366f1", border: "2px solid #1a1a2e" }} />
      <Handle type="source" id="scriptPlan" position={Position.Right}
        style={{ width: 10, height: 10, background: "#6366f1", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(99,102,241,0.12)",
        borderBottom: "1px solid rgba(99,102,241,0.15)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <FileText size={16} color="#818cf8" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e0ff" }}>剧本</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
          {data.episodeCount ?? 0} 集
        </span>
      </div>

      <div style={{ padding: "10px 14px", maxHeight: 220, overflowY: "auto" }}>
        {data.title && (
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 6 }}>
            {data.title}
          </div>
        )}
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
          whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 10,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        } as React.CSSProperties}>
          {data.content || <span style={{ color: "rgba(255,255,255,0.2)" }}>暂无剧本内容</span>}
        </div>
      </div>
    </div>
  );
}

export default memo(ScriptNode);
