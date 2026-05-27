import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/script/[id]
 * 获取剧本详情
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const scriptId = Number(id);

    const rows = await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, scriptId), eq(scripts.deleted, 0)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ code: 404, msg: "剧本不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: rows[0] });
  } catch (err) {
    console.error("[api/script/[id] GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/script/[id]
 * 软删除剧本
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const scriptId = Number(id);

    const [updated] = await db
      .update(scripts)
      .set({ deleted: 1, updateTime: new Date() })
      .where(
        and(
          eq(scripts.id, scriptId),
          eq(scripts.ownerId, userId),
          eq(scripts.deleted, 0)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ code: 404, msg: "剧本不存在或无权删除" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: true, msg: "删除成功" });
  } catch (err) {
    console.error("[api/script/[id] DELETE]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
