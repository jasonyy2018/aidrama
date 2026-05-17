"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";

export interface CharacterAnchorNodeData {
  [key: string]: unknown;
  assetId: number | null;
  name: string;
  coverUrl: string | null;
  description: string;
  assetType: string;
}

const ASSET_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  character: { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.35)", accent: "#8b5cf6" },
  scene: { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.35)", accent: "#34d399" },
  prop: { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.35)", accent: "#fbbf24" },
  costume: { bg: "rgba(244,114,182,0.15)", border: "rgba(244,114,182,0.35)", accent: "#f472b6" },
  reference: { bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.35)", accent: "#60a5fa" },
};

const ASSET_LABELS: Record<string, string> = {
  character: "角色", scene: "场景", prop: "道具", costume: "服装", reference: "参考",
};

const DEFAULT_STYLE = { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", accent: "#a1a1aa" };

function getStyle(type: string) { return ASSET_STYLES[type] ?? DEFAULT_STYLE; }
function getAssetLabel(type: string) { return ASSET_LABELS[type] ?? type; }

function CharacterAnchorNode({ data }: NodeProps<Node<CharacterAnchorNodeData>>) {
  const { name, coverUrl, assetType, description } = data;
  const style = getStyle(assetType);
  const typeLabel = getAssetLabel(assetType);

  return (
    <div
      style={{
        width: 200,
        borderRadius: 10,
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        overflow: "hidden",
        position: "relative",
        cursor: "grab",
      }}
    >
      <Handle type="source" position={Position.Right}
        style={{ width: 8, height: 8, background: style.accent, border: "2px solid #1a1a2e" }} />
      <Handle type="target" position={Position.Left}
        style={{ width: 8, height: 8, background: style.accent, border: "2px solid #1a1a2e" }} />

      {coverUrl ? (
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: `url(${coverUrl}) center/cover no-repeat`,
            flexShrink: 0, border: `1px solid ${style.border}`,
          }}
        />
      ) : (
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: style.accent,
          }}
        >
          {assetType === "character" ? "👤" : assetType === "scene" ? "🌄" : assetType === "prop" ? "📦" : "📎"}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, padding: "8px 0" }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {name || "未命名"}
        </div>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.35)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {description || typeLabel}
        </div>
      </div>

      <div style={{
        position: "absolute", top: 3, right: 4,
        fontSize: 7, fontWeight: 600, color: style.accent,
        background: `${style.accent}1a`,
        padding: "1px 4px", borderRadius: 3,
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        {typeLabel}
      </div>
    </div>
  );
}

export default memo(CharacterAnchorNode);
