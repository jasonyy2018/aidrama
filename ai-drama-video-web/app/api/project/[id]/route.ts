import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/project/[id]
 * 获取项目详情
 */
export async function GET(req: NextRequest, context: { params: any }) {
  try {
    let session;
    try {
      session = await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录",
          data: null,
        },
        { status: 401 }
      );
    }

    const { userId } = session;
    const params = await context.params;
    const projectId = Number(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          code: 400,
          msg: "无效的项目 ID",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("获取项目详情", { projectId, userId });

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.deleted, 0), eq(projects.ownerId, userId)))
      .limit(1);

    if (!project) {
      logger.warn("获取项目详情失败：项目不存在或无权限", { projectId, userId });
      return NextResponse.json(
        {
          code: 404,
          msg: "未找到该项目或无权限查看",
          data: null,
        },
        { status: 404 }
      );
    }

    logger.info("项目详情获取成功", { projectId, userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: project,
    });
  } catch (err) {
    logger.error("获取项目详情失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，获取详情失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/project/[id]
 * 删除项目（软删除）
 */
export async function DELETE(req: NextRequest, context: { params: any }) {
  try {
    let session;
    try {
      session = await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录",
          data: null,
        },
        { status: 401 }
      );
    }

    const { userId } = session;
    const params = await context.params;
    const projectId = Number(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        {
          code: 400,
          msg: "无效的项目 ID",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("软删除项目", { projectId, userId });

    // 软删除：设置 deleted 为 1
    const [deletedProject] = await db
      .update(projects)
      .set({ deleted: 1, updateTime: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
      .returning();

    if (!deletedProject) {
      logger.warn("删除项目失败：项目不存在或无权限", { projectId, userId });
      return NextResponse.json(
        {
          code: 404,
          msg: "未找到该项目或无权限删除",
          data: null,
        },
        { status: 404 }
      );
    }

    logger.info("项目删除成功", { projectId, userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: true,
    });
  } catch (err) {
    logger.error("删除项目失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，删除项目失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
