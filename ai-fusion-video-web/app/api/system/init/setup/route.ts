import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { logger } from "@/lib/logger";

/**
 * POST /api/system/init/setup
 * 系统首次启动配置：创建第一个管理员账号
 */
export async function POST(req: NextRequest) {
  try {
    logger.info("收到系统初始化设置请求");

    // 检查是否已经存在用户
    const [userCountResult] = await db.select({ value: count() }).from(users);
    if (userCountResult.value > 0) {
      logger.warn("系统已完成初始化，拒绝重复初始化尝试");
      return NextResponse.json(
        {
          code: 400,
          msg: "系统已完成初始化，拒绝重复设置",
          data: null,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { username, password, nickname } = body;

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      logger.warn("初始化参数校验失败", { username });
      return NextResponse.json(
        {
          code: 400,
          msg: "用户名或密码不符合规范（用户名至少3位，密码至少6位）",
          data: null,
        },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const hashedPassword = hashPassword(password);
    const finalNickname = (nickname?.trim() || trimmedUsername);

    logger.info("开始向数据库插入管理员账户...", { username: trimmedUsername });

    const [insertedUser] = await db.insert(users).values({
      username: trimmedUsername,
      password: hashedPassword,
      nickname: finalNickname,
      status: 1,
      deleted: 0,
      avatar: null,
      email: null,
      phone: null,
    }).returning({
      id: users.id,
      username: users.username,
      nickname: users.nickname,
    });

    const userId = Number(insertedUser.id);
    logger.info("管理员账户创建成功", { userId, username: trimmedUsername });

    // 生成 Token
    const accessToken = signToken({ userId, username: trimmedUsername });
    const refreshToken = signToken({ userId, username: trimmedUsername }, 30 * 24 * 60 * 60);

    const loginResp = {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 天
      userId,
      username: trimmedUsername,
      nickname: finalNickname,
    };

    logger.info("Token 签名签发完毕，完成系统初始化");

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: loginResp,
    });
  } catch (err) {
    logger.error("系统初始化设置失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，初始化失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
