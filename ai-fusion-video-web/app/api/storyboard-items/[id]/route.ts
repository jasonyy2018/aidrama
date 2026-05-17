import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboardItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/storyboard-items/[id]
 * 更新分镜条目字段（属性面板保存）
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || isNaN(id)) {
      return NextResponse.json({ code: 400, msg: "无效 ID" }, { status: 400 });
    }

    const body = await req.json() as Record<string, unknown>;

    // 白名单字段（防止越权修改其他字段）
    const allowedFields: Array<keyof typeof storyboardItems.$inferInsert> = [
      "content",
      "sceneExpectation",
      "shotType",
      "duration",
      "dialogue",
      "cameraMovement",
      "cameraAngle",
      "cameraEquipment",
      "focalLength",
      "transition",
      "sound",
      "soundEffect",
      "music",
      "remark",
      "videoPrompt",
    ];

    // 构建更新对象
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ code: 400, msg: "无有效更新字段" }, { status: 400 });
    }

    await db
      .update(storyboardItems)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(
        and(
          eq(storyboardItems.id, id),
          eq(storyboardItems.deleted, 0)
        )
      );

    return NextResponse.json({ code: 200, msg: "更新成功" });
  } catch (err) {
    console.error("[api/storyboard-items PATCH]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * GET /api/storyboard-items/[id]
 * 获取单条分镜条目（用于属性面板实时读取）
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();

    const { id: idStr } = await params;
    const id = Number(idStr);

    const rows = await db
      .select()
      .from(storyboardItems)
      .where(
        and(
          eq(storyboardItems.id, id),
          eq(storyboardItems.deleted, 0)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ code: 404, msg: "条目不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/storyboard-items GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
