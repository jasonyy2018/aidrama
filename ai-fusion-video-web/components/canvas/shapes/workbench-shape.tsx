"use client";

import {
  ShapeUtil, HTMLContainer, RecordProps, T, TLBaseShape, Rectangle2d,
} from "tldraw";
import type { WorkbenchNodeData, WorkbenchEpisode } from "@/types/pipeline";

export type WorkbenchShape = TLBaseShape<"workbench", { w: number; h: number } & WorkbenchNodeData>;

function composeStatusLabel(status: string): string {
  const labels: Record<string, string> = { idle: "待生成", pending: "排队中", processing: "合成中", done: "已完成", error: "失败" };
  return labels[status] ?? status;
}

function composeStatusColor(status: string): string {
  const colors: Record<string, string> = { idle: "#52525b", pending: "#fbbf24", processing: "#60a5fa", done: "#4ade80", error: "#f87171" };
  return colors[status] ?? "#52525b";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WorkbenchShapeUtil extends ShapeUtil<any> {
  static override type = "workbench" as const;

  static override props: RecordProps<WorkbenchShape> = {
    w: T.number, h: T.number,
    episodes: T.any, loading: T.boolean,
  };

  override getDefaultProps(): WorkbenchShape["props"] {
    return { w: 280, h: 300, episodes: [], loading: true };
  }

  override canEdit() { return true; }
  override canResize() { return true; }

  override getGeometry(shape: WorkbenchShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override getIndicatorPath() { return undefined; }

  override component(shape: WorkbenchShape) {
    const { w, h, episodes, loading } = shape.props;
    const eps = Array.isArray(episodes) ? episodes as unknown as WorkbenchEpisode[] : [];
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", width: w, height: h }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(20,20,28,0.95)", border: "1px solid rgba(244,114,182,0.3)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", background: "rgba(244,114,182,0.1)", borderBottom: "1px solid rgba(244,114,182,0.12)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>🎬</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f9a8d4" }}>视频装配</span>
          </div>
          <div style={{ padding: "10px 14px", flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {loading ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 16 }}>加载中...</div>
            ) : eps.length > 0 ? eps.map((ep) => {
              const color = composeStatusColor(ep.composeStatus);
              const label = composeStatusLabel(ep.composeStatus);
              return (
                <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color, boxShadow: `0 0 6px ${color}66` }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    第{ep.episodeNumber}集{ep.title ? ` · ${ep.title}` : ""}
                  </span>
                  <span style={{ fontSize: 9, color, flexShrink: 0 }}>{label}</span>
                </div>
              );
            }) : (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 16 }}>暂无视频数据</div>
            )}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: WorkbenchShape) {
    const { w, h } = shape.props;
    return <rect width={w} height={h} rx={12} ry={12} fill="none" stroke="#f472b6" strokeWidth={2} />;
  }
}
