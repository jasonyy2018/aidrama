import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/asset/all
 * 跨项目查询当前用户的资产列表（分页）以及各个类型的资产数量统计
 */
export async function GET(req: NextRequest) {
  try {
    let session;
    try {
      session = await requireSession();
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

    const { userId } = session;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "20", 10);
    const projectId = searchParams.get("projectId")
      ? Number(searchParams.get("projectId"))
      : undefined;
    const type = searchParams.get("type");
    const keyword = searchParams.get("keyword");

    const offset = (page - 1) * size;

    const conditions = [
      eq(assets.userId, userId),
      eq(assets.deleted, 0)
    ];

    if (projectId) {
      conditions.push(eq(assets.projectId, projectId));
    }
    if (type) {
      conditions.push(eq(assets.type, type));
    }
    if (keyword) {
      conditions.push(like(assets.name, `%${keyword}%`));
    }

    const whereClause = and(...conditions);

    // 查询分页列表
    const records = await db
      .select()
      .from(assets)
      .where(whereClause)
      .limit(size)
      .offset(offset);

    // 查询总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(whereClause);

    const total = countResult?.count ? Number(countResult.count) : 0;

    // 统计各个类型的资产数量
    const countConditions = [
      eq(assets.userId, userId),
      eq(assets.deleted, 0)
    ];
    if (projectId) {
      countConditions.push(eq(assets.projectId, projectId));
    }
    
    const counts = await db
      .select({
        type: assets.type,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(and(...countConditions))
      .groupBy(assets.type);

    const typeCounts: Record<string, number> = {};
    for (const item of counts) {
      if (item.type) {
        typeCounts[item.type] = Number(item.count);
      }
    }

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: {
        records,
        total,
        page,
        size,
        typeCounts,
      },
    });
  } catch (err) {
    logger.error("跨项目获取资产列表失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取资产列表失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
