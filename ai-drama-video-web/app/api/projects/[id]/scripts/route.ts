import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession();
    const { id } = await params;
    const projectId = Number(id);

    const [script] = await db
      .select()
      .from(scripts)
      .where(
        and(
          eq(scripts.projectId, projectId),
          eq(scripts.deleted, 0)
        )
      )
      .orderBy(desc(scripts.updateTime))
      .limit(1);

    return NextResponse.json({ code: 200, data: script ?? null });
  } catch (err: any) {
    console.error("[api/projects/[id]/scripts GET]", err);
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: 401, msg: "未登录或登录已过期" }, { status: 401 });
    }
    return NextResponse.json({ code: 500, msg: "服务器错误" }, { status: 500 });
  }
}
