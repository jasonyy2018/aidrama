import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptScenes } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/script/episode/[id]/scenes
 * 获取分集下的场次列表
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const episodeId = Number(id);

    const rows = await db
      .select()
      .from(scriptScenes)
      .where(
        and(
          eq(scriptScenes.episodeId, episodeId),
          eq(scriptScenes.deleted, 0)
        )
      )
      .orderBy(asc(scriptScenes.sortOrder));

    return NextResponse.json({ code: 0, data: rows });
  } catch (err) {
    console.error("[api/script/episode/[id]/scenes GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
