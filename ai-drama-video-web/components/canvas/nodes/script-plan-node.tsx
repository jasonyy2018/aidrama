"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { ListChecks } from "lucide-react";
import type { ScriptPlanNodeData } from "@/types/pipeline";

function ScriptPlanNode({ data }: NodeProps<Node<ScriptPlanNodeData>>) {
  return (
    <div style={{
      width: 280, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(251,191,36,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ width: 10, height: 10, background: "#fbbf24", border: "2px solid #1a1a2e" }} />
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: "#fbbf24", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(251,191,36,0.1)",
        borderBottom: "1px solid rgba(251,191,36,0.12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <ListChecks size={16} color="#fbbf24" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fde68a" }}>导演计划</span>
      </div>

      <div style={{ padding: "10px 14px", maxHeight: 200, overflowY: "auto" }}>
        {data.loading ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>
            加载中...
          </div>
        ) : (
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}>
            {data.content || <span style={{ color: "rgba(255,255,255,0.2)" }}>暂无导演计划</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ScriptPlanNode);
