"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { scanAgentTags, type AgentTagEvent } from "../utils/parse-agent-tags";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanvasContext {
  scriptContent: string;
  assetsCount: number;
  scriptPlanContent: string;
  shotCount: number;
}

interface CanvasAgentChatProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  onTagEvents: (events: AgentTagEvent[]) => void;
  canvasContext?: CanvasContext;
}

function buildSystemPrompt(ctx: CanvasContext): string {
  const parts: string[] = [
    "You are an AI Director for comic-drama (漫剧) production. ",
    "You help users create scripts, storyboards, and manage the production pipeline.",
    "",
    "=== CURRENT CANVAS STATE ===",
  ];

  if (ctx.scriptContent) parts.push(`Script:\n${ctx.scriptContent.slice(0, 2000)}`);
  else parts.push("Script: (empty)");

  parts.push(`Assets: ${ctx.assetsCount} items`);
  if (ctx.scriptPlanContent) parts.push(`Director Plan: ${ctx.scriptPlanContent.slice(0, 500)}`);
  parts.push(`Shots: ${ctx.shotCount} shots on storyboard`);

  parts.push(...[
    "",
    "=== RESPONSE FORMAT ===",
    "When generating content, use these XML tags so the canvas can auto-update:",
    "<script>full script content here</script>",
    "<scriptPlan>director's plan with shot breakdown</scriptPlan>",
    "<storyboardTable>| shot | type | content |</storyboardTable>",
    "<storyboardItem>{ \"shotNumber\": \"1\", \"content\": \"...\", \"shotType\": \"中景\" }</storyboardItem>",
    "",
    "Guidelines:",
    "- Respond in Chinese",
    "- Keep responses concise and actionable",
    "- Use tags for any new content that should appear on the canvas",
  ]);

  return parts.join("\n");
}

function useAssistantChat(
  conversationId: string,
  onTagEvents: (events: AgentTagEvent[]) => void,
  canvasContext: CanvasContext,
) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const processedTagKeys = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const append = useCallback(async (content: string) => {
    const userMsg: AgentMessage = { role: "user", content };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = buildSystemPrompt(canvasContext);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const assistantMsg: AgentMessage = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      }

      const events = scanAgentTags(accumulated, processedTagKeys.current);
      if (events.length > 0) {
        events.forEach(e => processedTagKeys.current.add(e.key));
        onTagEvents(events);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, conversationId, onTagEvents, canvasContext]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, input, setInput, append, isLoading, error, stop, setMessages };
}

export default function CanvasAgentChat({ open, onClose, conversationId, onTagEvents, canvasContext }: CanvasAgentChatProps) {
  const ctx: CanvasContext = canvasContext ?? {
    scriptContent: "", assetsCount: 0, scriptPlanContent: "", shotCount: 0,
  };
  const { messages, input, setInput, append, isLoading, error, stop } = useAssistantChat(conversationId, onTagEvents, ctx);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 340,
      background: "rgba(16,16,22,0.98)", borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", zIndex: 600,
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", flex: 1 }}>AI 导演助手</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
          fontSize: 16, padding: 4, borderRadius: 4, lineHeight: 1,
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
            我可以帮你生成剧本、分镜、图片和视频<br />
            我了解你画布上的当前内容<br /><br />
            <code style={{ fontSize: 11, color: "rgba(139,92,246,0.6)", background: "rgba(139,92,246,0.08)", padding: "2px 6px", borderRadius: 4 }}>
              "生成一个武侠剧本"
            </code><br />
            <code style={{ fontSize: 11, color: "rgba(139,92,246,0.6)", background: "rgba(139,92,246,0.08)", padding: "2px 6px", borderRadius: 4 }}>
              "把第3场改成雨夜"
            </code>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 10,
            background: msg.role === "user" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "90%",
          }}>
            <div style={{ fontSize: 11, color: msg.role === "user" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.7)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {error && (
          <div style={{ fontSize: 11, color: "#f87171", padding: "6px 10px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>
            错误: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isLoading) { e.preventDefault(); append(input); } }}
          placeholder="输入指令..."
          disabled={isLoading}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)",
            fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        {isLoading ? (
          <button onClick={stop} style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.12)", color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            停止
          </button>
        ) : (
          <button onClick={() => append(input)} disabled={!input.trim()} style={{
            padding: "8px 12px", borderRadius: 8, border: "none",
            background: input.trim() ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
            color: input.trim() ? "#818cf8" : "rgba(255,255,255,0.2)",
            fontSize: 12, cursor: input.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}>
            发送
          </button>
        )}
      </div>
    </div>
  );
}
