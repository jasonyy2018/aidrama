import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/assets
 * 获取项目下的资产列表（角色、场景、道具等）
 * Query params: ?type=character,scene,prop
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();
    const { id } = await params;
    const projectId = Number(id);

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type");

    const conditions = [
      eq(assets.projectId, projectId),
      eq(assets.deleted, 0),
    ];

    if (typeParam) {
      const types = typeParam.split(",");
      conditions.push(inArray(assets.type, types));
    }

    const rows = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(assets.type, assets.name);

    return NextResponse.json({
      code: 200,
      data: rows.map((a) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        description: a.description,
        coverUrl: a.coverUrl,
        tags: a.tags,
      })),
    });
  } catch (err) {
    console.error("[assets] 查询失败", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
