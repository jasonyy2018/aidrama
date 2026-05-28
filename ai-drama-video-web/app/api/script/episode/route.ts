import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptEpisodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

/**
 * POST /api/script/episode
 * 创建分集
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json() as {
      scriptId: number;
      episodeNumber?: number;
      title?: string;
      synopsis?: string;
      rawContent?: string;
      durationEstimate?: number;
      sortOrder?: number;
    };

    if (!body.scriptId) {
      return NextResponse.json({ code: 400, msg: "缺少 scriptId" }, { status: 400 });
    }

    const [newEpisode] = await db
      .insert(scriptEpisodes)
      .values({
        scriptId: body.scriptId,
        episodeNumber: body.episodeNumber ?? 1,
        title: body.title?.trim() || "未命名分集",
        synopsis: body.synopsis ?? null,
        rawContent: body.rawContent ?? null,
        durationEstimate: body.durationEstimate ?? null,
        sortOrder: body.sortOrder ?? 0,
        status: 0,
        version: 0,
        deleted: 0,
      })
      .returning();

    return NextResponse.json({ code: 0, data: newEpisode });
  } catch (err: any) {
    console.error("[api/script/episode POST]", err);
    if (err.message === "UNAUTHORIZED" || err.digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * PUT /api/script/episode
 * 更新分集
 */
export async function PUT(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json() as {
      id: number;
      title?: string;
      synopsis?: string;
      rawContent?: string;
      durationEstimate?: number;
      sortOrder?: number;
      version?: number;
    };

    if (!body.id) {
      return NextResponse.json({ code: 400, msg: "缺少分集 ID" }, { status: 400 });
    }

    const allowedFields = [
      "title",
      "synopsis",
      "rawContent",
      "durationEstimate",
      "sortOrder",
      "version",
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

    // Auto increment version if provided or exists
    if (typeof body.version === "number") {
      updateData.version = body.version + 1;
    }

    updateData.updateTime = new Date();

    const [updatedEpisode] = await db
      .update(scriptEpisodes)
      .set(updateData)
      .where(
        and(
          eq(scriptEpisodes.id, body.id),
          eq(scriptEpisodes.deleted, 0)
        )
      )
      .returning();

    if (!updatedEpisode) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: updatedEpisode });
  } catch (err: any) {
    console.error("[api/script/episode PUT]", err);
    if (err.message === "UNAUTHORIZED" || err.digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
