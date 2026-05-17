"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { Clapperboard, Eye, Play, RefreshCw } from "lucide-react";
import type { WorkbenchNodeData } from "@/types/pipeline";
import type { StoryboardEpisode } from "@/lib/api/storyboard";

export function composeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: "待生成", pending: "排队中", processing: "合成中",
    done: "已完成", error: "失败",
  };
  return labels[status] ?? status;
}

export function composeStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idle: "#52525b", pending: "#fbbf24", processing: "#60a5fa",
    done: "#4ade80", error: "#f87171",
  };
  return colors[status] ?? "#52525b";
}

export function numericToComposeStatus(n: number): string {
  return n === 0 ? "idle" : n === 1 ? "processing" : n === 2 ? "done" : n === 3 ? "error" : "idle";
}

export function episodeToWorkbench(ep: StoryboardEpisode) {
  return {
    id: ep.id,
    episodeNumber: ep.episodeNumber ?? 0,
    title: ep.title ?? "",
    composedVideoUrl: ep.composedVideoUrl,
    composeStatus: numericToComposeStatus(ep.composeStatus),
  };
}

function WorkbenchNode({ data }: NodeProps<Node<WorkbenchNodeData>>) {
  return (
    <div style={{
      width: 280, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(244,114,182,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ width: 10, height: 10, background: "#f472b6", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(244,114,182,0.1)",
        borderBottom: "1px solid rgba(244,114,182,0.12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Clapperboard size={16} color="#f472b6" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#f9a8d4" }}>视频装配</span>
        {data.loading && <RefreshCw size={11} color="rgba(255,255,255,0.2)" className="wb-spin" />}
      </div>

      <div style={{
        padding: "10px 14px", maxHeight: 240, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {data.loading ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>
            加载中...
          </div>
        ) : data.episodes && data.episodes.length > 0 ? (
          data.episodes.map((ep) => {
            const color = composeStatusColor(ep.composeStatus);
            const label = composeStatusLabel(ep.composeStatus);
            return (
              <div key={ep.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6,
                background: "rgba(255,255,255,0.03)",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: color, boxShadow: `0 0 6px ${color}66`,
                }} />
                <span style={{
                  fontSize: 11, color: "rgba(255,255,255,0.7)", flex: 1,
                  minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  第{ep.episodeNumber}集{ep.title ? ` · ${ep.title}` : ""}
                </span>
                <span style={{ fontSize: 9, color, flexShrink: 0 }}>
                  {label}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>
            暂无视频数据
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkbenchNode);

