import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and, like } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/asset/list
 * 查询项目下的资产列表，支持过滤资产类型 type 和 关键词 keyword
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
    const type = searchParams.get("type");
    const keyword = searchParams.get("keyword");

    if (!projectId) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少 projectId",
          data: null,
        },
        { status: 400 }
      );
    }

    const conditions = [
      eq(assets.projectId, projectId),
      eq(assets.deleted, 0)
    ];

    if (type) {
      conditions.push(eq(assets.type, type));
    }
    if (keyword) {
      conditions.push(like(assets.name, `%${keyword}%`));
    }

    const rows = await db
      .select()
      .from(assets)
      .where(and(...conditions));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: rows,
    });
  } catch (err) {
    logger.error("获取资产列表失败", err);
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
