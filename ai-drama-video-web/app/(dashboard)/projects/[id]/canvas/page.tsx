import { db } from "@/lib/db";
import { canvasSnapshots, storyboards, storyboardItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";
import type { CanvasSnapshotData } from "@/types/canvas";
import CanvasClientPage from "./canvas-client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ storyboardId?: string }>;
}

export default async function CanvasPage({ params, searchParams }: PageProps) {
  const { id: projectIdStr } = await params;
  const { storyboardId: storyboardIdStr } = await searchParams;
  const projectId = Number(projectIdStr);
  const storyboardId = storyboardIdStr ? Number(storyboardIdStr) : null;

  await requireUserId();

  // 并行加载：画布快照 + 分镜条目
  const [canvasRows, itemRows, storyboardRows] = await Promise.all([
    db
      .select()
      .from(canvasSnapshots)
      .where(
        and(
          eq(canvasSnapshots.projectId, projectId),
          eq(canvasSnapshots.deleted, 0)
        )
      )
      .limit(1),

    // 加载分镜条目（用于同步 ShotCard 数据）
    storyboardId
      ? db
          .select()
          .from(storyboardItems)
          .where(
            and(
              eq(storyboardItems.storyboardId, storyboardId),
              eq(storyboardItems.deleted, 0)
            )
          )
          .orderBy(storyboardItems.sortOrder)
      : Promise.resolve([]),

    // 加载项目下的分镜列表（供用户选择关联）
    db
      .select({ id: storyboards.id, title: storyboards.title })
      .from(storyboards)
      .where(
        and(
          eq(storyboards.projectId, projectId),
          eq(storyboards.deleted, 0)
        )
      ),
  ]);

  const initialSnapshot = (canvasRows[0] ?? null) as unknown as CanvasSnapshotData | null;

  return (
    <CanvasClientPage
      projectId={projectId}
      storyboardId={storyboardId}
      initialSnapshot={initialSnapshot as Parameters<typeof CanvasClientPage>[0]["initialSnapshot"]}
      storyboardItems={itemRows}
      storyboards={storyboardRows}
    />
  );
}
