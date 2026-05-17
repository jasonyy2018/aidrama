import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboardItems } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/storyboards/[id]/items
 * 获取分镜下的全部条目（供画布批量导入使用）
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const storyboardId = Number(id);

    const rows = await db
      .select()
      .from(storyboardItems)
      .where(
        and(
          eq(storyboardItems.storyboardId, storyboardId),
          eq(storyboardItems.deleted, 0)
        )
      )
      .orderBy(asc(storyboardItems.sortOrder), asc(storyboardItems.id));

    return NextResponse.json({ code: 200, data: rows });
  } catch (err) {
    console.error("[api/storyboards/[id]/items GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
