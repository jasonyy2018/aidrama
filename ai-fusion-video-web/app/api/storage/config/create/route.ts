import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/storage/config/create
 * 创建存储配置
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      name,
      type,
      endpoint,
      bucketName,
      accessKey,
      secretKey,
      region,
      basePath,
      customDomain,
      isDefault,
      status,
      remark,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        {
          code: 400,
          msg: "配置名称和类型不能为空",
          data: null,
        },
        { status: 400 }
      );
    }

    const defaultVal = isDefault ? 1 : 0;

    const [newConfig] = await db
      .insert(storageConfigs)
      .values({
        name,
        type,
        endpoint: endpoint || null,
        bucketName: bucketName || null,
        accessKey: accessKey || null,
        secretKey: secretKey || null,
        region: region || null,
        basePath: basePath || null,
        customDomain: customDomain || null,
        isDefault: defaultVal,
        status: status ?? 1,
        remark: remark || null,
        deleted: 0,
      })
      .returning();

    if (defaultVal === 1 && newConfig) {
      await db
        .update(storageConfigs)
        .set({ isDefault: 0 })
        .where(ne(storageConfigs.id, newConfig.id));
    }

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: newConfig.id,
    });
  } catch (err) {
    logger.error("创建存储配置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "创建存储配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
