"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";

export type ScriptPlanShape = TLBaseShape<"scriptPlan", { w: number; h: number; content: string; loading: boolean }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ScriptPlanShapeUtil extends ShapeUtil<any> {
  static override type = "scriptPlan" as const;

  static override props: RecordProps<ScriptPlanShape> = {
    w: T.number, h: T.number, content: T.string, loading: T.boolean,
  };

  override getDefaultProps(): ScriptPlanShape["props"] {
    return { w: 280, h: 260, content: "", loading: true };
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override getGeometry(shape: ScriptPlanShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: ScriptPlanShape) {
    const { w, h, content, loading } = shape.props;
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.1)", borderBottom: "1px solid rgba(251,191,36,0.12)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fde68a" }}>导演计划</span>
          </div>
          <div style={{ padding: "10px 14px", flex: 1, overflow: "hidden" }}>
            {loading ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>加载中...</div>
            ) : (
              <div style={{ fontSize: 11, color: content ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {content || "暂无导演计划"}
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: ScriptPlanShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#fbbf24" strokeWidth={2} />;
  }
}
