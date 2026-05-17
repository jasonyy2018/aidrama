"use client";

import { memo } from "react";
import { Handle, Position, Node, type NodeProps } from "@xyflow/react";
import { Package } from "lucide-react";
import type { AssetsNodeData } from "@/types/pipeline";

const ASSET_ICONS: Record<string, string> = {
  character: "👤", scene: "🌄", prop: "📦", costume: "👗", reference: "📎",
};

const ASSET_COLORS: Record<string, string> = {
  character: "#8b5cf6", scene: "#34d399", prop: "#fbbf24", costume: "#f472b6", reference: "#60a5fa",
};

function AssetsListNode({ data }: NodeProps<Node<AssetsNodeData>>) {
  return (
    <div style={{
      width: 300, borderRadius: 12, overflow: "hidden",
      background: "rgba(20,20,28,0.95)", border: "1px solid rgba(52,211,153,0.3)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif",
    }}>
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: "#34d399", border: "2px solid #1a1a2e" }} />
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: "#34d399", border: "2px solid #1a1a2e" }} />

      <div style={{
        padding: "10px 14px", background: "rgba(52,211,153,0.1)",
        borderBottom: "1px solid rgba(52,211,153,0.12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Package size={16} color="#34d399" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>素材库</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
          {data.assets?.length ?? 0} 项
        </span>
      </div>

      <div style={{ padding: 8, maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {data.loading ? (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>
            加载中...
          </div>
        ) : data.assets && data.assets.length > 0 ? data.assets.map((asset) => (
          <div key={asset.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 6px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: asset.coverUrl
                ? `url(${asset.coverUrl}) center/cover no-repeat`
                : `${ASSET_COLORS[asset.type] ?? "#52525b"}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>
              {!asset.coverUrl && (ASSET_ICONS[asset.type] ?? "📎")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {asset.name || "未命名"}
              </div>
              {asset.description && (
                <div style={{
                  fontSize: 9, color: "rgba(255,255,255,0.35)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {asset.description}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 8, fontWeight: 600, color: ASSET_COLORS[asset.type] ?? "#a1a1aa",
              background: `${ASSET_COLORS[asset.type] ?? "#52525b"}22`,
              padding: "1px 4px", borderRadius: 3, flexShrink: 0,
            }}>
              {asset.type}
            </span>
          </div>
        )) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>
            暂无素材
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AssetsListNode);
