import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

/**
 * PUT /api/auth/profile
 * 修改当前用户个人资料
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
    const { nickname, email, phone } = body;

    logger.info("修改当前用户个人资料", { userId, nickname, email, phone });

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (nickname !== undefined) updateData.nickname = nickname.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        code: 0,
        msg: "无改动",
        data: true,
      });
    }

    // 更新数据库
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    logger.info("修改个人资料成功", { userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("修改个人资料失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，更新资料失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
