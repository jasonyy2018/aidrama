import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/storage/config/delete
 * 软删除存储配置
 */
export async function DELETE(req: NextRequest) {
  try {
    try {
      await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录账号",
          data: null,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少 id 参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const id = parseInt(idParam, 10);

    await db
      .update(storageConfigs)
      .set({ deleted: 1 })
      .where(eq(storageConfigs.id, id));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("删除存储配置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "删除存储配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
