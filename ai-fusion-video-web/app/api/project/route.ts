import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/project
 * 创建项目
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { name, description, properties } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        {
          code: 400,
          msg: "项目名称不能为空",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("创建新项目", { name, userId });

    let parsedProperties = null;
    if (properties) {
      try {
        parsedProperties = typeof properties === "string" ? JSON.parse(properties) : properties;
      } catch {
        parsedProperties = { raw: properties };
      }
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        description: description || null,
        ownerType: 1,
        ownerId: userId,
        scope: 2,
        status: 0,
        properties: parsedProperties,
        deleted: 0,
      })
      .returning();

    logger.info("新项目创建成功", { projectId: newProject.id, userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: newProject,
    });
  } catch (err) {
    logger.error("创建项目失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，创建项目失败",
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/project
 * 更新项目信息
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
          msg: "未登录，请先登录",
          data: null,
        },
        { status: 401 }
      );
    }

    const { userId } = session;
    const body = await req.json();
    const { id, name, description, properties, coverUrl, status, artStyle, artStyleDescription, artStyleImagePrompt, artStyleImageUrl } = body;

    if (!id) {
      return NextResponse.json(
        {
          code: 400,
          msg: "项目 ID 不能为空",
          data: null,
        },
        { status: 400 }
      );
    }

    logger.info("更新项目", { projectId: id, userId });

    // 构建更新字段
    const updateFields: Record<string, any> = {
      updateTime: new Date(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description;
    if (coverUrl !== undefined) updateFields.coverUrl = coverUrl;
    if (status !== undefined) updateFields.status = status;
    if (artStyle !== undefined) updateFields.artStyle = artStyle;
    if (artStyleDescription !== undefined) updateFields.artStyleDescription = artStyleDescription;
    if (artStyleImagePrompt !== undefined) updateFields.artStyleImagePrompt = artStyleImagePrompt;
    if (artStyleImageUrl !== undefined) updateFields.artStyleImageUrl = artStyleImageUrl;

    if (properties !== undefined) {
      try {
        updateFields.properties = typeof properties === "string" ? JSON.parse(properties) : properties;
      } catch {
        updateFields.properties = properties;
      }
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateFields)
      .where(and(eq(projects.id, id), eq(projects.ownerId, userId)))
      .returning();

    if (!updatedProject) {
      logger.warn("更新项目失败：未找到该项目或无权限", { projectId: id, userId });
      return NextResponse.json(
        {
          code: 404,
          msg: "未找到该项目或无权限操作",
          data: null,
        },
        { status: 404 }
      );
    }

    logger.info("项目更新成功", { projectId: id, userId });

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: updatedProject,
    });
  } catch (err) {
    logger.error("更新项目失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，更新项目失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
