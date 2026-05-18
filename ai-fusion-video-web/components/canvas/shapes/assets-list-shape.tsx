"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";
import type { AssetsNodeData, AssetItem } from "@/types/pipeline";

export type AssetsListShape = TLBaseShape<"assets", { w: number; h: number } & AssetsNodeData>;

const ASSET_ICONS: Record<string, string> = {
  character: "👤", scene: "🌄", prop: "📦", costume: "👗", reference: "📎",
};

const ASSET_COLORS: Record<string, string> = {
  character: "#8b5cf6", scene: "#34d399", prop: "#fbbf24", costume: "#f472b6", reference: "#60a5fa",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AssetsListShapeUtil extends ShapeUtil<any> {
  static override type = "assets" as const;

  static override props: RecordProps<AssetsListShape> = {
    w: T.number, h: T.number,
    assets: T.any, loading: T.boolean,
  };

  override getDefaultProps(): AssetsListShape["props"] {
    return { w: 300, h: 300, assets: [], loading: true };
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override getGeometry(shape: AssetsListShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: AssetsListShape) {
    const { w, h, assets, loading } = shape.props;
    const items = Array.isArray(assets) ? assets as unknown as AssetItem[] : [];
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(52,211,153,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(52,211,153,0.1)", borderBottom: "1px solid rgba(52,211,153,0.12)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>📦</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>素材库</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{items.length} 项</span>
          </div>
          <div style={{ padding: 8, flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {loading ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>加载中...</div>
            ) : items.length > 0 ? items.map((asset) => (
              <div key={asset.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: asset.coverUrl ? `url(${asset.coverUrl}) center/cover no-repeat` : `${ASSET_COLORS[asset.type] ?? "#52525b"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {!asset.coverUrl ? (ASSET_ICONS[asset.type] ?? "📎") : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.name || "未命名"}
                  </div>
                  {asset.description ? (
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asset.description}
                    </div>
                  ) : null}
                </div>
                <span style={{ fontSize: 8, fontWeight: 600, color: ASSET_COLORS[asset.type] ?? "#a1a1aa", background: `${ASSET_COLORS[asset.type] ?? "#52525b"}22`, padding: "1px 4px", borderRadius: 3, flexShrink: 0 }}>
                  {asset.type}
                </span>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>暂无素材</div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: AssetsListShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#34d399" strokeWidth={2} />;
  }
}
