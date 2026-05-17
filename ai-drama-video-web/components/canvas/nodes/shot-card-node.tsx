"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";

export interface ShotCardNodeData {
  [key: string]: unknown;
  storyboardItemId: number | null;
  shotNumber: string;
  content: string;
  sceneExpectation: string;
  generatedImageUrl: string | null;
  videoUrl: string | null;
  generatedVideoUrl: string | null;
  shotType: string;
  duration: string;
  dialogue: string;
  cameraMovement: string;
  generationStatus: "idle" | "generating-image" | "generating-video" | "done" | "error";
  episodeTitle: string;
  sceneHeading: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; pulse: boolean }> = {
  idle: { label: "未生成", dot: "#52525b", pulse: false },
  "generating-image": { label: "生成图片中", dot: "#60a5fa", pulse: true },
  "generating-video": { label: "生成视频中", dot: "#a78bfa", pulse: true },
  done: { label: "已完成", dot: "#4ade80", pulse: false },
  error: { label: "失败", dot: "#f87171", pulse: false },
};

const SHOT_TYPE_LABELS: Record<string, string> = {
  "远景": "远", "全景": "全", "中景": "中",
  "近景": "近", "特写": "特",
};

function ShotCardNode({ data }: NodeProps<Node<ShotCardNodeData>>) {
  const {
    generatedImageUrl, videoUrl, generatedVideoUrl, shotNumber, content,
    shotType, duration, generationStatus, episodeTitle, sceneHeading,
  } = data;

  const displayImage = generatedImageUrl || null;
  const displayVideo = videoUrl || generatedVideoUrl || null;
  const statusCfg = STATUS_CONFIG[generationStatus] ?? STATUS_CONFIG.idle;
  const shotTypeLabel = SHOT_TYPE_LABELS[shotType] || shotType?.charAt(0) || "中";
  const isGenerating = generationStatus === "generating-image" || generationStatus === "generating-video";

  return (
    <div
      style={{
        width: 260,
        borderRadius: 12,
        background: "rgba(20, 20, 28, 0.95)",
        border: `1px solid ${isGenerating ? statusCfg.dot : "rgba(255,255,255,0.08)"}`,
        boxShadow: isGenerating
          ? `0 0 20px ${statusCfg.dot}33, 0 4px 24px rgba(0,0,0,0.4)`
          : "0 4px 24px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: "#8b5cf6", border: "2px solid #1a1a2e" }} />
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: "#8b5cf6", border: "2px solid #1a1a2e" }} />

      {/* 图片/视频区域 */}
      <div
        style={{
          height: 140,
          background: displayImage
            ? `url(${displayImage}) center/cover no-repeat`
            : "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!displayImage && !isGenerating && (
          <span style={{ fontSize: 28, opacity: 0.15 }}>🎬</span>
        )}
        {isGenerating && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: statusCfg.dot,
              animation: "gen-spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              {statusCfg.label}
            </span>
          </div>
        )}
        {displayVideo && (
          <div style={{
            position: "absolute", bottom: 4, right: 4,
            background: "rgba(0,0,0,0.6)", borderRadius: 4,
            padding: "1px 5px", fontSize: 9, color: "rgba(255,255,255,0.8)",
          }}>▶ 视频</div>
        )}
        <div style={{
          position: "absolute", top: 4, left: 4,
          background: "rgba(0,0,0,0.65)", borderRadius: 6,
          padding: "1px 6px", fontSize: 10, fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {shotNumber && <span>#{shotNumber}</span>}
          <span style={{
            background: "rgba(139,92,246,0.3)", borderRadius: 3,
            padding: "0 3px", color: "#c4b5fd", fontSize: 9,
          }}>{shotTypeLabel}</span>
        </div>
        <div style={{
          position: "absolute", top: 4, right: 4,
          display: "flex", alignItems: "center", gap: 3,
          background: "rgba(0,0,0,0.6)", borderRadius: 6,
          padding: "1px 6px", fontSize: 9,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: statusCfg.dot, display: "inline-block",
            animation: isGenerating ? "gen-pulse 1s ease-in-out infinite" : undefined,
          }} />
          <span style={{ color: "rgba(255,255,255,0.65)" }}>{statusCfg.label}</span>
        </div>
      </div>

      {/* 文字信息 */}
      <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {(episodeTitle || sceneHeading) && (
          <div style={{
            fontSize: 9, color: "rgba(255,255,255,0.3)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {episodeTitle}{sceneHeading && ` · ${sceneHeading}`}
          </div>
        )}
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.75)", lineHeight: 1.4,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>
          {content || <span style={{ color: "rgba(255,255,255,0.2)" }}>暂无画面描述</span>}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 2, borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
            ⏱ {duration || "—"}s
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(ShotCardNode);
