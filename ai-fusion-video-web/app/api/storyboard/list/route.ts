import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/storyboard/list?projectId=xxx
 * 获取项目下的分镜列表
 */
export async function GET(req: NextRequest) {
  try {
    try {
      await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录账号",
          data: null,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少 projectId 参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(storyboards)
      .where(
        and(
          eq(storyboards.projectId, projectId),
          eq(storyboards.deleted, 0)
        )
      )
      .orderBy(desc(storyboards.createTime));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: rows,
    });
  } catch (err) {
    logger.error("获取分镜列表失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取分镜列表失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
