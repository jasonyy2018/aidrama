import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/config
 * 获取全局系统配置
 */
export async function GET() {
  try {
    // 权限校验：仅允许登录用户查看系统配置
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

    const configs = await db
      .select({
        configKey: systemConfigs.configKey,
        configValue: systemConfigs.configValue,
      })
      .from(systemConfigs)
      .where(eq(systemConfigs.deleted, 0));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: configs,
    });
  } catch (err) {
    logger.error("获取系统配置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，获取配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/system/config
 * 保存全局系统配置
 */
export async function PUT(req: NextRequest) {
  try {
    // 权限校验
    let session;
    try {
      session = await requireSession();
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

    const { userId, username } = session;
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          code: 400,
          msg: "请求参数格式错误",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("保存系统配置请求", { userId, username, keys: Object.keys(body) });

    // 逐个更新或插入配置项
    for (const [key, value] of Object.entries(body)) {
      const configValStr = value !== null && value !== undefined ? String(value) : "";
      
      await db
        .insert(systemConfigs)
        .values({
          configKey: key,
          configValue: configValStr,
          deleted: 0,
        })
        .onConflictDoUpdate({
          target: systemConfigs.configKey,
          set: {
            configValue: configValStr,
            updateTime: sql`now()`,
          },
        });
    }

    logger.info("系统配置保存成功", { userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: null,
    });
  } catch (err) {
    logger.error("保存系统配置遭遇严重异常", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，保存配置失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
