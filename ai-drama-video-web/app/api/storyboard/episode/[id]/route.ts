import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboardEpisodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession();
    const { id } = await params;
    const episodeId = Number(id);

    const [episode] = await db
      .select()
      .from(storyboardEpisodes)
      .where(
        and(
          eq(storyboardEpisodes.id, episodeId),
          eq(storyboardEpisodes.deleted, 0)
        )
      );

    if (!episode) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: episode });
  } catch (err: any) {
    console.error("[api/storyboard/episode/[id] GET]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession();
    const { id } = await params;
    const episodeId = Number(id);

    const [deletedEpisode] = await db
      .update(storyboardEpisodes)
      .set({ deleted: 1, updateTime: new Date() })
      .where(
        and(
          eq(storyboardEpisodes.id, episodeId),
          eq(storyboardEpisodes.deleted, 0)
        )
      )
      .returning();

    if (!deletedEpisode) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: true });
  } catch (err: any) {
    console.error("[api/storyboard/episode/[id] DELETE]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
