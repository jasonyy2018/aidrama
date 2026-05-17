import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";

/**
 * PUT /api/auth/change-password
 * 修改当前用户密码
 */
export async function PUT(req: NextRequest) {
  try {
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

    const { userId } = session;
    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      logger.warn("修改密码参数不符合规范", { userId });
      return NextResponse.json(
        {
          code: 400,
          msg: "密码长度必须至少为 6 位",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("修改当前用户密码请求", { userId });

    // 查询当前用户信息
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      logger.warn("修改密码失败：用户不存在", { userId });
      return NextResponse.json(
        {
          code: 404,
          msg: "用户不存在",
          data: null,
        },
        { status: 404 }
      );
    }

    // 校验旧密码
    const isOldValid = verifyPassword(oldPassword, user.password);
    if (!isOldValid) {
      logger.warn("修改密码失败：旧密码输入错误", { userId });
      return NextResponse.json(
        {
          code: 400,
          msg: "旧密码错误，请重新输入",
          data: null,
        },
        { status: 400 }
      );
    }

    // 哈希新密码并更新
    const hashedNewPassword = hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, userId));

    logger.info("修改密码成功", { userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("修改密码发生故障", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，密码修改失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
