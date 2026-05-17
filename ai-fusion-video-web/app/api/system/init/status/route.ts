import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/init/status
 * 获取系统初始化状态（是否已创建过管理员账号）
 */
export async function GET() {
  try {
    logger.info("开始检查系统初始化状态...");
    const [result] = await db.select({ value: count() }).from(users);
    const hasUsers = result.value > 0;

    logger.info("系统初始化状态检查完毕", { initialized: hasUsers });
    return NextResponse.json({
      code: 0,
      msg: "success",
      data: {
        initialized: hasUsers,
        allowRegister: true,
      },
    });
  } catch (err) {
    logger.error("获取系统初始化状态失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，查询初始化状态失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
