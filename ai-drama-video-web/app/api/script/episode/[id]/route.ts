import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptEpisodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/script/episode/[id]
 * 获取分集详情
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const episodeId = Number(id);

    const rows = await db
      .select()
      .from(scriptEpisodes)
      .where(and(eq(scriptEpisodes.id, episodeId), eq(scriptEpisodes.deleted, 0)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/script/episode/[id] GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/script/episode/[id]
 * 软删除分集
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const episodeId = Number(id);

    const [updated] = await db
      .update(scriptEpisodes)
      .set({ deleted: 1, updateTime: new Date() })
      .where(
        and(
          eq(scriptEpisodes.id, episodeId),
          eq(scriptEpisodes.deleted, 0)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: true, msg: "删除成功" });
  } catch (err) {
    console.error("[api/script/episode/[id] DELETE]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
