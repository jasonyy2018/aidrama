"use client";

import {
  ShapeUtil,
  HTMLContainer,
  RecordProps,
  T,
  TLBaseShape,
  TLResizeInfo,
  Rectangle2d,
  resizeBox,
  TLShape,
} from "tldraw";
import type { ShotCardShapeProps } from "@/types/canvas";

// ============================================================
// ShotCard Shape 类型定义
// 注意：tldraw 要求把 w/h 放在 props 里（ShapeUtil 模式）
// ============================================================
export type ShotCardShape = TLBaseShape<
  "shot-card",
  ShotCardShapeProps & { w: number; h: number }
>;

const STATUS_CONFIG = {
  idle: { label: "未生成", dot: "#52525b" },
  "generating-image": { label: "生成图片中", dot: "#60a5fa" },
  "generating-video": { label: "生成视频中", dot: "#a78bfa" },
  done: { label: "已完成", dot: "#4ade80" },
  error: { label: "失败", dot: "#f87171" },
} as const;

const SHOT_TYPE_LABELS: Record<string, string> = {
  "远景": "远", "全景": "全", "中景": "中",
  "近景": "近", "特写": "特",
};

// ============================================================
// ShotCard Shape Util
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ShotCardShapeUtil extends ShapeUtil<any> {
  static override type = "shot-card" as const;

  static override props: RecordProps<ShotCardShape> = {
    w: T.number,
    h: T.number,
    storyboardItemId: T.nullable(T.number),
    shotNumber: T.string,
    content: T.string,
    sceneExpectation: T.string,
    generatedImageUrl: T.nullable(T.string),
    videoUrl: T.nullable(T.string),
    generatedVideoUrl: T.nullable(T.string),
    shotType: T.string,
    duration: T.string,
    dialogue: T.string,
    cameraMovement: T.string,
    generationStatus: T.literalEnum(
      "idle", "generating-image", "generating-video", "done", "error"
    ),
    episodeTitle: T.string,
    sceneHeading: T.string,
    imageModelId: T.nullable(T.number),
    videoModelId: T.nullable(T.number),
    imageModelName: T.string,
    videoModelName: T.string,
  };

  override getDefaultProps(): ShotCardShape["props"] {
    return {
      w: 280,
      h: 340,
      storyboardItemId: null,
      shotNumber: "",
      content: "",
      sceneExpectation: "",
      generatedImageUrl: null,
      videoUrl: null,
      generatedVideoUrl: null,
      shotType: "中景",
      duration: "3",
      dialogue: "",
      cameraMovement: "",
      generationStatus: "idle",
    episodeTitle: "",
    sceneHeading: "",
    imageModelId: null,
    videoModelId: null,
    imageModelName: "",
    videoModelName: "",
    };
  }

  override canEdit() { return true; }
  override canResize() { return true; }
  override isAspectRatioLocked() { return false; }

  // tldraw 2.x 要求返回 Geometry2d 实例
  override getGeometry(shape: ShotCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  // tldraw getIndicatorPath must return TLIndicatorPath | undefined
  // Returning undefined means tldraw uses the default indicator (rect)
  // We use the indicator() SVG method below instead
  override getIndicatorPath(_shape: ShotCardShape): undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info);
  }

  override component(shape: ShotCardShape) {
    const {
      generatedImageUrl,
      videoUrl,
      generatedVideoUrl,
      shotNumber,
      content,
      shotType,
      duration,
      generationStatus,
      sceneHeading,
      episodeTitle,
      imageModelName,
      videoModelName,
      w,
      h,
    } = shape.props;

    const displayImage = generatedImageUrl || null;
    const displayVideo = videoUrl || generatedVideoUrl || null;
    const statusCfg = STATUS_CONFIG[generationStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idle;
    const shotTypeLabel = SHOT_TYPE_LABELS[shotType] || shotType?.charAt(0) || "中";

    return (
      <HTMLContainer
        id={shape.id}
        style={{ pointerEvents: "all", width: w, height: h }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 12,
            background: "rgba(20, 20, 28, 0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* 图片/视频区域 */}
          <div
            style={{
              flex: "0 0 55%",
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
            {!displayImage && (
              <span style={{ fontSize: 32, opacity: 0.15 }}>🎬</span>
            )}
            {displayVideo && (
              <div style={{
                position: "absolute", bottom: 6, right: 6,
                background: "rgba(0,0,0,0.6)", borderRadius: 4,
                padding: "2px 6px", fontSize: 10, color: "rgba(255,255,255,0.8)",
              }}>▶ 视频</div>
            )}
            <div style={{
              position: "absolute", top: 6, left: 6,
              background: "rgba(0,0,0,0.65)", borderRadius: 6,
              padding: "2px 8px", fontSize: 11, fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {shotNumber && <span>#{shotNumber}</span>}
              <span style={{
                background: "rgba(139,92,246,0.3)", borderRadius: 3,
                padding: "0 4px", color: "#c4b5fd", fontSize: 10,
              }}>{shotTypeLabel}</span>
              {(imageModelName || videoModelName) && (
                <span style={{
                  background: "rgba(52,211,153,0.2)", borderRadius: 3,
                  padding: "0 4px", color: "#6ee7b7", fontSize: 8,
                  maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{imageModelName || videoModelName}</span>
              )}
            </div>
            <div style={{
              position: "absolute", top: 6, right: 6,
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(0,0,0,0.6)", borderRadius: 6,
              padding: "2px 7px", fontSize: 10,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: statusCfg.dot, display: "inline-block",
                animation: (generationStatus === "generating-image" || generationStatus === "generating-video")
                  ? "pulse 1.2s ease-in-out infinite" : "none",
              }} />
              <span style={{ color: "rgba(255,255,255,0.65)" }}>{statusCfg.label}</span>
            </div>
          </div>

          {/* 文字信息区域 */}
          <div style={{
            flex: 1, padding: "8px 10px",
            display: "flex", flexDirection: "column", gap: 4,
            minHeight: 0, overflow: "hidden",
          }}>
            {(episodeTitle || sceneHeading) && (
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {episodeTitle}{sceneHeading && ` · ${sceneHeading}`}
              </div>
            )}
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 3, WebkitBoxOrient: "vertical", flex: 1,
            } as React.CSSProperties}>
              {content || <span style={{ color: "rgba(255,255,255,0.2)" }}>暂无画面描述</span>}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                ⏱ {duration || "—"}s
              </span>
            </div>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: ShotCardShape) {
    const { w, h } = shape.props;
    return (
      <rect width={w} height={h} rx={12} ry={12}
        fill="none" stroke="#8b5cf6" strokeWidth={2} />
    );
  }
}
