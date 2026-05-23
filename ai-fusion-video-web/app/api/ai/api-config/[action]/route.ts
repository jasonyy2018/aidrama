import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiConfigs } from "@/lib/db/schema";
import { eq, and, like, desc, sql, count } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function unpackApiConfig(config: any) {
  if (!config) return null;
  let autoAppendV1Path = true;
  let proxyType = "none";
  let proxyHost = "";
  let proxyPort: number | null = null;
  let proxyUsername = "";
  let proxyPassword = "";
  let realAppSecret = config.appSecret || "";

  if (config.appSecret && config.appSecret.startsWith("{")) {
    try {
      const extra = JSON.parse(config.appSecret);
      autoAppendV1Path = extra.autoAppendV1Path ?? true;
      proxyType = extra.proxyType || "none";
      proxyHost = extra.proxyHost || "";
      proxyPort = extra.proxyPort ?? null;
      proxyUsername = extra.proxyUsername || "";
      proxyPassword = extra.proxyPassword || "";
      realAppSecret = extra.realAppSecret || "";
    } catch {
      // Ignored
    }
  }

  return {
    ...config,
    autoAppendV1Path,
    proxyType,
    proxyHost,
    proxyPort,
    proxyUsername,
    proxyPassword,
    appSecret: realAppSecret,
  };
}

function packApiConfigPayload(body: any) {
  const extra = {
    autoAppendV1Path: body.autoAppendV1Path ?? true,
    proxyType: body.proxyType || "none",
    proxyHost: body.proxyHost || "",
    proxyPort: body.proxyPort ?? null,
    proxyUsername: body.proxyUsername || "",
    proxyPassword: body.proxyPassword || "",
    realAppSecret: body.appSecret || "",
  };

  return {
    name: body.name,
    platform: body.platform || null,
    apiUrl: body.apiUrl || null,
    apiKey: body.apiKey || null,
    appId: body.appId || null,
    appSecret: JSON.stringify(extra),
    modelId: body.modelId || null,
    status: body.status ?? 1,
    remark: body.remark || null,
  };
}

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
          return NextResponse.json({ code: 400, msg: "配置名称不能为空", data: null }, { status: 400 });
        }

        const payload = packApiConfigPayload(body);
        const [newConfig] = await db
          .insert(apiConfigs)
          .values({
            ...payload,
            deleted: 0,
          })
          .returning();

        logger.info("创建 API 配置成功", { configId: newConfig.id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: newConfig.id });
      }
      break;
    }

    case "PUT": {
      if (action === "update") {
        const body = await req.json();
        if (!body.id) {
          return NextResponse.json({ code: 400, msg: "配置 ID 不能为空", data: null }, { status: 400 });
        }

        const payload = packApiConfigPayload(body);
        const [updatedConfig] = await db
          .update(apiConfigs)
          .set({
            ...payload,
            updateTime: new Date(),
          })
          .where(and(eq(apiConfigs.id, body.id), eq(apiConfigs.deleted, 0)))
          .returning();

        if (!updatedConfig) {
          return NextResponse.json({ code: 404, msg: "配置不存在", data: null }, { status: 404 });
        }

        logger.info("更新 API 配置成功", { configId: updatedConfig.id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: true });
      }
      break;
    }

    case "DELETE": {
      if (action === "delete") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "配置 ID 不能为空", data: null }, { status: 400 });
        }

        const id = Number(idStr);
        const [deletedConfig] = await db
          .update(apiConfigs)
          .set({
            deleted: 1,
            updateTime: new Date(),
          })
          .where(and(eq(apiConfigs.id, id), eq(apiConfigs.deleted, 0)))
          .returning();

        if (!deletedConfig) {
          return NextResponse.json({ code: 404, msg: "配置不存在", data: null }, { status: 404 });
        }

        logger.info("软删除 API 配置成功", { configId: id, userId });
        return NextResponse.json({ code: 0, msg: "success", data: true });
      }
      break;
    }

    case "GET": {
      if (action === "get") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "配置 ID 不能为空", data: null }, { status: 400 });
        }

        const id = Number(idStr);
        const config = await db.query.apiConfigs.findFirst({
          where: and(eq(apiConfigs.id, id), eq(apiConfigs.deleted, 0)),
        });

        if (!config) {
          return NextResponse.json({ code: 404, msg: "配置不存在", data: null }, { status: 404 });
        }

        return NextResponse.json({ code: 0, msg: "success", data: unpackApiConfig(config) });
      }

      if (action === "list") {
        const list = await db.query.apiConfigs.findMany({
          where: and(eq(apiConfigs.status, 1), eq(apiConfigs.deleted, 0)),
          orderBy: [desc(apiConfigs.id)],
        });

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: list.map(unpackApiConfig),
        });
      }

      if (action === "page") {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const platform = searchParams.get("platform");
        const statusStr = searchParams.get("status");
        const pageNo = Number(searchParams.get("pageNo") || "1");
        const pageSize = Number(searchParams.get("pageSize") || "10");

        const whereConditions = [eq(apiConfigs.deleted, 0)];
        if (name && name.trim()) {
          whereConditions.push(like(apiConfigs.name, `%${name.trim()}%`));
        }
        if (platform && platform.trim()) {
          whereConditions.push(eq(apiConfigs.platform, platform.trim()));
        }
        if (statusStr !== null && statusStr !== undefined && statusStr !== "") {
          whereConditions.push(eq(apiConfigs.status, Number(statusStr)));
        }

        const andCondition = and(...whereConditions);

        // 1. 查询总数
        const [totalResult] = await db
          .select({ count: count() })
          .from(apiConfigs)
          .where(andCondition);

        // 2. 分页查询列表
        const offset = (pageNo - 1) * pageSize;
        const list = await db.query.apiConfigs.findMany({
          where: andCondition,
          orderBy: [desc(apiConfigs.id)],
          limit: pageSize,
          offset: offset,
        });

        return NextResponse.json({
          code: 0,
          msg: "success",
          data: {
            list: list.map(unpackApiConfig),
            total: totalResult?.count || 0,
          },
        });
      }

      if (action === "remote-models") {
        const { searchParams } = new URL(req.url);
        const idStr = searchParams.get("id");
        if (!idStr) {
          return NextResponse.json({ code: 400, msg: "配置 ID 不能为空", data: null }, { status: 400 });
        }

        const id = Number(idStr);
        const config = await db.query.apiConfigs.findFirst({
          where: and(eq(apiConfigs.id, id), eq(apiConfigs.deleted, 0)),
        });

        if (!config) {
          return NextResponse.json({ code: 404, msg: "配置不存在", data: null }, { status: 404 });
        }

        const unpacked = unpackApiConfig(config);
        const mockModels: any[] = [];

        // 针对不同平台提供最主流的预设模型列表作为安全回退
        if (unpacked.platform === "openai_compatible" || unpacked.platform === "deepseek") {
          mockModels.push(
            { id: "deepseek-chat", ownedBy: "deepseek" },
            { id: "deepseek-reasoner", ownedBy: "deepseek" },
            { id: "gpt-4o", ownedBy: "openai" },
            { id: "gpt-4o-mini", ownedBy: "openai" }
          );
        } else if (unpacked.platform === "gemini" || unpacked.platform === "vertex_ai") {
          mockModels.push(
            { id: "gemini-2.5-flash", ownedBy: "google" },
            { id: "gemini-2.5-pro", ownedBy: "google" },
            { id: "gemini-1.5-flash", ownedBy: "google" }
          );
        } else if (unpacked.platform === "anthropic") {
          mockModels.push(
            { id: "claude-3-5-sonnet-latest", ownedBy: "anthropic" },
            { id: "claude-3-5-haiku-latest", ownedBy: "anthropic" },
            { id: "claude-3-opus-latest", ownedBy: "anthropic" }
          );
        } else if (unpacked.platform === "dashscope") {
          mockModels.push(
            { id: "qwen-max", ownedBy: "alibaba" },
            { id: "qwen-plus", ownedBy: "alibaba" },
            { id: "qwen-turbo", ownedBy: "alibaba" }
          );
        } else if (unpacked.platform === "ollama") {
          mockModels.push(
            { id: "llama3", ownedBy: "ollama" },
            { id: "qwen2.5", ownedBy: "ollama" },
            { id: "mistral", ownedBy: "ollama" }
          );
        }

        // 尝试向外部接口获取真实可用模型
        try {
          if (unpacked.apiUrl && unpacked.apiKey) {
            const url = `${unpacked.apiUrl.replace(/\/$/, "")}/models`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

            const res = await fetch(url, {
              headers: {
                Authorization: `Bearer ${unpacked.apiKey}`,
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.data)) {
                const list = data.data.map((m: any) => ({
                  id: m.id,
                  ownedBy: m.owned_by || unpacked.platform || "remote",
                }));
                if (list.length > 0) {
                  return NextResponse.json({ code: 0, msg: "success", data: list });
                }
              }
            }
          }
        } catch (err) {
          logger.warn("向远程模型接口获取可用列表失败，将使用默认推荐预设", { error: String(err) });
        }

        // 返回兜底的推荐模型列表
        return NextResponse.json({ code: 0, msg: "success", data: mockModels });
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
