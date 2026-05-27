import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentConversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/task-stream/running
 * 获取当前用户所有运行中的任务流（即 status = 'running' 的 agent 对话）
 */
export async function GET() {
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

    // 查询未删除、属于当前用户且状态为 running 的对话任务
    const runningTasks = await db
      .select()
      .from(agentConversations)
      .where(
        and(
          eq(agentConversations.deleted, 0),
          eq(agentConversations.status, "running"),
          eq(agentConversations.userId, userId)
        )
      );

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: runningTasks,
    });
  } catch (err) {
    logger.error("获取运行中任务流失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取运行中任务流失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
