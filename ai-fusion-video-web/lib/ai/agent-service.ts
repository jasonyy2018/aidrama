import { streamText, generateId } from "ai";
import { db } from "@/lib/db";
import { agentMessages, AgentMessage, NewAgentMessage } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getLanguageModel } from "./model-factory";
import { scriptTools } from "./tools";

export interface StreamChatRequest {
  conversationId: string;
  messages: any[]; // Used any[] instead of CoreMessage to avoid version conflicts
  modelId: number;
}

export async function createAgentStream({ conversationId, messages, modelId }: StreamChatRequest) {
  const model = await getLanguageModel(modelId);

  // 获取该对话已有的消息最大 order
  const existingMsgs = await db.query.agentMessages.findMany({
    where: eq(agentMessages.conversationId, conversationId),
    orderBy: [asc(agentMessages.messageOrder)],
    columns: { messageOrder: true },
  });
  
  let currentOrder = existingMsgs.length > 0 ? existingMsgs[existingMsgs.length - 1].messageOrder + 1 : 1;

  // 如果前端传来的最后一个用户消息还没存库，我们在这里先行存库
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === "user") {
    // 简单起见，这里假设内容是 string。实际上 AI SDK 允许 content 为数组（图片等），这里做个兼容转字符串
    const contentStr = typeof lastUserMessage.content === "string" 
      ? lastUserMessage.content 
      : JSON.stringify(lastUserMessage.content);
      
    await db.insert(agentMessages).values({
      conversationId,
      role: "user",
      content: contentStr,
      messageOrder: currentOrder++,
    });
  }

  // 开始流式调用
  const result = streamText({
    model: model,
    messages: messages,
    system: "You are a professional AI Director and Scriptwriter. Follow instructions carefully.",
    tools: scriptTools,
    // maxSteps: 5, // Requires newer versions of ai SDK, commented out for now
    
    // onStepFinish 用于记录 ReAct 过程中的中间思考和工具调用
    async onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
      // 如果大模型返回了中间的 reasoning/文本，或者调用了工具，我们将其记入数据库
      // 为了精确还原，我们可以把 toolCalls 和 toolResults 存为 function/tool 类型的记录
      
      const inserts: NewAgentMessage[] = [];
      
      // 1. 存 AI 产生的文字（如果有）或它发出的 Tool Call
      if (text || (toolCalls && toolCalls.length > 0)) {
        inserts.push({
          conversationId,
          role: "assistant",
          content: text || "",
          toolCallId: toolCalls?.[0]?.toolCallId,
          toolName: toolCalls?.[0]?.toolName,
          referencesJson: toolCalls && toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
          messageOrder: currentOrder++,
        });
      }

      // 2. 存 Tool 的执行结果
      if (toolResults && toolResults.length > 0) {
        inserts.push({
          conversationId,
          role: "tool",
          content: JSON.stringify(toolResults), // 把结果存成字符串
          toolCallId: toolResults[0]?.toolCallId,
          toolName: toolResults[0]?.toolName,
          messageOrder: currentOrder++,
        });
      }

      if (inserts.length > 0) {
        await db.insert(agentMessages).values(inserts);
      }
    },
    
    // onFinish 是最终完全结束时的回调（如果没触发多步，直接在最后调用）
    // 注意：如果已经配置了 onStepFinish，最终文本可能已经在最后一步的 onStepFinish 里被处理过
    // 但为了确保不遗漏最终给用户的回复文本，这里也可记录。通常使用 onFinish 存整段 AI 回复。
    async onFinish({ text, finishReason }) {
      // 记录整个生成的完整流（主要针对纯文本情况，且未被 onStepFinish 捕获时）
      // Vercel SDK 中，text 包含所有步骤累加出来的最终向用户呈现的文本。
      // 可以根据实际业务逻辑决定如何避免与 onStepFinish 重复记录。
      console.log(`Stream finished for conv ${conversationId}. Reason: ${finishReason}`);
    }
  });

  return result;
}
