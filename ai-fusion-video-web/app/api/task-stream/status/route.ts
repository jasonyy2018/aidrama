import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentConversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/task-stream/status
 * 查询特定任务流的运行状态：ACTIVE / COMPLETED / ERROR / NONE
 */
export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        {
          code: 400,
          msg: "缺少 taskId 参数",
          data: null,
        },
        { status: 400 }
      );
    }

    const conv = await db.query.agentConversations.findFirst({
      where: and(
        eq(agentConversations.conversationId, taskId),
        eq(agentConversations.deleted, 0),
        eq(agentConversations.userId, userId)
      ),
    });

    if (!conv) {
      return NextResponse.json({
        code: 0,
        msg: "success",
        data: "NONE",
      });
    }

    const statusStr = (conv.status || "").toLowerCase();
    let mappedStatus = "ACTIVE";

    if (
      statusStr === "done" ||
      statusStr === "success" ||
      statusStr === "completed"
    ) {
      mappedStatus = "COMPLETED";
    } else if (statusStr === "error" || statusStr === "failed") {
      mappedStatus = "ERROR";
    } else if (statusStr === "running" || statusStr === "active") {
      mappedStatus = "ACTIVE";
    }

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: mappedStatus,
    });
  } catch (err) {
    logger.error("获取任务流状态失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "获取任务状态流失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
