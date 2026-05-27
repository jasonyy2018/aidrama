import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/user/page
 * 分页查询系统用户列表
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
    const pageNo = parseInt(searchParams.get("pageNo") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const username = searchParams.get("username");
    const nickname = searchParams.get("nickname");
    const statusParam = searchParams.get("status");
    const status = statusParam !== null ? parseInt(statusParam, 10) : undefined;

    const offset = (pageNo - 1) * pageSize;

    const conditions = [eq(users.deleted, 0)];

    if (username) {
      conditions.push(like(users.username, `%${username}%`));
    }
    if (nickname) {
      conditions.push(like(users.nickname, `%${nickname}%`));
    }
    if (status !== undefined) {
      conditions.push(eq(users.status, status));
    }

    const whereClause = and(...conditions);

    // 查询总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const total = countResult?.count ? Number(countResult.count) : 0;

    // 分页查询列表
    const userList = await db
      .select()
      .from(users)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    const formattedList = userList.map((user) => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      status: user.status ?? 1,
      createTime: user.createTime ? new Date(user.createTime).toISOString() : "",
      roles: ["admin"],
    }));

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: {
        list: formattedList,
        total,
      },
    });
  } catch (err) {
    logger.error("分页获取用户列表遭遇严重异常", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取用户分页列表失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
