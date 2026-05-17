"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tldraw,
  Editor,
  TLStoreSnapshot,
  useEditor,
  createShapeId,
} from "tldraw";
import "tldraw/tldraw.css";
import { ShotCardShapeUtil } from "./shapes/shot-card-shape";
import type { ShotCardShape } from "./shapes/shot-card-shape";
import type { ShapeBindings, CanvasSnapshotData, ShotCardShapeProps } from "@/types/canvas";
import type { StoryboardItem } from "@/lib/db/schema";
import dynamic from "next/dynamic";

// 属性面板动态导入（避免 SSR）
const ShotPropertiesPanel = dynamic(() => import("./shot-properties-panel"), { ssr: false });

const CUSTOM_SHAPE_UTILS = [ShotCardShapeUtil];
const CUSTOM_TOOLS: never[] = [];

interface CanvasEditorProps {
  projectId: number;
  storyboardId?: number | null;
  /** 初始快照（从服务端加载） */
  initialSnapshot: CanvasSnapshotData | null;
  /** storyboard items（分镜条目）用于初始化 ShotCard */
  storyboardItems?: StoryboardItem[];
  /** 画布保存后回调 */
  onSaved?: () => void;
}

// ============================================================
// 将 StoryboardItem 转换为 ShotCard props
// ============================================================
function itemToShotCardProps(item: StoryboardItem): Partial<ShotCardShapeProps> {
  return {
    storyboardItemId: item.id,
    shotNumber: item.shotNumber ?? item.autoShotNumber ?? String(item.sortOrder ?? ""),
    content: item.content ?? "",
    sceneExpectation: item.sceneExpectation ?? "",
    generatedImageUrl: item.generatedImageUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    generatedVideoUrl: item.generatedVideoUrl ?? null,
    shotType: item.shotType ?? "中景",
    duration: item.duration ?? "3",
    dialogue: item.dialogue ?? "",
    cameraMovement: item.cameraMovement ?? "",
    generationStatus: item.generatedVideoUrl ? "done"
      : item.generatedImageUrl ? "done"
      : "idle",
    episodeTitle: "",
    sceneHeading: "",
  };
}

// ============================================================
// 自动保存 Hook
// ============================================================
function useAutoSave(
  editor: Editor | null,
  projectId: number,
  storyboardId: number | null | undefined,
  shapeBindingsRef: React.MutableRefObject<ShapeBindings>,
  onSaved?: () => void
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!editor || isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      const snapshot = editor.store.serialize();
      const viewport = editor.getCamera();

      await fetch(`/api/canvas/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot,
          viewport,
          shapeBindings: shapeBindingsRef.current,
          storyboardId,
        }),
      });
      onSaved?.();
    } catch (err) {
      console.error("[canvas] 自动保存失败", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [editor, projectId, storyboardId, shapeBindingsRef, onSaved]);

  // 防抖 2 秒后保存
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save]);

  // 注册 editor 变更监听
  useEffect(() => {
    if (!editor) return;
    const unsubscribe = editor.store.listen(scheduleAutoSave, {
      source: "user",
      scope: "document",
    });
    return () => {
      unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, scheduleAutoSave]);

  return { save };
}

// ============================================================
// 内层组件（访问 tldraw editor context）
// ============================================================
function InnerCanvas({
  projectId,
  storyboardId,
  storyboardItems = [],
  shapeBindingsRef,
  onSaved,
  onSelectionChange,
  onImportItems,
}: {
  projectId: number;
  storyboardId?: number | null;
  storyboardItems?: StoryboardItem[];
  shapeBindingsRef: React.MutableRefObject<ShapeBindings>;
  onSaved?: () => void;
  onSelectionChange: (shape: ShotCardShape | null) => void;
  onImportItems: (items: StoryboardItem[]) => void;
}) {
  const editor = useEditor();
  const { save } = useAutoSave(editor, projectId, storyboardId, shapeBindingsRef, onSaved);

  // 把 onImportItems 暴露给外层（通过 ref 绑定 editor）
  useEffect(() => {
    if (!editor) return;
    // 注册"从分镜导入"命令
    (editor as unknown as { _importItems?: (items: StoryboardItem[]) => void })._importItems =
      (items: StoryboardItem[]) => {
        const CARD_W = 280;
        const CARD_H = 340;
        const COLS = Math.min(Math.ceil(Math.sqrt(items.length)), 5);
        const GAP = 24;

        // 从画布中心开始放置
        const center = editor.getViewportPageBounds().center;
        const totalW = COLS * CARD_W + (COLS - 1) * GAP;
        const startX = center.x - totalW / 2;
        const startY = center.y - 100;

      const defaultProps = {
        w: 280, h: 340, storyboardItemId: null, shotNumber: "",
        content: "", sceneExpectation: "", generatedImageUrl: null,
        videoUrl: null, generatedVideoUrl: null, shotType: "中景",
        duration: "3", dialogue: "", cameraMovement: "",
        generationStatus: "idle" as const, episodeTitle: "", sceneHeading: "",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).run(() => {
        items.forEach((item, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const x = startX + col * (CARD_W + GAP);
          const y = startY + row * (CARD_H + GAP);
          const shapeId = createShapeId();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor as any).createShape({
            id: shapeId,
            type: "shot-card",
            x,
            y,
            props: {
              ...defaultProps,
              ...itemToShotCardProps(item),
            },
          });

          // 建立 shapeBinding
          shapeBindingsRef.current[shapeId] = {
            type: "storyboard_item",
            entityId: item.id,
          };
        });
      });
      };
  }, [editor, shapeBindingsRef]);

  // 监听选中变更
  useEffect(() => {
    if (!editor) return;
    const handleSelectionChange = () => {
      const selected = editor.getSelectedShapes();
      if (selected.length === 1 && (selected[0].type as string) === "shot-card") {
        onSelectionChange(selected[0] as unknown as ShotCardShape);
      } else {
        onSelectionChange(null);
      }
    };

    const unsubscribe = editor.store.listen(
      handleSelectionChange,
      { source: "user", scope: "session" }
    );

    return () => unsubscribe();
  }, [editor, onSelectionChange]);

  /**
   * 同步已绑定 ShotCard 的 props（从 storyboard items 更新）
   */
  useEffect(() => {
    if (!editor || storyboardItems.length === 0) return;

    const existingShapes = editor.getCurrentPageShapes().filter(
      (s) => (s.type as string) === "shot-card"
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Array<{ id: string; type: "shot-card"; props: Partial<ShotCardShapeProps> }> = [];

    for (const shape of existingShapes) {
      const binding = shapeBindingsRef.current[shape.id];
      if (!binding || binding.type !== "storyboard_item") continue;

      const item = storyboardItems.find((i) => i.id === binding.entityId);
      if (!item) continue;

      updates.push({
        id: shape.id,
        type: "shot-card" as const,
        props: itemToShotCardProps(item),
      });
    }

    if (updates.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.updateShapes(updates as any);
    }
  }, [editor, storyboardItems, shapeBindingsRef]);

  void save; // 消除 unused lint 警告
  void onImportItems;

  return null;
}

// ============================================================
// 主 Canvas Editor 组件
// ============================================================
export default function CanvasEditor({
  projectId,
  storyboardId,
  initialSnapshot,
  storyboardItems = [],
  onSaved,
}: CanvasEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const shapeBindingsRef = useRef<ShapeBindings>(
    (initialSnapshot?.shapeBindings as ShapeBindings) ?? {}
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [selectedShape, setSelectedShape] = useState<ShotCardShape | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  // 选中 ShotCard 时打开属性面板
  const handleSelectionChange = useCallback((shape: ShotCardShape | null) => {
    setSelectedShape(shape);
    if (shape) setPanelOpen(true);
  }, []);

  // 属性面板更新 shape props
  const handlePropsUpdated = useCallback(
    (shapeId: string, props: Partial<ShotCardShape["props"]>) => {
      if (!editor) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.updateShapes([{ id: shapeId, type: "shot-card", props } as any]);
    },
    [editor]
  );

  // 从分镜导入 ShotCards（批量）
  const handleImportFromStoryboard = useCallback(async () => {
    if (!editor || !storyboardId || importing) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/storyboards/${storyboardId}/items`);
      const data = await res.json() as { code: number; data: StoryboardItem[] };
      if (data.code !== 200 || !data.data?.length) return;

      const items = data.data;
      // 过滤掉已经在画布上的 items
      const existingEntityIds = new Set(
        Object.values(shapeBindingsRef.current)
          .filter(b => b.type === "storyboard_item")
          .map(b => b.entityId)
      );
      const newItems = items.filter(item => !existingEntityIds.has(item.id));

      if (newItems.length === 0) {
        alert("所有分镜条目已在画布中，无需重复导入");
        return;
      }

      // 调用 InnerCanvas 注册的命令
      type EditorWithImport = Editor & { _importItems?: (items: StoryboardItem[]) => void };
      (editor as EditorWithImport)._importItems?.(newItems);
    } catch (err) {
      console.error("[canvas] 导入失败", err);
    } finally {
      setImporting(false);
    }
  }, [editor, storyboardId, importing, shapeBindingsRef]);

  const handleMount = useCallback(
    (ed: Editor) => {
      setEditor(ed);

      // 恢复快照
      if (initialSnapshot?.snapshot) {
        try {
          ed.loadSnapshot(
            initialSnapshot.snapshot as TLStoreSnapshot
          );
        } catch (err) {
          console.warn("[canvas] 快照恢复失败，使用空画布", err);
        }
      }

      // 恢复视口
      if (initialSnapshot?.viewport) {
        const { x, y, zoom } = initialSnapshot.viewport as {
          x: number; y: number; zoom: number;
        };
        ed.setCamera({ x, y, z: zoom });
      }
    },
    [initialSnapshot]
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* tldraw 画布区域（属性面板打开时缩窄） */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          right: panelOpen && selectedShape ? 320 : 0,
          transition: "right 0.2s ease",
        }}
      >
        <Tldraw
          shapeUtils={CUSTOM_SHAPE_UTILS}
          tools={CUSTOM_TOOLS}
          onMount={handleMount}
          hideUi={false}
        >
          {editor && (
            <InnerCanvas
              projectId={projectId}
              storyboardId={storyboardId}
              storyboardItems={storyboardItems}
              shapeBindingsRef={shapeBindingsRef}
              onSaved={() => {
                setSaveStatus("saved");
                onSaved?.();
              }}
              onSelectionChange={handleSelectionChange}
              onImportItems={() => {}}
            />
          )}
        </Tldraw>

        {/* 浮动工具栏 */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(20,20,28,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "6px 12px",
            zIndex: 500,
            pointerEvents: "all",
          }}
        >
          {/* 从分镜导入按钮 */}
          {storyboardId && (
            <button
              onClick={handleImportFromStoryboard}
              disabled={importing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid rgba(139,92,246,0.3)",
                background: importing
                  ? "rgba(139,92,246,0.05)"
                  : "rgba(139,92,246,0.12)",
                color: importing ? "rgba(196,181,253,0.4)" : "#c4b5fd",
                fontSize: 12,
                fontWeight: 500,
                cursor: importing ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                fontFamily: "system-ui, sans-serif",
              }}
              title="将分镜列表中的所有条目导入为 ShotCard"
            >
              {importing ? (
                <>
                  <span style={{
                    width: 12, height: 12, borderRadius: "50%",
                    border: "1.5px solid rgba(196,181,253,0.3)",
                    borderTopColor: "#c4b5fd",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  导入中…
                </>
              ) : (
                <>
                  <span style={{ fontSize: 14 }}>🎬</span>
                  从分镜导入
                </>
              )}
            </button>
          )}

          {/* 保存状态 */}
          <span style={{
            fontSize: 11,
            color: saveStatus === "saved"
              ? "rgba(74,222,128,0.7)"
              : "rgba(255,255,255,0.3)",
            padding: "0 4px",
          }}>
            {saveStatus === "saving" ? "● 保存中..." : "✓ 已保存"}
          </span>
        </div>
      </div>

      {/* 属性面板（固定在右侧） */}
      {panelOpen && selectedShape && (
        <ShotPropertiesPanel
          selectedShape={selectedShape}
          shapeBindings={shapeBindingsRef.current}
          projectId={projectId}
          onClose={() => {
            setPanelOpen(false);
            setSelectedShape(null);
            editor?.selectNone();
          }}
          onPropsUpdated={handlePropsUpdated}
        />
      )}

      {/* 旋转动画 CSS */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
