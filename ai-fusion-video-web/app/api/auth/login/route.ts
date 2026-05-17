import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/login
 * 用户登录
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      logger.warn("登录请求参数缺失", { username });
      return NextResponse.json(
        {
          code: 400,
          msg: "用户名和密码不能为空",
          data: null,
        },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    logger.info("收到登录请求", { username: trimmedUsername });

    // 查询未被删除的用户
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, trimmedUsername), eq(users.deleted, 0)))
      .limit(1);

    if (!user) {
      logger.warn("登录失败：用户不存在", { username: trimmedUsername });
      return NextResponse.json(
        {
          code: 401,
          msg: "用户名或密码错误",
          data: null,
        },
        { status: 401 }
      );
    }

    if (user.status !== 1) {
      logger.warn("登录失败：用户账号已被禁用", { username: trimmedUsername });
      return NextResponse.json(
        {
          code: 403,
          msg: "该账号已被禁用，请联系管理员",
          data: null,
        },
        { status: 403 }
      );
    }

    // 验证密码
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn("登录失败：密码错误", { username: trimmedUsername });
      return NextResponse.json(
        {
          code: 401,
          msg: "用户名或密码错误",
          data: null,
        },
        { status: 401 }
      );
    }

    const userId = Number(user.id);
    logger.info("用户登录成功", { userId, username: trimmedUsername });

    // 生成 Token
    const accessToken = signToken({ userId, username: trimmedUsername });
    const refreshToken = signToken({ userId, username: trimmedUsername }, 30 * 24 * 60 * 60);

    const loginResp = {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60,
      userId,
      username: trimmedUsername,
      nickname: user.nickname || trimmedUsername,
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: loginResp,
    });
  } catch (err) {
    logger.error("用户登录失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，登录失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
