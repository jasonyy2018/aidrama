import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/asset
 * 创建资产
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { projectId, type, name, description, coverUrl, properties, tags } = body;

    if (!projectId || !type || !name) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少必要参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(assets)
      .values({
        projectId,
        userId,
        type,
        name,
        description: description || null,
        coverUrl: coverUrl || null,
        properties: properties ? JSON.parse(JSON.stringify(properties)) : null,
        tags: tags || null,
        sourceType: 1,
        ownerType: 1,
        ownerId: userId,
        status: 1,
        deleted: 0,
      })
      .returning();

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: inserted,
    });
  } catch (err) {
    logger.error("创建资产失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "创建资产失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/asset
 * 更新资产
 */
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { id, name, description, coverUrl, properties, tags, status } = body;

    if (!id) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少 id 参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    if (properties !== undefined) updateData.properties = properties;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;

    await db
      .update(assets)
      .set(updateData)
      .where(eq(assets.id, id));

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, id),
    });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: updated,
    });
  } catch (err) {
    logger.error("更新资产失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "更新资产失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
