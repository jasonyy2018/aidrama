"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";
import type { StoryboardTableNodeData } from "@/types/pipeline";

export type StoryboardTableShape = TLBaseShape<"storyboardTable", { w: number; h: number } & StoryboardTableNodeData>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class StoryboardTableShapeUtil extends ShapeUtil<any> {
  static override type = "storyboardTable" as const;

  static override props: RecordProps<StoryboardTableShape> = {
    w: T.number, h: T.number,
    storyboardId: T.nullable(T.number), shotCount: T.number, tableMarkdown: T.string, loading: T.boolean,
  };

  override getDefaultProps(): StoryboardTableShape["props"] {
    return { w: 360, h: 320, storyboardId: null, shotCount: 0, tableMarkdown: "", loading: true };
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override getGeometry(shape: StoryboardTableShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: StoryboardTableShape) {
    const { w, h, shotCount, tableMarkdown, loading } = shape.props;
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(52,211,153,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(52,211,153,0.1)", borderBottom: "1px solid rgba(52,211,153,0.12)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>分镜表</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{shotCount} 个镜头</span>
          </div>
          <div style={{ padding: "10px 14px", flex: 1, overflow: "auto" }}>
            {loading ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>加载中...</div>
            ) : tableMarkdown ? (
              <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", margin: 0 }}>
                {tableMarkdown}
              </pre>
            ) : (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>暂无分镜数据</div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: StoryboardTableShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#34d399" strokeWidth={2} />;
  }
}
