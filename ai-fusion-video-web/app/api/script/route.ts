import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

/**
 * POST /api/script
 * 创建剧本
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as {
      projectId: number;
      title: string;
      rawContent?: string;
    };

    if (!body.projectId) {
      return NextResponse.json({ code: 400, msg: "缺少 projectId" }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ code: 400, msg: "剧本标题不能为空" }, { status: 400 });
    }

    const [newScript] = await db
      .insert(scripts)
      .values({
        projectId: body.projectId,
        title: body.title.trim(),
        rawContent: body.rawContent ?? null,
        ownerType: 1,
        ownerId: userId,
        scope: 3,
        status: 0,
      })
      .returning();

    return NextResponse.json({ code: 200, data: newScript });
  } catch (err) {
    console.error("[api/script POST]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * PUT /api/script
 * 更新剧本
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as {
      id: number;
      title?: string;
      content?: string;
      rawContent?: string;
      storySynopsis?: string;
      genre?: string;
      targetAudience?: string;
      durationEstimate?: number;
    };

    if (!body.id) {
      return NextResponse.json({ code: 400, msg: "缺少剧本 ID" }, { status: 400 });
    }

    const allowedFields = [
      "title",
      "content",
      "rawContent",
      "storySynopsis",
      "genre",
      "targetAudience",
      "durationEstimate",
    ] as const;

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ code: 400, msg: "无有效更新字段" }, { status: 400 });
    }

    updateData.updateTime = new Date();

    const [updatedScript] = await db
      .update(scripts)
      .set(updateData)
      .where(
        and(
          eq(scripts.id, body.id),
          eq(scripts.ownerId, userId),
          eq(scripts.deleted, 0)
        )
      )
      .returning();

    if (!updatedScript) {
      return NextResponse.json({ code: 404, msg: "剧本不存在或无权修改" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: updatedScript });
  } catch (err) {
    console.error("[api/script PUT]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
