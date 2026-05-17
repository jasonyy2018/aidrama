"use client";

import dynamic from "next/dynamic";
import { useFullWidth } from "@/lib/hooks/use-layout";
import type { CanvasSnapshotData } from "@/types/canvas";
import type { StoryboardItem } from "@/lib/db/schema";

// tldraw 必须动态导入（使用浏览器 API）
const CanvasEditor = dynamic(() => import("@/components/canvas/canvas-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin" />
        <span className="text-sm text-white/40">加载画布引擎...</span>
      </div>
    </div>
  ),
});

interface CanvasClientPageProps {
  projectId: number;
  storyboardId: number | null;
  initialSnapshot: CanvasSnapshotData | null;
  storyboardItems: StoryboardItem[];
  storyboards: Array<{ id: number; title: string | null }>;
}

export default function CanvasClientPage({
  projectId,
  storyboardId,
  initialSnapshot,
  storyboardItems,
  storyboards,
}: CanvasClientPageProps) {
  // 画布页面需要全宽（与分镜页面一致）
  useFullWidth(true);

  return (
    // 使用 h-full 继承布局高度，遵守项目布局规范
    <div className="h-full relative">
      <CanvasEditor
        projectId={projectId}
        storyboardId={storyboardId}
        initialSnapshot={initialSnapshot}
        storyboardItems={storyboardItems}
      />
    </div>
  );
}
