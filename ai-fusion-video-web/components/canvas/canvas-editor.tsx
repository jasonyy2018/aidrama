"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tldraw, Editor, TLStoreSnapshot, useEditor, createShapeId,
} from "tldraw";
import "tldraw/tldraw.css";
import { ShotCardShapeUtil } from "./shapes/shot-card-shape";
import type { ShotCardShape } from "./shapes/shot-card-shape";
import { CharacterAnchorShapeUtil } from "./shapes/character-anchor-shape";
import { ScriptShapeUtil } from "./shapes/script-shape";
import { ScriptPlanShapeUtil } from "./shapes/script-plan-shape";
import { StoryboardTableShapeUtil } from "./shapes/storyboard-table-shape";
import { StoryboardGridShapeUtil } from "./shapes/storyboard-grid-shape";
import { WorkbenchShapeUtil } from "./shapes/workbench-shape";
import { AssetsListShapeUtil } from "./shapes/assets-list-shape";
import type { ShapeBindings, CanvasSnapshotData, ShotCardShapeProps } from "@/types/canvas";
import type { StoryboardItem } from "@/lib/db/schema";
import { useCanvasDataStore } from "@/lib/store/canvas-data-store";
import { PIPELINE_NODE_IDS } from "@/types/pipeline";
import type { AgentTagEvent } from "./utils/parse-agent-tags";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";

const ShotPropertiesPanel = dynamic(() => import("./shot-properties-panel"), { ssr: false });
const CanvasAgentChat = dynamic(() => import("./panels/agent-chat"), { ssr: false });
const WorkbenchDialog = dynamic(() => import("./panels/workbench-dialog"), { ssr: false });
const ImageEditCanvas = dynamic(() => import("./panels/image-edit-canvas"), { ssr: false });
const SyncedCanvas = dynamic(() => import("@/multiplayer/synced-canvas").then(m => ({ default: m.SyncedCanvas })), { ssr: false });

const CUSTOM_SHAPE_UTILS = [
  ShotCardShapeUtil, CharacterAnchorShapeUtil,
  ScriptShapeUtil, ScriptPlanShapeUtil, StoryboardTableShapeUtil,
  StoryboardGridShapeUtil, WorkbenchShapeUtil, AssetsListShapeUtil,
];

const PIPELINE_DEFS = [
  { id: PIPELINE_NODE_IDS.script, type: "script" as const, x: -600, y: -100 },
  { id: PIPELINE_NODE_IDS.assets, type: "assets" as const, x: -200, y: -280 },
  { id: PIPELINE_NODE_IDS.scriptPlan, type: "scriptPlan" as const, x: -200, y: 80 },
  { id: PIPELINE_NODE_IDS.storyboardTable, type: "storyboardTable" as const, x: 200, y: -100 },
  { id: PIPELINE_NODE_IDS.storyboard, type: "storyboard" as const, x: 650, y: -100 },
  { id: PIPELINE_NODE_IDS.workbench, type: "workbench" as const, x: 1100, y: -100 },
];

interface AssetItem {
  id: number;
  type: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
}

interface CanvasEditorProps {
  projectId: number;
  storyboardId?: number | null;
  initialSnapshot: CanvasSnapshotData | null;
  storyboardItems?: StoryboardItem[];
  onSaved?: () => void;
}

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
    generationStatus: item.generatedVideoUrl ? "done" : item.generatedImageUrl ? "done" : "idle",
    episodeTitle: "",
    sceneHeading: "",
    imageModelId: null, videoModelId: null, imageModelName: "", videoModelName: "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPipelineArrow(editor: Editor, fromId: string, toId: string): void {
  const fromBounds = (editor as any).getShapePageBounds(fromId);
  const toBounds = (editor as any).getShapePageBounds(toId);
  if (!fromBounds || !toBounds) return;

  const arrowId = createShapeId();
  (editor as any).createShape({
    id: arrowId,
    type: "arrow",
    x: 0, y: 0,
    props: {
      color: "grey",
      start: { x: fromBounds.maxX, y: fromBounds.midY },
      end: { x: toBounds.minX, y: toBounds.midY },
      arrowheadStart: "none",
      arrowheadEnd: "arrow",
      bend: 0,
    },
  });
}

// ============================================================
// 自动保存 Hook
// ============================================================
function useAutoSave(
  editor: Editor | null, projectId: number, storyboardId: number | null | undefined,
  shapeBindingsRef: React.MutableRefObject<ShapeBindings>,
  setSaveStatus: (s: "saved" | "saving" | "unsaved") => void, onSaved?: () => void,
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const retryRef = useRef(0);

  const save = useCallback(async () => {
    if (!editor || isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus("saving");
    retryRef.current = 0;
    try {
      const snapshot = editor.store.serialize();
      const viewport = editor.getCamera();
      const res = await fetch(`/api/canvas/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot, viewport, shapeBindings: shapeBindingsRef.current, storyboardId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveStatus("saved");
      onSaved?.();
    } catch (err) {
      console.error("[canvas] 自动保存失败", err);
      setSaveStatus("unsaved");
    }
    finally { isSavingRef.current = false; }
  }, [editor, projectId, storyboardId, shapeBindingsRef, setSaveStatus, onSaved]);

  const scheduleAutoSave = useCallback(() => {
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save, setSaveStatus]);

  useEffect(() => {
    if (!editor) return;
    const unsubscribe = editor.store.listen(scheduleAutoSave, { source: "user", scope: "document" });
    return () => { unsubscribe(); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [editor, scheduleAutoSave]);

  return { save };
}

// ============================================================
// 初始化管线节点
// ============================================================
function initPipelineNodes(editor: Editor) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (editor as any).getCurrentPageShapes();
  const hasPipeline = existing.some((s: any) => PIPELINE_DEFS.some(p => s.id === p.id));
  if (hasPipeline) return;

  const store = useCanvasDataStore.getState();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editor as any).run(() => {
    for (const def of PIPELINE_DEFS) {

      let w = 300, h = 220;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let extraProps: Record<string, unknown> = {};

      if (def.type === "script") { w = 320; h = 280; extraProps = store.script as Record<string, unknown>; }
      else if (def.type === "assets") { w = 300; h = 300; extraProps = { ...store.assets, loading: false } as Record<string, unknown>; }
      else if (def.type === "scriptPlan") { w = 280; h = 260; extraProps = { ...store.scriptPlan, loading: false } as Record<string, unknown>; }
      else if (def.type === "storyboardTable") { w = 360; h = 320; extraProps = { ...store.storyboardTable, loading: false } as Record<string, unknown>; }
      else if (def.type === "storyboard") { w = 380; h = 340; extraProps = { ...store.storyboard, loading: false } as Record<string, unknown>; }
      else if (def.type === "workbench") { w = 280; h = 300; extraProps = { ...store.workbench, loading: false } as Record<string, unknown>; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).createShape({
        id: def.id,
        type: def.type,
        x: def.x, y: def.y,
        props: { w, h, ...extraProps },
      });
    }

    // 创建箭头连接
    const arrows: Array<[string, string]> = [
      [PIPELINE_NODE_IDS.script, PIPELINE_NODE_IDS.assets],
      [PIPELINE_NODE_IDS.script, PIPELINE_NODE_IDS.scriptPlan],
      [PIPELINE_NODE_IDS.scriptPlan, PIPELINE_NODE_IDS.storyboardTable],
      [PIPELINE_NODE_IDS.assets, PIPELINE_NODE_IDS.storyboardTable],
      [PIPELINE_NODE_IDS.storyboardTable, PIPELINE_NODE_IDS.storyboard],
      [PIPELINE_NODE_IDS.storyboard, PIPELINE_NODE_IDS.workbench],
    ];
    for (const [from, to] of arrows) {
      createPipelineArrow(editor, from, to);
    }

    editor.zoomToFit();
  });
}

// ============================================================
// 同步管线数据
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function syncPipelineData(editor: Editor) {
  const store = useCanvasDataStore.getState();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Array<{ id: string; type: string; props: Record<string, unknown> }> = [];

  const scriptShape = (editor as any).getShape(PIPELINE_NODE_IDS.script);
  if (scriptShape) updates.push({ id: PIPELINE_NODE_IDS.script, type: "script", props: store.script as Record<string, unknown> });

  const assetsShape = (editor as any).getShape(PIPELINE_NODE_IDS.assets);
  if (assetsShape) updates.push({ id: PIPELINE_NODE_IDS.assets, type: "assets", props: { ...store.assets, loading: false } as Record<string, unknown> });

  const scriptPlanShape = (editor as any).getShape(PIPELINE_NODE_IDS.scriptPlan);
  if (scriptPlanShape) updates.push({ id: PIPELINE_NODE_IDS.scriptPlan, type: "scriptPlan", props: { ...store.scriptPlan, loading: false } as Record<string, unknown> });

  const tableShape = (editor as any).getShape(PIPELINE_NODE_IDS.storyboardTable);
  if (tableShape) updates.push({ id: PIPELINE_NODE_IDS.storyboardTable, type: "storyboardTable", props: { ...store.storyboardTable, loading: false } as Record<string, unknown> });

  const gridShape = (editor as any).getShape(PIPELINE_NODE_IDS.storyboard);
  if (gridShape) updates.push({ id: PIPELINE_NODE_IDS.storyboard, type: "storyboard", props: { ...store.storyboard, loading: false } as Record<string, unknown> });

  const wbShape = (editor as any).getShape(PIPELINE_NODE_IDS.workbench);
  if (wbShape) updates.push({ id: PIPELINE_NODE_IDS.workbench, type: "workbench", props: { ...store.workbench, loading: false } as Record<string, unknown> });

  if (updates.length > 0) (editor as any).updateShapes(updates);
}

// ============================================================
// 加载管线数据（从 API）
// ============================================================
async function fetchWithRetry(url: string, retries = 2, delayMs = 1000): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (i < retries) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    } catch {
      if (i >= retries) throw new Error(`Failed to fetch ${url}`);
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function loadPipelineData(projectId: number, storyboardId: number | null | undefined, editor: Editor) {
  const store = useCanvasDataStore.getState();

  try {
    const scriptRes = await fetchWithRetry(`/api/projects/${projectId}/scripts`);
    const scriptData = await scriptRes.json();
    if (scriptData.code === 200 && scriptData.data) {
      store.setScript({ scriptId: scriptData.data.id, title: scriptData.data.title ?? "", content: scriptData.data.content ?? "", episodeCount: scriptData.data.episodeCount ?? 0 });
    }
  } catch { /* silently ignore - data may be loaded later */ }

  try {
    const assetsRes = await fetchWithRetry(`/api/projects/${projectId}/assets?type=character,scene,prop`);
    const assetsData = await assetsRes.json();
    if (assetsData.code === 200 && assetsData.data) {
      store.setAssets({ assets: assetsData.data, loading: false });
    }
  } catch { /* ignore */ }

  if (storyboardId) {
    try {
      const planRes = await fetchWithRetry(`/api/storyboards/${storyboardId}/plan`);
      const planData = await planRes.json();
      if (planData.code === 200) {
        store.setScriptPlan({ content: planData.data?.content ?? planData.data ?? "", loading: false });
      }
    } catch { /* ignore */ }

    try {
      const itemsRes = await fetchWithRetry(`/api/storyboards/${storyboardId}/items`);
      const itemsData = await itemsRes.json();
      if (itemsData.code === 200 && itemsData.data) {
        store.setStoryboard({ storyboardId, items: itemsData.data.map((i: StoryboardItem) => ({
          id: i.id, shotNumber: i.shotNumber ?? i.autoShotNumber ?? String(i.sortOrder ?? ""),
          content: i.content ?? "", imageUrl: null,
          generatedImageUrl: i.generatedImageUrl ?? null, videoUrl: i.videoUrl ?? null,
          generatedVideoUrl: i.generatedVideoUrl ?? null, shotType: i.shotType ?? "中景",
          duration: i.duration ?? "3", generationStatus: i.generatedVideoUrl ? "done" : i.generatedImageUrl ? "done" : "idle",
          imageModelId: null, videoModelId: null, imageModelName: "", videoModelName: "",
        })), loading: false });
        store.setStoryboardTable({ storyboardId, shotCount: itemsData.data.length, loading: false, tableMarkdown: `${itemsData.data.length} 个镜头待生成分镜表` });
      }
    } catch { /* ignore */ }
  }

  try {
    const episodesRes = await fetchWithRetry(`/api/storyboards/${storyboardId}/episodes`);
    const episodesJson = await episodesRes.json() as { code: number; data: Array<{ id: number; episodeNumber: number | null; title: string | null; composedVideoUrl: string | null; composeStatus: number }> };
    const episodes = episodesJson.data ?? [];
    store.setWorkbench({ episodes: episodes.map((ep) => ({
      id: ep.id, episodeNumber: ep.episodeNumber ?? 0, title: ep.title ?? "",
      composedVideoUrl: ep.composedVideoUrl, composeStatus: ep.composeStatus === 0 ? "idle" : ep.composeStatus === 1 ? "processing" : ep.composeStatus === 2 ? "done" : "error",
    })), loading: false });
  } catch { /* ignore */ }

  syncPipelineData(editor);
}

// ============================================================
// 内层组件
// ============================================================
function InnerCanvas({
  projectId, storyboardId, storyboardItems = [], shapeBindingsRef,
  onSaved, onSelectionChange, onImportItems, onTagEvent, setSaveStatus,
}: {
  projectId: number; storyboardId?: number | null; storyboardItems?: StoryboardItem[];
  shapeBindingsRef: React.MutableRefObject<ShapeBindings>;
  onSaved?: () => void;
  onSelectionChange: (shape: ShotCardShape | null) => void;
  onImportItems: (items: StoryboardItem[]) => void;
  onTagEvent: (events: AgentTagEvent[]) => void;
  setSaveStatus: (s: "saved" | "saving" | "unsaved") => void;
}) {
  const editor = useEditor();
  const { save } = useAutoSave(editor, projectId, storyboardId, shapeBindingsRef, setSaveStatus, onSaved);
 
  useEffect(() => {
    if (!editor) return;
    (editor as unknown as { _importItems?: (items: StoryboardItem[]) => void })._importItems =
      (items: StoryboardItem[]) => {
        const CARD_W = 280, CARD_H = 340, COLS = Math.min(Math.ceil(Math.sqrt(items.length)), 5), GAP = 24;
        const center = editor.getViewportPageBounds().center;
        const totalW = COLS * CARD_W + (COLS - 1) * GAP;
        const startX = center.x - totalW / 2, startY = center.y - 100;
        const defaultProps = { w: 280, h: 340, storyboardItemId: null, shotNumber: "", content: "", sceneExpectation: "", generatedImageUrl: null, videoUrl: null, generatedVideoUrl: null, shotType: "中景", duration: "3", dialogue: "", cameraMovement: "", generationStatus: "idle" as const, episodeTitle: "", sceneHeading: "", imageModelId: null, videoModelId: null, imageModelName: "", videoModelName: "" };

        (editor as any).run(() => {
          items.forEach((item, idx) => {
            const col = idx % COLS, row = Math.floor(idx / COLS);
            const x = startX + col * (CARD_W + GAP), y = startY + row * (CARD_H + GAP);
            const shapeId = createShapeId();
            (editor as any).createShape({ id: shapeId, type: "shot-card", x, y, props: { ...defaultProps, ...itemToShotCardProps(item) } });
            shapeBindingsRef.current[shapeId] = { type: "storyboard_item", entityId: item.id };
          });
        });
      };
  }, [editor, shapeBindingsRef]);

  useEffect(() => { onTagEvent; }, [onTagEvent]);

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
    const unsubscribe = editor.store.listen(handleSelectionChange, { source: "user", scope: "session" });
    return () => unsubscribe();
  }, [editor, onSelectionChange]);

  useEffect(() => {
    if (!editor || storyboardItems.length === 0) return;
    const existingShapes = editor.getCurrentPageShapes().filter(s => (s.type as string) === "shot-card");
    const updates: Array<{ id: string; type: "shot-card"; props: Partial<ShotCardShapeProps> }> = [];
    for (const shape of existingShapes) {
      const binding = shapeBindingsRef.current[shape.id];
      if (!binding || binding.type !== "storyboard_item") continue;
      const item = storyboardItems.find(i => i.id === binding.entityId);
      if (!item) continue;
      updates.push({ id: shape.id, type: "shot-card" as const, props: itemToShotCardProps(item) });
    }
    if (updates.length > 0) (editor as any).updateShapes(updates);
  }, [editor, storyboardItems, shapeBindingsRef]);

  void save;
  void onImportItems;

  return null;
}

// ============================================================
// 主组件
// ============================================================
export default function CanvasEditor({
  projectId, storyboardId, initialSnapshot, storyboardItems = [], onSaved,
}: CanvasEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const shapeBindingsRef = useRef<ShapeBindings>((initialSnapshot?.shapeBindings as ShapeBindings) ?? {});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [selectedShape, setSelectedShape] = useState<ShotCardShape | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingAssets, setImportingAssets] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [conversationId] = useState(() => `canvas_${projectId}_${Date.now()}`);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [imageEditOpen, setImageEditOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<{ url: string; storyboardItemId: number | null } | null>(null);
  const [syncMode, setSyncMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const pipelineLoadedRef = useRef(false);

  const handleSelectionChange = useCallback((shape: ShotCardShape | null) => {
    setSelectedShape(shape);
    if (shape) setPanelOpen(true);
  }, []);

  const handlePropsUpdated = useCallback((shapeId: string, props: Partial<ShotCardShape["props"]>) => {
    if (!editor) return;
    (editor as any).updateShapes([{ id: shapeId, type: "shot-card", props }]);
  }, [editor]);

  const handleImportFromStoryboard = useCallback(async () => {
    if (!editor || !storyboardId || importing) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/storyboards/${storyboardId}/items`);
      const data = await res.json() as { code: number; data: StoryboardItem[] };
      if (data.code !== 200 || !data.data?.length) return;
      const items = data.data;
      const existingEntityIds = new Set(Object.values(shapeBindingsRef.current).filter(b => b.type === "storyboard_item").map(b => b.entityId));
      const newItems = items.filter(item => !existingEntityIds.has(item.id));
      if (newItems.length === 0) { alert("所有分镜条目已在画布中"); return; }
      type EditorWithImport = Editor & { _importItems?: (items: StoryboardItem[]) => void };
      (editor as EditorWithImport)._importItems?.(newItems);
    } catch (err) { console.error("[canvas] 导入失败", err); }
    finally { setImporting(false); }
  }, [editor, storyboardId, importing, shapeBindingsRef]);

  const handleImportAssets = useCallback(async () => {
    if (!editor || importingAssets) return;
    setImportingAssets(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assets?type=character,scene,prop`);
      const data = await res.json() as { code: number; data: AssetItem[] };
      if (data.code !== 200 || !data.data?.length) return;
      const existingEntityIds = new Set(Object.values(shapeBindingsRef.current).filter(b => b.type === "asset").map(b => b.entityId));
      const newAssets = data.data.filter(a => !existingEntityIds.has(a.id));
      if (newAssets.length === 0) { alert("所有素材已在画布中"); return; }
      const center = editor.getViewportPageBounds().center;
      const COLS = Math.min(Math.ceil(Math.sqrt(newAssets.length)), 4), CARD_W = 180, CARD_H = 64, GAP = 16;
      const totalW = COLS * CARD_W + (COLS - 1) * GAP;
      const startX = center.x - totalW / 2, startY = center.y - 50;
      editor.run(() => {
        newAssets.forEach((asset, idx) => {
          const col = idx % COLS, row = Math.floor(idx / COLS);
          const x = startX + col * (CARD_W + GAP), y = startY + row * (CARD_H + GAP) + 200;
          const shapeId = createShapeId();
          editor.createShape({ id: shapeId, type: "character-anchor" as any, x, y, props: { w: CARD_W, h: CARD_H, assetId: asset.id, name: asset.name, coverUrl: asset.coverUrl, description: asset.description ?? "", assetType: asset.type } });
          shapeBindingsRef.current[shapeId] = { type: "asset", entityId: asset.id };
        });
      });
    } catch (err) { console.error("[canvas] 导入素材失败", err); }
    finally { setImportingAssets(false); }
  }, [editor, projectId, importingAssets, shapeBindingsRef]);

  const handleSyncToggle = useCallback(async () => {
    if (syncMode) {
      setSyncMode(false);
      return;
    }
    if (!editor) return;
    setSyncing(true);
    try {
      const snapshot = (editor.store as any).getSnapshot();
      const roomId = `project_${projectId}`;
      const { initSyncRoom } = await import("@/multiplayer/use-sync-store");
      await initSyncRoom(roomId, snapshot);
      setSyncMode(true);
    } catch (err) {
      console.error("[canvas] 同步房间初始化失败", err);
    } finally {
      setSyncing(false);
    }
  }, [editor, projectId, syncMode]);

  const handleSyncedMount = useCallback((ed: any) => {
    setEditor(ed);
    if (initialSnapshot?.viewport) {
      const { x, y, zoom } = initialSnapshot.viewport as { x: number; y: number; zoom: number };
      ed.setCamera({ x, y, z: zoom });
    }
    ed.zoomToFit();
  }, [initialSnapshot]);

  const handleZoomToFit = useCallback(() => { editor?.zoomToFit(); }, [editor]);

  const handleOrganizeLayout = useCallback(() => {
    if (!editor) return;
    const shapes = editor.getCurrentPageShapes();
    if (shapes.length === 0) return;
    const shotCards = shapes.filter(s => (s.type as string) === "shot-card");
    const anchors = shapes.filter(s => (s.type as string) === "character-anchor");
    const others = shapes.filter(s => !["shot-card", "character-anchor"].includes(s.type as string));
    const GAP = 24, startX = -400, startY = -300, maxWidth = 1400;
    let currentX = startX, currentY = startY;
    editor.run(() => {
      const updates: Array<{ id: string; type: string; x: number; y: number }> = [];
      const placeShape = (shape: { id: string; type: string; x: number; y: number }, w: number) => {
        if (currentX + w > startX + maxWidth) { currentX = startX; currentY += 380; }
        updates.push({ id: shape.id, type: shape.type, x: currentX, y: currentY });
        currentX += w + GAP;
      };
      shotCards.forEach(s => placeShape(s, 280));
      currentX = startX; currentY += 420;
      anchors.forEach(a => placeShape(a, 180));
      currentX = startX; currentY += 120;
      others.forEach(o => placeShape(o, 200));
      (editor as any).updateShapes(updates);
      editor.zoomToFit();
    });
  }, [editor]);

  const handleAgentTagEvent = useCallback((events: AgentTagEvent[]) => {
    if (!editor) return;
    for (const evt of events) {
      if (evt.tag === "script") {
        useCanvasDataStore.getState().setScript({ content: evt.content, title: evt.content.split("\n")[0]?.replace(/^[#\s]*/, "").slice(0, 50) ?? "", episodeCount: (evt.content.match(/第.*集/g)?.length ?? 1) });
      } else if (evt.tag === "scriptPlan") {
        useCanvasDataStore.getState().setScriptPlan({ content: evt.content, loading: false });
      } else if (evt.tag === "storyboardTable") {
        useCanvasDataStore.getState().setStoryboardTable({ tableMarkdown: evt.content, shotCount: (evt.content.match(/\|.*\|/g)?.length ?? 0) - 1, loading: false });
      } else if (evt.tag === "storyboardItem") {
        try {
          const item = JSON.parse(evt.content);
          useCanvasDataStore.getState().setStoryboard({ items: [item], loading: false });
        } catch { /* ignore */ }
      }
    }
    syncPipelineData(editor);
  }, [editor]);

  const handleMount = useCallback((ed: Editor) => {
    setEditor(ed);

    if (initialSnapshot?.snapshot) {
      try {
        let snapshot = initialSnapshot.snapshot;
        if (snapshot && typeof snapshot === "object") {
          const snapshotStr = JSON.stringify(snapshot);
          const migratedStr = snapshotStr.replace(/"pipeline-(script|assets|scriptPlan|storyboardTable|storyboard|workbench)"/g, '"shape:pipeline-$1"');
          snapshot = JSON.parse(migratedStr);
        }
        ed.loadSnapshot(snapshot as TLStoreSnapshot);
      }
      catch (err) { console.warn("[canvas] 快照恢复失败，使用空画布", err); }
    }

    if (initialSnapshot?.viewport) {
      const { x, y, zoom } = initialSnapshot.viewport as { x: number; y: number; zoom: number };
      ed.setCamera({ x, y, z: zoom });
    }

    // 初始化管线 + 加载数据
    initPipelineNodes(ed);
    if (!pipelineLoadedRef.current) {
      pipelineLoadedRef.current = true;
      loadPipelineData(projectId, storyboardId, ed);
    }
  }, [initialSnapshot, projectId, storyboardId]);

  return (
    <ErrorBoundary>
      <div style={{
        position: "absolute", inset: 0,
        right: panelOpen && selectedShape ? 320 : agentChatOpen ? 340 : 0,
        transition: "right 0.2s ease",
      }}>
          {syncMode ? (
            <SyncedCanvas
              projectId={projectId}
              shapeUtils={CUSTOM_SHAPE_UTILS as any}
              onMount={handleSyncedMount}
            >
              {editor ? (
                <InnerCanvas
                  projectId={projectId} storyboardId={storyboardId}
                  storyboardItems={storyboardItems} shapeBindingsRef={shapeBindingsRef}
                  onSaved={() => { setSaveStatus("saved"); onSaved?.(); }}
                  onSelectionChange={handleSelectionChange}
                  onImportItems={() => {}}
                  onTagEvent={handleAgentTagEvent}
                  setSaveStatus={setSaveStatus}
                />
              ) : null}
            </SyncedCanvas>
          ) : (
            <Tldraw
              shapeUtils={CUSTOM_SHAPE_UTILS}
              onMount={handleMount}
              hideUi={false}
            >
              {editor ? (
                <InnerCanvas
                  projectId={projectId} storyboardId={storyboardId}
                  storyboardItems={storyboardItems} shapeBindingsRef={shapeBindingsRef}
                  onSaved={() => { setSaveStatus("saved"); onSaved?.(); }}
                  onSelectionChange={handleSelectionChange}
                  onImportItems={() => {}}
                  onTagEvent={handleAgentTagEvent}
                  setSaveStatus={setSaveStatus}
                />
              ) : null}
            </Tldraw>
          )}

        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(20,20,28,0.85)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
          padding: "6px 10px", zIndex: 500, pointerEvents: "all",
        }}>
          {storyboardId && (
            <button onClick={handleImportFromStoryboard} disabled={importing} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
              border: "1px solid rgba(139,92,246,0.3)", background: importing ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.12)",
              color: importing ? "rgba(196,181,253,0.4)" : "#c4b5fd", fontSize: 12, fontWeight: 500,
              cursor: importing ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
            }}>
              {importing ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid rgba(196,181,253,0.3)", borderTopColor: "#c4b5fd", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                : <span style={{ fontSize: 14 }}>🎬</span>}
              {importing ? "导入中…" : "分镜"}
            </button>
          )}

          <button onClick={handleImportAssets} disabled={importingAssets} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: "1px solid rgba(52,211,153,0.3)", background: importingAssets ? "rgba(52,211,153,0.05)" : "rgba(52,211,153,0.12)",
            color: importingAssets ? "rgba(52,211,153,0.4)" : "#34d399", fontSize: 12, fontWeight: 500,
            cursor: importingAssets ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          }}>
            {importingAssets ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              : <span style={{ fontSize: 14 }}>📦</span>}
            {importingAssets ? "导入中…" : "素材"}
          </button>

          <button onClick={handleSyncToggle} disabled={syncing} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${syncMode ? "rgba(74,222,128,0.5)" : syncing ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.15)"}`,
            background: syncMode ? "rgba(74,222,128,0.12)" : syncing ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
            color: syncMode ? "#4ade80" : syncing ? "#fbbf24" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500,
            cursor: syncing ? "not-allowed" : "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          }}>
            {syncing ? (
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid rgba(251,191,36,0.3)", borderTopColor: "#fbbf24", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <span style={{ fontSize: 14 }}>{syncMode ? "🌐" : "📡"}</span>
            )}
            {syncing ? "连接中..." : syncMode ? "多人" : "连线"}
          </button>

          <button onClick={() => setAgentChatOpen(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${agentChatOpen ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.15)"}`,
            background: agentChatOpen ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
            color: agentChatOpen ? "#fbbf24" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            {agentChatOpen ? "关闭 AI" : "AI 助手"}
          </button>

          <button onClick={() => setWorkbenchOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: "1px solid rgba(244,114,182,0.3)",
            background: "rgba(244,114,182,0.1)", color: "#f9a8d4",
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14 }}>🎬</span>
            装配
          </button>

          <button onClick={() => {
            const selected = editor?.getSelectedShapes();
            const shotCard = selected?.find(s => (s.type as string) === "shot-card");
            if (shotCard) {
              const props = (shotCard as any).props;
              const imgUrl = props?.generatedImageUrl || props?.videoUrl || null;
              if (imgUrl) {
                setEditingImage({ url: imgUrl, storyboardItemId: props?.storyboardItemId ?? null });
                setImageEditOpen(true);
                return;
              }
            }
            alert("请选中一个已生成图片的镜头卡片");
          }} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
            border: "1px solid rgba(52,211,153,0.3)",
            background: "rgba(52,211,153,0.1)", color: "#6ee7b7",
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14 }}>🎨</span>
            修图
          </button>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

          <button onClick={handleZoomToFit} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
            borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,0.6)",
            fontSize: 14, cursor: "pointer",
          }} title="缩放至适应">⊞</button>

          <button onClick={handleOrganizeLayout} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
            borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,0.6)",
            fontSize: 14, cursor: "pointer",
          }} title="自动排列">⊡</button>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

          <span style={{ fontSize: 11, color: saveStatus === "saved" ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.3)", padding: "0 4px", whiteSpace: "nowrap" }}>
            {saveStatus === "saving" ? "● 保存中..." : "✓ 已保存"}
          </span>
        </div>
      </div>

      {panelOpen && selectedShape && (
        <ShotPropertiesPanel
          selectedShape={selectedShape}
          shapeBindings={shapeBindingsRef.current}
          projectId={projectId}
          onClose={() => { setPanelOpen(false); setSelectedShape(null); editor?.selectNone(); }}
          onPropsUpdated={handlePropsUpdated}
        />
      )}

      <CanvasAgentChat
        open={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
        conversationId={conversationId}
        projectId={projectId}
        storyboardId={storyboardId ?? null}
        onTagEvents={handleAgentTagEvent}
        canvasContext={{
          scriptContent: useCanvasDataStore.getState().script.content,
          assetsCount: useCanvasDataStore.getState().assets.assets.length,
          scriptPlanContent: useCanvasDataStore.getState().scriptPlan.content,
          shotCount: useCanvasDataStore.getState().storyboard.items.length,
        }}
      />

      <WorkbenchDialog
        open={workbenchOpen}
        projectId={projectId}
        storyboardId={storyboardId ?? null}
        onClose={() => setWorkbenchOpen(false)}
        onEpisodesUpdated={(eps) => {
          const store = useCanvasDataStore.getState();
          store.setWorkbench({ episodes: eps, loading: false });
          syncPipelineData(editor!);
        }}
      />

      <ImageEditCanvas
        open={imageEditOpen}
        imageUrl={editingImage?.url ?? null}
        storyboardItemId={editingImage?.storyboardItemId ?? null}
        onClose={() => { setImageEditOpen(false); setEditingImage(null); }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.6); } }`}</style>
    </ErrorBoundary>
  );
}
