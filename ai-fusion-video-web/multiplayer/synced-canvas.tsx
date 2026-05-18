"use client";

import { Tldraw } from "tldraw";
import { useSyncCanvasStore } from "./use-sync-store";

const CUSTOM_SHAPE_UTILS_IMPORT = [
  // These are defined in canvas-editor.tsx;
  // We import them here via props since they're already loaded
];

interface SyncedCanvasProps {
  projectId: number;
  shapeUtils: readonly any[];
  onMount?: (editor: any) => void;
  children?: React.ReactNode;
}

export function SyncedCanvas({ projectId, shapeUtils, onMount, children }: SyncedCanvasProps) {
  const syncState = useSyncCanvasStore(`project_${projectId}`);

  if (syncState.status === "loading") {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(20,20,28,0.95)", color: "rgba(255,255,255,0.5)",
        fontFamily: "system-ui, sans-serif", fontSize: 13, gap: 10,
      }}>
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid rgba(99,102,241,0.3)",
          borderTopColor: "#818cf8", display: "inline-block",
          animation: "spin 0.8s linear infinite",
        }} />
        正在连接多人会话...
      </div>
    );
  }

  if (syncState.status === "error") {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(20,20,28,0.96)", color: "#f87171",
        fontFamily: "system-ui, sans-serif", fontSize: 13, gap: 16, padding: 24,
        textAlign: "center",
      }}>
        <span style={{ fontSize: 28, opacity: 0.6 }}>🔗</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>多人会话连接失败</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, maxWidth: 300 }}>
            {(syncState.error as any)?.message ?? "无法连接到同步服务器，请确认同步服务已启动。"}
          </div>
        </div>
        <button onClick={() => window.location.reload()} style={{
          padding: "8px 20px", borderRadius: 8,
          border: "1px solid rgba(139,92,246,0.3)",
          background: "rgba(139,92,246,0.12)", color: "#c4b5fd",
          fontSize: 13, cursor: "pointer",
          fontFamily: "inherit",
        }}>
          重新连接
        </button>
      </div>
    );
  }

  return (
    <Tldraw
      store={syncState.store as any}
      shapeUtils={shapeUtils as any}
      onMount={onMount as any}
      hideUi={false}
    >
      {children}
    </Tldraw>
  );
}
