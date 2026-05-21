import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

/**
 * GET /api/script/list?projectId=xxx
 * 按项目查询剧本列表
 */
export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json({ code: 400, msg: "缺少 projectId" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(scripts)
      .where(
        and(
          eq(scripts.projectId, projectId),
          eq(scripts.deleted, 0)
        )
      )
      .orderBy(desc(scripts.updateTime));

    return NextResponse.json({ code: 200, data: rows });
  } catch (err) {
    console.error("[api/script/list GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
