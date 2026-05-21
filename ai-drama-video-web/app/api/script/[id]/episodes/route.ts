import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptEpisodes } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/script/[id]/episodes
 * 获取剧本下的分集列表
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const scriptId = Number(id);

    const rows = await db
      .select()
      .from(scriptEpisodes)
      .where(
        and(
          eq(scriptEpisodes.scriptId, scriptId),
          eq(scriptEpisodes.deleted, 0)
        )
      )
      .orderBy(asc(scriptEpisodes.sortOrder));

    return NextResponse.json({ code: 200, data: rows });
  } catch (err) {
    console.error("[api/script/[id]/episodes GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
