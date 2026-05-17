import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";
import { db } from "@/lib/db";
import { apiConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export enum ModelApiType {
  OPENAI = 1,
  ANTHROPIC = 2,
  GEMINI = 3,
  // 其他如果都是兼容 OpenAI 的（比如 DeepSeek, DashScope等），可以用 1
}

/**
 * 根据数据库中的模型 ID，动态创建 Vercel AI SDK 的 LanguageModel 实例
 */
export async function getLanguageModel(modelId: number): Promise<LanguageModel> {
  const modelConfig = await db.query.apiConfigs.findFirst({
    where: eq(apiConfigs.modelId, modelId),
  });

  if (!modelConfig) {
    throw new Error(`API Config for model ID ${modelId} not found`);
  }

  const { apiType, apiUrl, apiKey, name } = modelConfig;

  if (!apiKey) {
    throw new Error(`API Key for model ${name} is missing`);
  }

  switch (apiType) {
    case ModelApiType.OPENAI: {
      const openai = createOpenAI({
        apiKey: apiKey,
        baseURL: apiUrl || undefined, // 如果有自定义网关（如 DashScope 等 OpenAI 兼容接口）
      });
      return openai(name);
    }
    case ModelApiType.ANTHROPIC: {
      const anthropic = createAnthropic({
        apiKey: apiKey,
        baseURL: apiUrl || undefined,
      });
      return anthropic(name);
    }
    case ModelApiType.GEMINI: {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
        baseURL: apiUrl || undefined,
      });
      return google(name);
    }
    default:
      // 默认尝试当作 OpenAI 兼容的接口处理
      const defaultOpenai = createOpenAI({
        apiKey: apiKey,
        baseURL: apiUrl || undefined,
      });
      return defaultOpenai(name);
  }
}
