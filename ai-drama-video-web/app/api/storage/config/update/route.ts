import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PUT /api/storage/config/update
 * 更新存储配置
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

    const body = await req.json();
    const {
      id,
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

    if (!id || !name) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少必要参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const defaultVal = isDefault ? 1 : 0;

    await db
      .update(storageConfigs)
      .set({
        name,
        type: type || undefined,
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
      })
      .where(eq(storageConfigs.id, id));

    if (defaultVal === 1) {
      await db
        .update(storageConfigs)
        .set({ isDefault: 0 })
        .where(ne(storageConfigs.id, id));
    }

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("更新存储配置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "更新存储配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
