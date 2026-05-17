import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canvasSnapshots } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ projectId: string }> };

/**
 * GET /api/canvas/[projectId]
 * 加载项目画布快照（含 shape_bindings 映射）
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const { projectId } = await ctx.params;
    const projectIdNum = Number(projectId);
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ code: 400, msg: "无效的 projectId" }, { status: 400 });
    }

    // 读取该项目最新的画布快照
    const rows = await db
      .select()
      .from(canvasSnapshots)
      .where(
        and(
          eq(canvasSnapshots.projectId, projectIdNum),
          eq(canvasSnapshots.deleted, 0)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      // 首次访问，返回空画布
      return NextResponse.json({
        code: 0,
        data: null,
        msg: "画布尚未初始化",
      });
    }

    return NextResponse.json({ code: 0, data: rows[0] });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录" }, { status: 401 });
    }
    console.error("[canvas GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/canvas/[projectId]
 * 保存（upsert）画布快照
 *
 * Body: {
 *   snapshot: object,           // tldraw 完整快照
 *   viewport?: object,          // { x, y, zoom }
 *   shapeBindings?: object,     // { [shapeId]: { type, entityId } }
 *   storyboardId?: number,
 * }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const { projectId } = await ctx.params;
    const projectIdNum = Number(projectId);
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ code: 400, msg: "无效的 projectId" }, { status: 400 });
    }

    const body = await req.json();
    const { snapshot, viewport, shapeBindings, storyboardId } = body;

    if (!snapshot) {
      return NextResponse.json({ code: 400, msg: "snapshot 不能为空" }, { status: 400 });
    }

    // 查询是否已有快照
    const existing = await db
      .select({ id: canvasSnapshots.id })
      .from(canvasSnapshots)
      .where(
        and(
          eq(canvasSnapshots.projectId, projectIdNum),
          eq(canvasSnapshots.deleted, 0)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update 现有快照
      await db
        .update(canvasSnapshots)
        .set({
          snapshot,
          viewport: viewport ?? null,
          shapeBindings: shapeBindings ?? null,
          ...(storyboardId ? { storyboardId: Number(storyboardId) } : {}),
        })
        .where(eq(canvasSnapshots.id, existing[0].id));
    } else {
      // Insert 新快照
      await db.insert(canvasSnapshots).values({
        projectId: projectIdNum,
        storyboardId: storyboardId ? Number(storyboardId) : null,
        snapshot,
        viewport: viewport ?? null,
        shapeBindings: shapeBindings ?? null,
        createdBy: session.userId,
      });
    }

    return NextResponse.json({ code: 0, msg: "保存成功" });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录" }, { status: 401 });
    }
    console.error("[canvas POST]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
