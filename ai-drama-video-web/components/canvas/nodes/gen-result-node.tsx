"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { GenResultNodeData } from "@/types/image-editor";

function GenResultNode({ data }: NodeProps<Node<GenResultNodeData>>) {
  return (
    <div
      style={{
        width: 140,
        borderRadius: 10,
        overflow: "hidden",
        border: `2px solid ${
          data.generationStatus === "done" ? "#4ade80" : data.generationStatus === "error" ? "#f87171" : "rgba(255,255,255,0.1)"
        }`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        lineHeight: 0,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8, background: "#60a5fa", border: "2px solid #1a1a2e" }}
      />

      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt="generated"
          style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%", height: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.15)",
            fontSize: 11,
          }}
        >
          {data.generationStatus === "generating" ? "生成中..." : "无结果"}
        </div>
      )}
      {data.generationStatus === "generating" && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(0,0,0,0.7)", padding: "4px 8px",
            fontSize: 9, color: "#60a5fa", textAlign: "center",
          }}
        >
          生成中...
        </div>
      )}
      {data.generationStatus === "done" && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(0,0,0,0.7)", padding: "2px 6px",
            fontSize: 9, color: "#4ade80", textAlign: "center",
          }}
        >
          ✓ 完成
        </div>
      )}
      {data.generationStatus === "error" && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(0,0,0,0.7)", padding: "2px 6px",
            fontSize: 9, color: "#f87171", textAlign: "center",
          }}
        >
          失败
        </div>
      )}
    </div>
  );
}

export default memo(GenResultNode);
