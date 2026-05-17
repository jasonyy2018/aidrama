import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/project/list
 * 获取当前登录用户的项目列表
 */
export async function GET() {
  try {
    let session;
    try {
      session = await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录",
          data: null,
        },
        { status: 401 }
      );
    }

    const { userId } = session;
    logger.info("获取项目列表", { userId });

    const rows = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.deleted, 0),
          eq(projects.ownerId, userId)
        )
      )
      .orderBy(desc(projects.updateTime));

    logger.info("项目列表获取成功", { count: rows.length, userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: rows,
    });
  } catch (err) {
    logger.error("获取项目列表失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，获取列表失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
