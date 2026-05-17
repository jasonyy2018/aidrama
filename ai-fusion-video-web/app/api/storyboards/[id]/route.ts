import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/storyboards/[id]
 * 获取分镜详情
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;

    const rows = await db
      .select()
      .from(storyboards)
      .where(and(eq(storyboards.id, Number(id)), eq(storyboards.deleted, 0)))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ code: 404, msg: "分镜不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/storyboards/[id] GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/storyboards/[id]
 * 更新分镜信息
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;

    const allowedFields = ["title", "description", "status"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (f in body) updateData[f] = body[f];
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ code: 400, msg: "无有效更新字段" }, { status: 400 });
    }

    await db
      .update(storyboards)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(and(eq(storyboards.id, Number(id)), eq(storyboards.deleted, 0)));

    const rows = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, Number(id)))
      .limit(1);

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/storyboards/[id] PATCH]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/storyboards/[id]
 * 软删除分镜
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;

    await db
      .update(storyboards)
      .set({ deleted: 1 })
      .where(and(eq(storyboards.id, Number(id)), eq(storyboards.deleted, 0)));

    return NextResponse.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    console.error("[api/storyboards/[id] DELETE]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
