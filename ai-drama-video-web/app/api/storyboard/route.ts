import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/storyboard
 * 创建分镜表
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
    const { projectId, title, description, scriptId } = body;

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

    const [inserted] = await db
      .insert(storyboards)
      .values({
        projectId,
        title: title || "未命名分镜",
        description: description || null,
        scriptId: scriptId || null,
        ownerType: 1,
        ownerId: userId,
        scope: 3,
        status: 0,
        deleted: 0,
      })
      .returning();

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: inserted,
    });
  } catch (err) {
    logger.error("创建分镜失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "创建分镜失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storyboard
 * 更新分镜信息
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
    const { id, title, description, status } = body;

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
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    await db
      .update(storyboards)
      .set(updateData)
      .where(eq(storyboards.id, id));

    const updated = await db.query.storyboards.findFirst({
      where: eq(storyboards.id, id),
    });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: updated,
    });
  } catch (err) {
    logger.error("更新分镜失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "更新分镜失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
