"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";
import type { ScriptNodeData } from "@/types/pipeline";

export type ScriptShape = TLBaseShape<"script", { w: number; h: number } & ScriptNodeData>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ScriptShapeUtil extends ShapeUtil<any> {
  static override type = "script" as const;

  static override props: RecordProps<ScriptShape> = {
    w: T.number, h: T.number,
    scriptId: T.nullable(T.number), title: T.string, content: T.string, episodeCount: T.number,
  };

  override getDefaultProps(): ScriptShape["props"] {
    return { w: 320, h: 280, scriptId: null, title: "", content: "", episodeCount: 0 };
  }

  override canEdit() { return true; }
  override canResize() { return true; }
  override isAspectRatioLocked() { return false; }

  override getGeometry(shape: ScriptShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: ScriptShape) {
    const { w, h, title, content, episodeCount } = shape.props;
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(99,102,241,0.12)", borderBottom: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>📜</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e0ff" }}>剧本</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{episodeCount} 集</span>
          </div>
          <div style={{ padding: "10px 14px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {title ? <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 6 }}>{title}</div> : null}
            <div style={{ fontSize: 11, color: content ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)", lineHeight: 1.6, whiteSpace: "pre-wrap", overflow: "hidden", flex: 1 }}>
              {content || "暂无剧本内容"}
            </div>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: ScriptShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#6366f1" strokeWidth={2} />;
  }
}
