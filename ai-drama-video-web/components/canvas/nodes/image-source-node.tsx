"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { ImageSourceNodeData } from "@/types/image-editor";

function ImageSourceNode({ data }: NodeProps<Node<ImageSourceNodeData>>) {
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid rgba(139,92,246,0.3)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        lineHeight: 0,
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10, background: "#8b5cf6", border: "2px solid #1a1a2e" }}
      />
      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt="source"
          style={{
            width: data.width || 400,
            height: data.height || 300,
            objectFit: "contain",
            display: "block",
            background: "#0a0a0f",
          }}
        />
      ) : (
        <div
          style={{
            width: data.width || 400,
            height: data.height || 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.2)",
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          无图片
        </div>
      )}
    </div>
  );
}

export default memo(ImageSourceNode);
