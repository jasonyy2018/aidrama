import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptScenes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/script/scene/[id]
 * 获取场次详情
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const sceneId = Number(id);

    const rows = await db
      .select()
      .from(scriptScenes)
      .where(and(eq(scriptScenes.id, sceneId), eq(scriptScenes.deleted, 0)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ code: 404, msg: "场次不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/script/scene/[id] GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/script/scene/[id]
 * 软删除场次
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const sceneId = Number(id);

    const [updated] = await db
      .update(scriptScenes)
      .set({ deleted: 1, updateTime: new Date() })
      .where(
        and(
          eq(scriptScenes.id, sceneId),
          eq(scriptScenes.deleted, 0)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ code: 404, msg: "场次不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: true, msg: "删除成功" });
  } catch (err) {
    console.error("[api/script/scene/[id] DELETE]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
