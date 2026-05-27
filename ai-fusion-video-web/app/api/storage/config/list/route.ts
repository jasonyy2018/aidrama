import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/config/list
 * 获取存储配置列表
 */
export async function GET() {
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

    const list = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.deleted, 0));

    const formattedList = list.map((config) => ({
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
    }));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: formattedList,
    });
  } catch (err) {
    logger.error("获取存储配置列表失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取存储配置列表失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
