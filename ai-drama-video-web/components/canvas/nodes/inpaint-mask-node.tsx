"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { InpaintMaskNodeData } from "@/types/image-editor";

function InpaintMaskNode({ data }: NodeProps<Node<InpaintMaskNodeData>>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        width: 200,
        borderRadius: 10,
        background: "rgba(30,30,50,0.95)",
        border: `2px solid ${
          data.generationStatus === "generating"
            ? "#60a5fa"
            : data.generationStatus === "done"
            ? "#4ade80"
            : data.generationStatus === "error"
            ? "#f87171"
            : "rgba(251,191,36,0.4)"
        }`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8, background: "#fbbf24", border: "2px solid #1a1a2e" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 8, height: 8, background: "#60a5fa", border: "2px solid #1a1a2e" }}
      />

      <div
        style={{
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", flexShrink: 0,
            animation: data.generationStatus === "generating" ? "gen-pulse 1s ease-in-out infinite" : undefined,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>
          {data.label || "遮罩区域"}
        </span>
        {data.generationStatus === "done" && (
          <span style={{ fontSize: 9, color: "#4ade80", marginLeft: "auto" }}>✓</span>
        )}
      </div>

      <div style={{ padding: "6px 10px" }}>
        <div
          style={{
            width: "100%", height: 60,
            borderRadius: 6,
            background: data.resultImageUrl
              ? `url(${data.resultImageUrl}) center/cover no-repeat`
              : "rgba(255,255,255,0.03)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "rgba(255,255,255,0.1)",
          }}
        >
          {data.generationStatus === "idle" && !data.resultImageUrl && "⊞"}
          {data.generationStatus === "generating" && (
            <div
              style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "#60a5fa",
                animation: "gen-spin 0.8s linear infinite",
              }}
            />
          )}
          {data.generationStatus === "error" && (
            <span style={{ fontSize: 10, color: "#f87171" }}>失败</span>
          )}
        </div>

        {expanded && (
          <div
            style={{
              marginTop: 6, padding: 6, borderRadius: 6,
              background: "rgba(0,0,0,0.2)",
              fontSize: 10, color: "rgba(255,255,255,0.5)",
              wordBreak: "break-all",
            }}
          >
            <div style={{ marginBottom: 4, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
              提示词
            </div>
            {data.prompt || <span style={{ fontStyle: "italic" }}>无</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(InpaintMaskNode);
