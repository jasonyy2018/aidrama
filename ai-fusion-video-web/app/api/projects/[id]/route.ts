import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * 获取项目详情
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const projectId = Number(id);

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.deleted, 0)))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ code: 404, msg: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/projects/[id] GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]
 * 更新项目信息
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const projectId = Number(id);
    const body = await req.json() as Record<string, unknown>;

    const allowedFields = ["name", "description", "artStyle", "artStyleDescription",
      "artStyleImagePrompt", "artStyleImageUrl", "coverUrl", "status"] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field];
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ code: 400, msg: "无有效更新字段" }, { status: 400 });
    }

    await db
      .update(projects)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.ownerId, userId),
          eq(projects.deleted, 0)
        )
      );

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/projects/[id] PATCH]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]
 * 软删除项目
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const projectId = Number(id);

    await db
      .update(projects)
      .set({ deleted: 1 })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.ownerId, userId),
          eq(projects.deleted, 0)
        )
      );

    return NextResponse.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    console.error("[api/projects/[id] DELETE]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
