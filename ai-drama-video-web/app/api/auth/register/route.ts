import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/register
 * 用户注册
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, confirmPassword, nickname } = body;

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      logger.warn("注册请求参数校验不通过", { username });
      return NextResponse.json(
        {
          code: 400,
          msg: "用户名或密码不符合规范（用户名至少3位，密码至少6位）",
          data: null,
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      logger.warn("注册密码输入不匹配", { username });
      return NextResponse.json(
        {
          code: 400,
          msg: "两次输入的密码不一致",
          data: null,
        },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    logger.info("收到用户注册请求", { username: trimmedUsername });

    // 检查用户名是否已被占用
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, trimmedUsername), eq(users.deleted, 0)))
      .limit(1);

    if (existingUser) {
      logger.warn("注册失败：用户名已被占用", { username: trimmedUsername });
      return NextResponse.json(
        {
          code: 400,
          msg: "该用户名已被占用，请使用其他用户名",
          data: null,
        },
        { status: 400 }
      );
    }

    // 哈希密码并入库
    const hashedPassword = hashPassword(password);
    const finalNickname = nickname?.trim() || trimmedUsername;

    logger.info("开始插入新用户到数据库...", { username: trimmedUsername });
    await db.insert(users).values({
      username: trimmedUsername,
      password: hashedPassword,
      nickname: finalNickname,
      status: 1,
      deleted: 0,
      avatar: null,
      email: null,
      phone: null,
    });

    logger.info("用户注册成功", { username: trimmedUsername });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("用户注册失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，注册失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
