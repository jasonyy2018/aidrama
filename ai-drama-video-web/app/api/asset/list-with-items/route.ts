import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/asset/list-with-items?projectId=xxx
 * 获取项目下所有的资产及其子资产
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
      .from(assets)
      .where(
        and(
          eq(assets.projectId, projectId),
          eq(assets.deleted, 0)
        )
      );

    // Drizzle schema 没有单独的 afv_asset_item 表，所以我们为前端兼容填充空 items
    const dataWithItems = rows.map((asset) => ({
      ...asset,
      items: [],
    }));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: dataWithItems,
    });
  } catch (err) {
    logger.error("获取带子项资产列表失败", err);
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
