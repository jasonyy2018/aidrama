"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";
import type { StoryboardNodeData, StoryboardShotItem } from "@/types/pipeline";

export type StoryboardGridShape = TLBaseShape<"storyboard", { w: number; h: number } & StoryboardNodeData>;

const STATUS_COLORS: Record<string, string> = {
  idle: "#52525b", "generating-image": "#60a5fa",
  "generating-video": "#a78bfa", done: "#4ade80", error: "#f87171",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class StoryboardGridShapeUtil extends ShapeUtil<any> {
  static override type = "storyboard" as const;

  static override props: RecordProps<StoryboardGridShape> = {
    w: T.number, h: T.number,
    storyboardId: T.nullable(T.number), items: T.any, loading: T.boolean,
  };

  override getDefaultProps(): StoryboardGridShape["props"] {
    return { w: 380, h: 340, storyboardId: null, items: [], loading: true };
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override getGeometry(shape: StoryboardGridShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: StoryboardGridShape) {
    const { w, h, items, loading } = shape.props;
    const shots = Array.isArray(items) ? items as unknown as StoryboardShotItem[] : [];
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(139,92,246,0.1)", borderBottom: "1px solid rgba(139,92,246,0.12)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🖼️</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#c4b5fd" }}>分镜镜头</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{shots.length} 个镜头</span>
          </div>
          <div style={{ padding: 8, flex: 1, overflow: "auto", display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
            {loading ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16, width: "100%" }}>加载中...</div>
            ) : shots.length > 0 ? shots.map((shot) => {
              const img = shot.generatedImageUrl || shot.imageUrl;
              const sc = STATUS_COLORS[shot.generationStatus] ?? "#52525b";
              return (
                <div key={shot.id} style={{ width: 80, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                  <div style={{ height: 60, background: img ? `url(${img}) center/cover no-repeat` : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {!img ? <span style={{ fontSize: 16, opacity: 0.2 }}>🎬</span> : null}
                    <div style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,0.6)", borderRadius: 3, padding: "0 3px", fontSize: 8, fontWeight: 600, color: "#fff" }}>
                      #{shot.shotNumber}
                    </div>
                    <div style={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: sc }} />
                  </div>
                  <div style={{ padding: "2px 4px", fontSize: 8, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {shot.shotType} · {shot.duration}s
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16, width: "100%" }}>暂无镜头数据</div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: StoryboardGridShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#8b5cf6" strokeWidth={2} />;
  }
}
