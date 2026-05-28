import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storyboardEpisodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json() as {
      storyboardId: number;
      episodeNumber?: number;
      title?: string;
      synopsis?: string;
      sortOrder?: number;
    };

    if (!body.storyboardId) {
      return NextResponse.json({ code: 400, msg: "缺少 storyboardId" }, { status: 400 });
    }

    const [newEpisode] = await db
      .insert(storyboardEpisodes)
      .values({
        storyboardId: body.storyboardId,
        episodeNumber: body.episodeNumber ?? 1,
        title: body.title?.trim() || "未命名分集",
        synopsis: body.synopsis ?? null,
        sortOrder: body.sortOrder ?? 0,
        status: 0,
        composeStatus: 0,
        deleted: 0,
        createTime: new Date(),
        updateTime: new Date(),
      })
      .returning();

    return NextResponse.json({ code: 0, data: newEpisode });
  } catch (err: any) {
    console.error("[api/storyboard/episode POST]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json() as {
      id: number;
      episodeNumber?: number;
      title?: string;
      synopsis?: string;
      sortOrder?: number;
    };

    if (!body.id) {
      return NextResponse.json({ code: 400, msg: "缺少分集 ID" }, { status: 400 });
    }

    const allowedFields = ["episodeNumber", "title", "synopsis", "sortOrder"] as const;
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

    const [updatedEpisode] = await db
      .update(storyboardEpisodes)
      .set(updateData)
      .where(
        and(
          eq(storyboardEpisodes.id, body.id),
          eq(storyboardEpisodes.deleted, 0)
        )
      )
      .returning();

    if (!updatedEpisode) {
      return NextResponse.json({ code: 404, msg: "分集不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 0, data: updatedEpisode });
  } catch (err: any) {
    console.error("[api/storyboard/episode PUT]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
