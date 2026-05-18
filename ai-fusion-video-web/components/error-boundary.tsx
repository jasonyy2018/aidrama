"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 12, padding: 24,
          background: "rgba(20,20,28,0.98)", color: "rgba(255,255,255,0.8)",
          fontFamily: "system-ui, sans-serif",
        }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171" }}>画布发生错误</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", maxWidth: 400, textAlign: "center", fontFamily: "monospace" }}>
            {this.state.error?.message}
          </div>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{
            marginTop: 8, padding: "8px 20px", borderRadius: 8,
            border: "1px solid rgba(139,92,246,0.3)",
            background: "rgba(139,92,246,0.12)", color: "#c4b5fd",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
