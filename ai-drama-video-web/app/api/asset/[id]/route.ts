import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/asset/[id]
 * 获取特定资产详情
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const assetId = Number(id);

    if (isNaN(assetId)) {
      return NextResponse.json(
        {
          code: 400,
          msg: "无效的 id",
          data: null,
        },
        { status: 400 }
      );
    }

    const config = await db.query.assets.findFirst({
      where: and(
        eq(assets.id, assetId),
        eq(assets.deleted, 0)
      ),
    });

    if (!config) {
      return NextResponse.json(
        {
          code: 404,
          msg: "资产不存在",
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: config,
    });
  } catch (err) {
    logger.error("获取资产详情失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取资产详情失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/asset/[id]
 * 软删除资产
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const assetId = Number(id);

    if (isNaN(assetId)) {
      return NextResponse.json(
        {
          code: 400,
          msg: "无效的 id",
          data: null,
        },
        { status: 400 }
      );
    }

    await db
      .update(assets)
      .set({ deleted: 1 })
      .where(eq(assets.id, assetId));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("删除资产失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "删除资产失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
