import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

/**
 * GET /api/projects
 * 获取当前用户的项目列表
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.deleted, 0),
          or(
            // 个人项目
            and(eq(projects.ownerType, 1), eq(projects.ownerId, userId)),
            // 公开项目（scope=1）暂不过滤
          )
        )
      )
      .orderBy(desc(projects.updateTime));

    return NextResponse.json({ code: 200, data: rows });
  } catch (err) {
    console.error("[api/projects GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * 创建新项目
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as {
      name: string;
      description?: string;
      artStyle?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ code: 400, msg: "项目名称不能为空" }, { status: 400 });
    }

    const [result] = await db.insert(projects).values({
      name: body.name.trim(),
      description: body.description ?? null,
      artStyle: body.artStyle ?? null,
      ownerType: 1,
      ownerId: userId,
      scope: 2,
      status: 0,
    });

    const newId = (result as unknown as { insertId: number }).insertId;
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.id, newId))
      .limit(1);

    return NextResponse.json({ code: 200, data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[api/projects POST]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
