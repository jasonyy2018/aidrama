import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiModels, apiConfigs } from "@/lib/db/schema";
import { eq, and, like, desc, sql, count } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { getLanguageModel } from "@/lib/ai/model-factory";
import { generateText } from "ai";

export const dynamic = "force-dynamic";

// 预设模型列表
const MODEL_PRESETS = [
  // ---------- 对话模型 (Type: 1) ----------
  {
    code: "deepseek-chat",
    name: "DeepSeek V3",
    platform: "openai_compatible",
    modelType: 1,
    description: "DeepSeek 旗舰通用对话模型，推理速度快，高性价比",
    config: { temperature: 0.7, maxTokens: 4096 },
  },
  {
    code: "deepseek-reasoner",
    name: "DeepSeek R1",
    platform: "openai_compatible",
    modelType: 1,
    description: "DeepSeek 深度思考模型，具备强大的逻辑与推理能力",
    config: { temperature: 0.6, supportReasoning: true },
  },
  {
    code: "gpt-4o",
    name: "GPT-4o",
    platform: "openai_compatible",
    modelType: 1,
    description: "OpenAI 旗舰全能型大语言模型",
    config: { temperature: 0.7 },
  },
  {
    code: "gpt-4o-mini",
    name: "GPT-4o Mini",
    platform: "openai_compatible",
    modelType: 1,
    description: "OpenAI 高性价比的轻量级大模型",
    config: { temperature: 0.7 },
  },
  {
    code: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    platform: "gemini",
    modelType: 1,
    description: "Google 旗舰速度与多模态极速模型",
    config: { temperature: 1.0 },
  },
  {
    code: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    platform: "gemini",
    modelType: 1,
    description: "Google 最强逻辑与多模态分析模型",
    config: { temperature: 1.0 },
  },
  {
    code: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet",
    platform: "anthropic",
    modelType: 1,
    description: "Anthropic 顶尖的黄金标准推理模型",
    config: { temperature: 0.7 },
  },

  // ---------- 绘图/图像生成模型 (Type: 2) ----------
  {
    code: "flux-schnell",
    name: "FLUX.1 Schnell",
    platform: "openai_compatible",
    modelType: 2,
    description: "当前开源最强的极速生图大模型，1-4步秒级成像",
    config: { supportReferenceImages: true, maxReferenceImages: 1 },
  },
  {
    code: "flux-dev",
    name: "FLUX.1 Dev",
    platform: "openai_compatible",
    modelType: 2,
    description: "FLUX 社区主流的高精度高细节生图大模型",
    config: { supportReferenceImages: true, maxReferenceImages: 1 },
  },
  {
    code: "wanx-v1",
    name: "通义万相",
    platform: "dashscope",
    modelType: 2,
    description: "阿里通义万相专业级图像生成大模型",
    config: { supportReferenceImages: false },
  },

  // ---------- 视频生成模型 (Type: 3) ----------
  {
    code: "luma-ray",
    name: "Luma Ray 2.0",
    platform: "openai_compatible",
    modelType: 3,
    description: "Luma 顶尖电影级运动细节视频生成大模型",
    config: { supportFirstFrame: true, supportLastFrame: true, supportReferenceImages: true, maxReferenceImages: 1 },
  },
  {
    code: "hunyuan-video",
    name: "腾讯混元视频",
    platform: "openai_compatible",
    modelType: 3,
    description: "当前最强的开源中式国风视频生成模型",
    config: { supportFirstFrame: true, supportLastFrame: false, supportReferenceImages: true, maxReferenceImages: 1 },
  }
];

// 统一的处理入口
async function handleAction(action: string, req: NextRequest) {
  // 权限校验
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ code: 401, msg: "未登录，请先登录", data: null }, { status: 401 });
  }

  const { userId } = session;

  switch (req.method) {
    case "POST": {
      if (action === "create") {
        const body = await req.json();
        if (!body.name || !body.name.trim()) {
          return NextResponse.json({ code: 400, msg: "模型名称不能为空", data: null }, { status: 400 });
        }
        if (!body.code || !body.code.trim()) {
          return NextResponse.json({ code: 400, msg: "模型标识/代码不能为空", data: null }, { status: 400 });
        }

        const [newModel] = await db
          .insert(aiModels)
          .values({
            name: body.name.trim(),
            code: body.code.trim(),
            modelType: body.modelType ?? 1,
            icon: body.icon || null,
            description: body.description || null,
            sort: body.sort ?? 0,
            status: body.status ?? 1,
            config: typeof body.config === "string" ? body.config : JSON.stringify(body.config || {}),
            maxConcurrency: body.maxConcurrency ?? 5,
            defaultModel: body.defaultModel ? 1 : 0,
            supportVision: body.supportVision ? 1 : 0,
            supportReasoning: body.supportReasoning ? 1 : 0,
            contextWindow: body.contextWindow || null,
            apiConfigId: body.apiConfigId || null,
            deleted: 0,
          })
          .returning();

        // 如果设置了默认模型，需要把同类型的其他模型取消默认
        if (body.defaultModel) {
          await db
            .update(aiModels)
            .set({ defaultModel: 0 })
            .where(
              and(
                eq(aiModels.modelType, body.modelType ?? 1),
                sql`${aiModels.id} != ${newModel.id}`
              )
            );
        }

        logger.info("创建 AI 模型配置成功", { modelId: newModel.id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: newModel.id });
      }

      if (action === "test-text-connectivity") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "模型 ID 不能为空", data: null }, { status: 400 });
        }

        const modelId = Number(idStr);
        const modelRecord = await db.query.aiModels.findFirst({
          where: and(eq(aiModels.id, modelId), eq(aiModels.deleted, 0)),
        });

        if (!modelRecord) {
          return NextResponse.json({ code: 404, msg: "模型不存在", data: null }, { status: 404 });
        }

        try {
          const modelInstance = await getLanguageModel(modelId);
          const startTime = Date.now();

          const res = await generateText({
            model: modelInstance,
            prompt: "ping",
            maxTokens: 5,
          } as any);

          const durationMs = Date.now() - startTime;
          logger.info("测试模型连通性成功", { modelId, durationMs, response: res.text });

          return NextResponse.json({
            code: 0,
            msg: "success",
            data: {
              modelId,
              modelName: modelRecord.name,
              responseText: res.text || "(空响应)",
              durationMs,
              testedAt: new Date().toISOString(),
            },
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error("测试模型连通性失败", { modelId, error: errMsg });
          return NextResponse.json({
            code: 500,
            msg: `连接大模型接口失败: ${errMsg}`,
            data: null,
          }, { status: 500 });
        }
      }
      break;
    }

    case "PUT": {
      if (action === "update") {
        const body = await req.json();
        if (!body.id) {
          return NextResponse.json({ code: 400, msg: "模型 ID 不能为空", data: null }, { status: 400 });
        }

        const updateFields: Record<string, any> = {
          updateTime: new Date(),
        };

        if (body.name !== undefined) updateFields.name = body.name.trim();
        if (body.code !== undefined) updateFields.code = body.code.trim();
        if (body.modelType !== undefined) updateFields.modelType = body.modelType;
        if (body.icon !== undefined) updateFields.icon = body.icon;
        if (body.description !== undefined) updateFields.description = body.description;
        if (body.sort !== undefined) updateFields.sort = body.sort;
        if (body.status !== undefined) updateFields.status = body.status;
        if (body.config !== undefined) {
          updateFields.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config || {});
        }
        if (body.maxConcurrency !== undefined) updateFields.maxConcurrency = body.maxConcurrency;
        if (body.defaultModel !== undefined) updateFields.defaultModel = body.defaultModel ? 1 : 0;
        if (body.supportVision !== undefined) updateFields.supportVision = body.supportVision ? 1 : 0;
        if (body.supportReasoning !== undefined) updateFields.supportReasoning = body.supportReasoning ? 1 : 0;
        if (body.contextWindow !== undefined) updateFields.contextWindow = body.contextWindow;
        if (body.apiConfigId !== undefined) updateFields.apiConfigId = body.apiConfigId;

        const [updatedModel] = await db
          .update(aiModels)
          .set(updateFields)
          .where(and(eq(aiModels.id, body.id), eq(aiModels.deleted, 0)))
          .returning();

        if (!updatedModel) {
          return NextResponse.json({ code: 404, msg: "模型不存在", data: null }, { status: 404 });
        }

        // 如果设置了默认模型，取消同类型其他模型的默认标记
        if (body.defaultModel) {
          await db
            .update(aiModels)
            .set({ defaultModel: 0 })
            .where(
              and(
                eq(aiModels.modelType, updatedModel.modelType),
                sql`${aiModels.id} != ${updatedModel.id}`
              )
            );
        }

        logger.info("更新 AI 模型配置成功", { modelId: updatedModel.id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: true });
      }
      break;
    }

    case "DELETE": {
      if (action === "delete") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "模型 ID 不能为空", data: null }, { status: 400 });
        }

        const id = Number(idStr);
        const [deletedModel] = await db
          .update(aiModels)
          .set({
            deleted: 1,
            updateTime: new Date(),
          })
          .where(and(eq(aiModels.id, id), eq(aiModels.deleted, 0)))
          .returning();

        if (!deletedModel) {
          return NextResponse.json({ code: 404, msg: "模型不存在", data: null }, { status: 404 });
        }

        logger.info("软删除 AI 模型成功", { modelId: id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: true });
      }
      break;
    }

    case "GET": {
      if (action === "get") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "模型 ID 不能为空", data: null }, { status: 400 });
        }

        const id = Number(idStr);
        const model = await db.query.aiModels.findFirst({
          where: and(eq(aiModels.id, id), eq(aiModels.deleted, 0)),
        });

        if (!model) {
          return NextResponse.json({ code: 404, msg: "模型不存在", data: null }, { status: 404 });
        }

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: {
            ...model,
            defaultModel: model.defaultModel === 1,
            supportVision: model.supportVision === 1,
            supportReasoning: model.supportReasoning === 1,
          },
        });
      }

      if (action === "list") {
        const list = await db.query.aiModels.findMany({
          where: and(eq(aiModels.status, 1), eq(aiModels.deleted, 0)),
          orderBy: [desc(aiModels.sort), desc(aiModels.id)],
        });

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: list.map(m => ({
            ...m,
            defaultModel: m.defaultModel === 1,
            supportVision: m.supportVision === 1,
            supportReasoning: m.supportReasoning === 1,
          })),
        });
      }

      if (action === "list-by-type") {
        const { searchParams } = new URL(req.url);
        const typeStr = searchParams.get("type");
        if (!typeStr) {
          return NextResponse.json({ code: 400, msg: "模型类型不能为空", data: null }, { status: 400 });
        }

        const list = await db.query.aiModels.findMany({
          where: and(
            eq(aiModels.modelType, Number(typeStr)),
            eq(aiModels.status, 1),
            eq(aiModels.deleted, 0)
          ),
          orderBy: [desc(aiModels.sort), desc(aiModels.id)],
        });

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: list.map(m => ({
            ...m,
            defaultModel: m.defaultModel === 1,
            supportVision: m.supportVision === 1,
            supportReasoning: m.supportReasoning === 1,
          })),
        });
      }

      if (action === "page") {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const code = searchParams.get("code");
        const modelTypeStr = searchParams.get("modelType");
        const statusStr = searchParams.get("status");
        const pageNo = Number(searchParams.get("pageNo") || "1");
        const pageSize = Number(searchParams.get("pageSize") || "10");

        const whereConditions = [eq(aiModels.deleted, 0)];
        if (name && name.trim()) {
          whereConditions.push(like(aiModels.name, `%${name.trim()}%`));
        }
        if (code && code.trim()) {
          whereConditions.push(like(aiModels.code, `%${code.trim()}%`));
        }
        if (modelTypeStr !== null && modelTypeStr !== undefined && modelTypeStr !== "") {
          whereConditions.push(eq(aiModels.modelType, Number(modelTypeStr)));
        }
        if (statusStr !== null && statusStr !== undefined && statusStr !== "") {
          whereConditions.push(eq(aiModels.status, Number(statusStr)));
        }

        const andCondition = and(...whereConditions);

        // 1. 总数
        const [totalResult] = await db
          .select({ count: count() })
          .from(aiModels)
          .where(andCondition);

        // 2. 列表
        const offset = (pageNo - 1) * pageSize;
        const list = await db.query.aiModels.findMany({
          where: andCondition,
          orderBy: [desc(aiModels.sort), desc(aiModels.id)],
          limit: pageSize,
          offset: offset,
        });

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: {
            list: list.map(m => ({
              ...m,
              defaultModel: m.defaultModel === 1,
              supportVision: m.supportVision === 1,
              supportReasoning: m.supportReasoning === 1,
            })),
            total: totalResult?.count || 0,
          },
        });
      }

      if (action === "presets") {
        const { searchParams } = new URL(req.url);
        const typeStr = searchParams.get("type");
        
        let filtered = MODEL_PRESETS;
        if (typeStr) {
          filtered = MODEL_PRESETS.filter(p => p.modelType === Number(typeStr));
        }

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: filtered,
        });
      }
      break;
    }
  }

  return NextResponse.json({ code: 405, msg: "方法不允许", data: null }, { status: 405 });
}

export async function GET(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  return handleAction(params.action, req);
}

export async function POST(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  return handleAction(params.action, req);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  return handleAction(params.action, req);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  return handleAction(params.action, req);
}
