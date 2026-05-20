import { NextRequest, NextResponse } from "next/server";
import { createAgentStream } from "@/lib/ai/agent-service";

// 允许该 API 路由运行时间最长可达 3 分钟（如果有 Vercel Pro/Enterprise 可以配更长，Edge/Serverless 都支持此配置）
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, conversationId, modelId, projectId, storyboardId } = body as {
      messages: any[];
      conversationId: string;
      modelId?: number;
      projectId?: number;
      storyboardId?: number | null;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    // 这里通常需要校验当前用户的权限，确保能访问这个 conversationId
    // const session = await auth();
    // requireCurrentUserId() ...

    // 默认回退到一个配置 of modelId (例如 1 代表默认 OpenAI)
    const effectiveModelId = modelId || 1;

    const result = await createAgentStream({
      conversationId,
      messages,
      modelId: effectiveModelId,
      projectId,
      storyboardId,
    });

    // 将 AI 流转换为 HTTP 数据流响应返回给前端 (SSE)
    // @ts-expect-error - Vercel AI SDK method signature update
    return result.toDataStreamResponse ? result.toDataStreamResponse() : result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI Chat Stream Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
