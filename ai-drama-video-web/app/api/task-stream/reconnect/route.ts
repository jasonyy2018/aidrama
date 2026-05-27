import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentMessages, agentConversations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/task-stream/reconnect
 * 建立 Server-Sent Events (SSE) 长连接重连并回放任务的运行历史
 */
export async function GET(req: NextRequest) {
  try {
    let session;
    try {
      session = await requireSession();
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }

    const { userId } = session;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return new Response("Missing taskId", { status: 400 });
    }

    const conv = await db.query.agentConversations.findFirst({
      where: and(
        eq(agentConversations.conversationId, taskId),
        eq(agentConversations.deleted, 0),
        eq(agentConversations.userId, userId)
      ),
    });

    if (!conv) {
      return new Response("Task not found", { status: 404 });
    }

    const messages = await db
      .select()
      .from(agentMessages)
      .where(
        and(
          eq(agentMessages.conversationId, taskId),
          eq(agentMessages.deleted, 0)
        )
      )
      .orderBy(asc(agentMessages.messageOrder));

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        for (const msg of messages) {
          if (msg.role === "assistant") {
            if (msg.toolCallId) {
              let toolCalls = [];
              try {
                if (msg.referencesJson) {
                  toolCalls = JSON.parse(msg.referencesJson);
                } else {
                  toolCalls = [
                    {
                      id: msg.toolCallId,
                      name: msg.toolName || "",
                      arguments: "",
                    },
                  ];
                }
              } catch {
                toolCalls = [
                  {
                    id: msg.toolCallId,
                    name: msg.toolName || "",
                    arguments: "",
                  },
                ];
              }

              const event = {
                conversationId: taskId,
                outputType: "TOOL_CALL",
                toolCalls,
                toolCallId: msg.toolCallId || undefined,
                toolName: msg.toolName || undefined,
              };
              await writer.write(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            } else {
              const event = {
                conversationId: taskId,
                outputType: msg.reasoningContent ? "REASONING" : "CONTENT",
                content: msg.content || undefined,
                reasoningContent: msg.reasoningContent || undefined,
              };
              await writer.write(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
            }
          } else if (msg.role === "tool") {
            let toolResult = msg.content || "";
            try {
              const parsed = JSON.parse(msg.content || "");
              if (Array.isArray(parsed) && parsed.length > 0) {
                const firstResult = parsed[0];
                if (firstResult && typeof firstResult === "object") {
                  toolResult = JSON.stringify(
                    firstResult.result ?? firstResult
                  );
                }
              }
            } catch {
              // ignore
            }

            const event = {
              conversationId: taskId,
              outputType: "TOOL_FINISHED",
              toolCallId: msg.toolCallId || undefined,
              toolName: msg.toolName || undefined,
              toolResult,
              toolStatus: msg.toolStatus || "done",
            };
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
        }

        const statusStr = (conv.status || "").toLowerCase();
        if (
          statusStr === "done" ||
          statusStr === "success" ||
          statusStr === "completed" ||
          statusStr === "error" ||
          statusStr === "failed"
        ) {
          const finalEvent = {
            conversationId: taskId,
            outputType:
              statusStr === "error" || statusStr === "failed"
                ? "ERROR"
                : "DONE",
            finished: true,
            error:
              statusStr === "error" || statusStr === "failed"
                ? "任务异常中止"
                : undefined,
          };
          await writer.write(
            encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`)
          );
        }
      } catch (streamErr) {
        logger.error("SSE stream playback error", streamErr);
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    logger.error("重连任务流失败", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
