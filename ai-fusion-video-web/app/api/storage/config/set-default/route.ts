import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PUT /api/storage/config/set-default
 * 设置默认存储配置
 */
export async function PUT(req: NextRequest) {
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

    // 将当前设为默认
    await db
      .update(storageConfigs)
      .set({ isDefault: 1 })
      .where(eq(storageConfigs.id, id));

    // 将其他设为非默认
    await db
      .update(storageConfigs)
      .set({ isDefault: 0 })
      .where(ne(storageConfigs.id, id));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("设置默认存储配置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "设置默认存储配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
