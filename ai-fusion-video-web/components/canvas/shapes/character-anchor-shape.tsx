"use client";

import {
  ShapeUtil,
  HTMLContainer,
  RecordProps,
  T,
  TLBaseShape,
  Rectangle2d,
} from "tldraw";
import type { CharacterAnchorShapeProps } from "@/types/canvas";

export type CharacterAnchorShape = TLBaseShape<
  "character-anchor",
  CharacterAnchorShapeProps & { w: number; h: number }
>;

const ASSET_COLORS: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  character: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", icon: "👤", label: "角色" },
  scene: { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", icon: "🌄", label: "场景" },
  prop: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", icon: "📦", label: "道具" },
};

const DEFAULT_ASSET_COLOR = { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", icon: "📎", label: "素材" };

function getAssetStyle(type: string) {
  return ASSET_COLORS[type] ?? DEFAULT_ASSET_COLOR;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class CharacterAnchorShapeUtil extends ShapeUtil<any> {
  static override type = "character-anchor" as const;

  static override props: RecordProps<CharacterAnchorShape> = {
    w: T.number,
    h: T.number,
    assetId: T.nullable(T.number),
    name: T.string,
    coverUrl: T.nullable(T.string),
    description: T.string,
    assetType: T.string,
  };

  override getDefaultProps(): CharacterAnchorShape["props"] {
    return {
      w: 180,
      h: 64,
      assetId: null,
      name: "",
      coverUrl: null,
      description: "",
      assetType: "character",
    };
  }

  override canEdit() { return false; }
  override canResize() { return false; }

  override getGeometry(shape: CharacterAnchorShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override getIndicatorPath(_shape: CharacterAnchorShape): undefined {
    return undefined;
  }

  override component(shape: CharacterAnchorShape) {
    const { name, coverUrl, assetType, description, w, h } = shape.props;
    const style = getAssetStyle(assetType);

    return (
      <HTMLContainer
        id={shape.id}
        style={{ pointerEvents: "all", width: w, height: h }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 10,
            background: style.bg,
            border: `1px solid ${style.border}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
            fontFamily: "system-ui, sans-serif",
            overflow: "hidden",
            cursor: "grab",
          }}
        >
          {coverUrl ? (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `url(${coverUrl}) center/cover no-repeat`,
                flexShrink: 0,
                border: `1px solid ${style.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {style.icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name || "未命名"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 2,
              }}
            >
              {style.label}
              {description ? ` · ${description}` : ""}
            </div>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: CharacterAnchorShape) {
    const { w, h } = shape.props;
    const style = getAssetStyle(shape.props.assetType);
    return (
      <rect width={w} height={h} rx={10} ry={10}
        fill="none" stroke={style.border.replace("0.3", "0.8")} strokeWidth={2} />
    );
  }
}
