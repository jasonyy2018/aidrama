import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_FIELDS = ["name", "description", "type", "coverUrl"] as const;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || isNaN(id)) {
      return NextResponse.json({ code: 400, msg: "无效 ID" }, { status: 400 });
    }

    const body = await req.json() as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ code: 400, msg: "无有效更新字段" }, { status: 400 });
    }

    await db
      .update(assets)
      .set(updateData as any)
      .where(
        and(
          eq(assets.id, id),
          eq(assets.deleted, 0)
        )
      );

    return NextResponse.json({ code: 200, msg: "更新成功" });
  } catch (err) {
    console.error("[api/assets PATCH]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUserId();

    const { id: idStr } = await params;
    const id = Number(idStr);

    const rows = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, id),
          eq(assets.deleted, 0)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ code: 404, msg: "资产不存在" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error("[api/assets GET]", err);
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
