"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { Images } from "lucide-react";
import type { StoryboardNodeData } from "@/types/pipeline";

const STATUS_COLORS: Record<string, string> = {
  idle: "#52525b", "generating-image": "#60a5fa",
  "generating-video": "#a78bfa", done: "#4ade80", error: "#f87171",
};

function StoryboardGridNode({ data }: NodeProps<Node<StoryboardNodeData>>) {
  return (
    <div style={{
      width: 380, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(139,92,246,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ width: 10, height: 10, background: "#8b5cf6", border: "2px solid #1a1a2e" }} />
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: "#8b5cf6", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(139,92,246,0.1)",
        borderBottom: "1px solid rgba(139,92,246,0.12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Images size={16} color="#8b5cf6" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#c4b5fd" }}>分镜镜头</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
          {data.items?.length ?? 0} 个镜头
        </span>
      </div>

      <div style={{ padding: 8, maxHeight: 280, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.loading ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16, width: "100%" }}>
            加载中...
          </div>
        ) : data.items && data.items.length > 0 ? data.items.map((shot) => {
          const img = shot.generatedImageUrl || shot.imageUrl;
          const sc = STATUS_COLORS[shot.generationStatus] ?? "#52525b";
          return (
            <div key={shot.id} style={{
              width: 80, borderRadius: 6, overflow: "hidden",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}>
              <div style={{
                height: 60, background: img ? `url(${img}) center/cover no-repeat` : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                {!img && <span style={{ fontSize: 16, opacity: 0.2 }}>🎬</span>}
                <div style={{
                  position: "absolute", top: 2, left: 2,
                  background: "rgba(0,0,0,0.6)", borderRadius: 3,
                  padding: "0 3px", fontSize: 8, fontWeight: 600, color: "#fff",
                }}>
                  #{shot.shotNumber}
                </div>
                <div style={{
                  position: "absolute", top: 2, right: 2,
                  width: 5, height: 5, borderRadius: "50%", background: sc,
                }} />
              </div>
              <div style={{
                padding: "2px 4px", fontSize: 8, color: "rgba(255,255,255,0.4)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {shot.shotType} · {shot.duration}s
              </div>
            </div>
          );
        }) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16, width: "100%" }}>
            暂无镜头数据
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StoryboardGridNode);
