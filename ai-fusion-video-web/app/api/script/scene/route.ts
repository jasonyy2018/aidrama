import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scriptScenes, scriptEpisodes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

function tryParseJson(val: any) {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

/**
 * POST /api/script/scene
 * 创建场次
 */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const body = await req.json() as {
      episodeId: number;
      scriptId?: number;
      sceneNumber?: string;
      sceneHeading?: string;
      location?: string;
      timeOfDay?: string;
      intExt?: string;
      sceneDescription?: string;
      sortOrder?: number;
    };

    if (!body.episodeId) {
      return NextResponse.json({ code: 400, msg: "缺少 episodeId" }, { status: 400 });
    }

    // Resolve scriptId if not provided directly
    let scriptId = body.scriptId;
    if (!scriptId) {
      const [ep] = await db
        .select()
        .from(scriptEpisodes)
        .where(and(eq(scriptEpisodes.id, body.episodeId), eq(scriptEpisodes.deleted, 0)))
        .limit(1);
      if (ep) {
        scriptId = ep.scriptId;
      }
    }

    if (!scriptId) {
      return NextResponse.json({ code: 400, msg: "缺少 scriptId" }, { status: 400 });
    }

    const [newScene] = await db
      .insert(scriptScenes)
      .values({
        episodeId: body.episodeId,
        scriptId: scriptId,
        sceneNumber: body.sceneNumber ?? "",
        sceneHeading: body.sceneHeading ?? "未命名场次",
        location: body.location ?? null,
        timeOfDay: body.timeOfDay ?? null,
        intExt: body.intExt ?? null,
        sceneDescription: body.sceneDescription ?? null,
        sortOrder: body.sortOrder ?? 0,
        status: 0,
        version: 0,
        deleted: 0,
      })
      .returning();

    return NextResponse.json({ code: 200, data: newScene });
  } catch (err) {
    console.error("[api/script/scene POST]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

/**
 * PUT /api/script/scene
 * 更新场次
 */
export async function PUT(req: NextRequest) {
  try {
    await requireUserId();
    const body = await req.json() as Record<string, any>;

    if (!body.id) {
      return NextResponse.json({ code: 400, msg: "缺少场次 ID" }, { status: 400 });
    }

    const simpleFields = [
      "episodeId",
      "scriptId",
      "sceneNumber",
      "sceneHeading",
      "location",
      "timeOfDay",
      "intExt",
      "sceneDescription",
      "sceneAssetId",
      "sortOrder",
      "version",
    ] as const;

    const updateData: Record<string, any> = {};
    for (const field of simpleFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // JSON fields from request to deserialize
    const jsonFields = ["characters", "characterAssetIds", "propAssetIds", "dialogues"];
    for (const field of jsonFields) {
      if (field in body) {
        updateData[field] = tryParseJson(body[field]);
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

    const [updatedScene] = await db
      .update(scriptScenes)
      .set(updateData)
      .where(
        and(
          eq(scriptScenes.id, body.id),
          eq(scriptScenes.deleted, 0)
        )
      )
      .returning();

    if (!updatedScene) {
      return NextResponse.json({ code: 404, msg: "场次不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: updatedScene });
  } catch (err) {
    console.error("[api/script/scene PUT]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
