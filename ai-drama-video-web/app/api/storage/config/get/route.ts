import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/config/get
 * 获取存储配置详情
 */
export async function GET(req: NextRequest) {
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

    const config = await db.query.storageConfigs.findFirst({
      where: and(eq(storageConfigs.id, id), eq(storageConfigs.deleted, 0)),
    });

    if (!config) {
      return NextResponse.json(
        {
          code: 404,
          msg: "存储配置不存在",
          data: null,
        },
        { status: 404 }
      );
    }

    const formatted = {
      id: config.id,
      name: config.name,
      type: config.type,
      endpoint: config.endpoint || undefined,
      bucketName: config.bucketName || undefined,
      accessKey: config.accessKey || undefined,
      secretKey: config.secretKey || undefined,
      region: config.region || undefined,
      basePath: config.basePath || undefined,
      customDomain: config.customDomain || undefined,
      isDefault: config.isDefault === 1,
      status: config.status,
      remark: config.remark || undefined,
      createTime: config.createTime
        ? new Date(config.createTime).toISOString()
        : "",
      updateTime: config.updateTime
        ? new Date(config.updateTime).toISOString()
        : "",
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: formatted,
    });
  } catch (err) {
    logger.error("获取存储配置详情失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取存储配置详情失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
