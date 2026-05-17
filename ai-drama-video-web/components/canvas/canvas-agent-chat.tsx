"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X, Send, Bot, Loader2, MessageSquare } from "lucide-react";
import { scanAgentTags, type AgentTagEvent } from "./utils/parse-agent-tags";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanvasAgentChatProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  onTagEvents: (events: AgentTagEvent[]) => void;
}

function useAssistantChat(conversationId: string, onTagEvents: (events: AgentTagEvent[]) => void) {
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

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
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
  }, [messages, conversationId, onTagEvents]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, input, setInput, append, isLoading, error, stop, setMessages };
}

export default function CanvasAgentChat({
  open,
  onClose,
  conversationId,
  onTagEvents,
}: CanvasAgentChatProps) {
  const { messages, input, setInput, append, isLoading, error, stop } = useAssistantChat(conversationId, onTagEvents);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    append(input.trim());
  };

  return (
    <div style={{
      position: "absolute", right: 0, top: 0, bottom: 0, width: 360,
      background: "rgba(14,14,20,0.97)", borderLeft: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)", zIndex: 400,
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      transform: open ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={16} color="#8b5cf6" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>
            AI 导演助手
          </span>
        </div>
        <button onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && !isLoading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "40px 20px", color: "rgba(255,255,255,0.2)", textAlign: "center",
          }}>
            <MessageSquare size={32} />
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              向 AI 导演助手描述需求<br />
              可以用 XML 标签指定更新内容：
            </div>
            <code style={{ fontSize: 10, color: "rgba(139,92,246,0.5)", background: "rgba(139,92,246,0.08)", padding: "6px 10px", borderRadius: 6 }}>
              &lt;script&gt;...&lt;/script&gt; 更新剧本
            </code>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", gap: 4,
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 10,
              fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap",
              background: msg.role === "user"
                ? "rgba(139,92,246,0.15)"
                : "rgba(255,255,255,0.04)",
              color: msg.role === "user" ? "#c4b5fd" : "rgba(255,255,255,0.75)",
              borderBottomRightRadius: msg.role === "user" ? 2 : 10,
              borderBottomLeftRadius: msg.role === "user" ? 10 : 2,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
            <Loader2 size={12} className="animate-spin" color="#8b5cf6" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>AI 思考中...</span>
          </div>
        )}
        {error && (
          <div style={{ fontSize: 11, color: "#f87171", padding: 8, background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>
            错误: {error.message}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        display: "flex", gap: 8, padding: "10px 16px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入指令给 AI 导演助手..."
          disabled={isLoading}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,0.75)",
            outline: "none", fontFamily: "system-ui, sans-serif",
          }}
        />
        {isLoading ? (
          <button type="button" onClick={stop}
            style={{
              width: 34, height: 34, borderRadius: 8, border: "none",
              background: "rgba(239,68,68,0.3)", color: "#fca5a5",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              fontSize: 10,
            }}
          >
            ■
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}
            style={{
              width: 34, height: 34, borderRadius: 8, border: "none",
              background: input.trim() ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.2)",
              color: input.trim() ? "#c4b5fd" : "rgba(196,181,253,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <Send size={14} />
          </button>
        )}
      </form>

      <style>{`
        .animate-spin { animation: agent-spin 0.8s linear infinite; }
        @keyframes agent-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
