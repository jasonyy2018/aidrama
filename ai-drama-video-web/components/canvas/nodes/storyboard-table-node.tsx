"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { Table2 } from "lucide-react";
import type { StoryboardTableNodeData } from "@/types/pipeline";

function StoryboardTableNode({ data }: NodeProps<Node<StoryboardTableNodeData>>) {
  return (
    <div style={{
      width: 360, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(52,211,153,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ top: "35%", width: 10, height: 10, background: "#34d399", border: "2px solid #1a1a2e" }} />
      <Handle type="target" id="from-assets" position={Position.Left}
        style={{ top: "65%", width: 10, height: 10, background: "#34d399", border: "2px solid #1a1a2e" }} />
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: "#34d399", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(52,211,153,0.1)",
        borderBottom: "1px solid rgba(52,211,153,0.12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Table2 size={16} color="#34d399" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>分镜表</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
          {data.shotCount ?? 0} 个镜头
        </span>
      </div>

      <div style={{ padding: "10px 14px", maxHeight: 260, overflow: "auto" }}>
        {data.loading ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>
            加载中...
          </div>
        ) : data.tableMarkdown ? (
          <pre style={{
            fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5,
            whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace",
            margin: 0,
          }}>
            {data.tableMarkdown}
          </pre>
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>
            暂无分镜数据
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StoryboardTableNode);
