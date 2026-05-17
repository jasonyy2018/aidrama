import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/user-info
 * 获取当前登录用户信息
 */
export async function GET() {
  try {
    // 权限校验
    let session;
    try {
      session = await requireSession();
    } catch {
      logger.warn("获取用户信息失败：用户未登录或 Token 失效");
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
    logger.info("获取用户信息请求", { userId, username });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.deleted === 1) {
      logger.warn("获取用户信息失败：数据库中不存在该用户或已被删除", { userId });
      return NextResponse.json(
        {
          code: 404,
          msg: "用户不存在或已被删除",
          data: null,
        },
        { status: 404 }
      );
    }

    const userResp = {
      id: userId,
      username: user.username,
      nickname: user.nickname || user.username,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      status: user.status ?? 1,
      createTime: user.createTime ? new Date(user.createTime).toISOString() : "",
      roles: ["admin"], // 默认为管理员角色
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: userResp,
    });
  } catch (err) {
    logger.error("获取用户信息遭遇严重异常", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，获取信息失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
