import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboards, storyboardItems } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

/**
 * GET /api/storyboards?projectId=xxx
 * 获取项目下的分镜列表
 */
export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));

    if (!projectId) {
      return NextResponse.json({ code: 400, msg: "缺少 projectId" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(storyboards)
      .where(and(eq(storyboards.projectId, projectId), eq(storyboards.deleted, 0)))
      .orderBy(desc(storyboards.createTime));

    return NextResponse.json({ code: 200, data: rows });
  } catch (err) {
    console.error("[api/storyboards GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/storyboards
 * 创建分镜表
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as {
      projectId: number;
      title?: string;
      description?: string;
      scriptId?: number;
    };

    if (!body.projectId) {
      return NextResponse.json({ code: 400, msg: "缺少 projectId" }, { status: 400 });
    }

    const [result] = await db.insert(storyboards).values({
      projectId: body.projectId,
      title: body.title ?? "未命名分镜",
      description: body.description ?? null,
      scriptId: body.scriptId ?? null,
      ownerType: 1,
      ownerId: userId,
      scope: 3,
      status: 0,
    });

    const newId = (result as unknown as { insertId: number }).insertId;
    const rows = await db
      .select()
      .from(storyboards)
      .where(eq(storyboards.id, newId))
      .limit(1);

    return NextResponse.json({ code: 200, data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[api/storyboards POST]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
