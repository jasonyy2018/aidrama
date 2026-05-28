import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboardEpisodes } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession();
    const { id } = await params;
    const storyboardId = Number(id);

    const rows = await db
      .select()
      .from(storyboardEpisodes)
      .where(
        and(
          eq(storyboardEpisodes.storyboardId, storyboardId),
          eq(storyboardEpisodes.deleted, 0)
        )
      )
      .orderBy(asc(storyboardEpisodes.sortOrder));

    return NextResponse.json({ code: 0, data: rows });
  } catch (err: any) {
    console.error("[api/storyboard/[id]/episodes GET]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
