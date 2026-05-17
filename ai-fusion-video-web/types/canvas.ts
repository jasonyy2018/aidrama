/**
 * Canvas Shape 类型定义
 *
 * ShotCard: 对应 afv_storyboard_item（一个镜头）
 * CharacterAnchor: 对应 afv_asset（一个角色）
 */

// ============================================================
// ShotCard Shape
// ============================================================
export interface ShotCardShapeProps {
  /** 关联的 storyboard_item.id */
  storyboardItemId: number | null;
  /** 快照字段（从 DB 同步，减少实时请求） */
  shotNumber: string;
  content: string;
  sceneExpectation: string;
  generatedImageUrl: string | null;
  videoUrl: string | null;
  generatedVideoUrl: string | null;
  shotType: string;
  duration: string;
  dialogue: string;
  cameraMovement: string;
  /** 当前状态: idle | generating-image | generating-video | done | error */
  generationStatus: "idle" | "generating-image" | "generating-video" | "done" | "error";
  /** 分集和场次 */
  episodeTitle: string;
  sceneHeading: string;
}

// ============================================================
// CharacterAnchor Shape
// ============================================================
export interface CharacterAnchorShapeProps {
  /** 关联的 afv_asset.id */
  assetId: number | null;
  name: string;
  coverUrl: string | null;
  description: string;
  /** 角色类型（character/scene/prop等） */
  assetType: string;
}

// ============================================================
// Shape Binding 映射（存储在 canvas_snapshot.shape_bindings）
// ============================================================
export interface ShapeBinding {
  type: "storyboard_item" | "asset";
  entityId: number;
}

export type ShapeBindings = Record<string, ShapeBinding>;

// ============================================================
// 画布 API 类型
// ============================================================
export interface CanvasSnapshotData {
  id: number;
  projectId: number;
  storyboardId: number | null;
  snapshot: object;
  viewport: { x: number; y: number; zoom: number } | null;
  shapeBindings: ShapeBindings | null;
  deleted?: number;
  createdBy?: number | null;
  createTime: Date | string;
  updateTime: Date | string;
}

export interface CanvasApiResponse {
  code: number;
  msg?: string;
  data: CanvasSnapshotData | null;
}
