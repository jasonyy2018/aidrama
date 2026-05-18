"use client";

import { useCallback, useEffect, useState } from "react";
import { useCanvasDataStore } from "@/lib/store/canvas-data-store";
import type { WorkbenchEpisode } from "@/types/pipeline";

interface WorkbenchDialogProps {
  open: boolean;
  projectId: number;
  storyboardId: number | null;
  onClose: () => void;
  onEpisodesUpdated: (episodes: WorkbenchEpisode[]) => void;
}

function composeStatusLabel(status: string): string {
  const labels: Record<string, string> = { idle: "待生成", pending: "排队中", processing: "合成中", done: "已完成", error: "失败" };
  return labels[status] ?? status;
}

function composeStatusColor(status: string): string {
  const colors: Record<string, string> = { idle: "#52525b", pending: "#fbbf24", processing: "#60a5fa", done: "#4ade80", error: "#f87171" };
  return colors[status] ?? "#52525b";
}

export default function WorkbenchDialog({
  open, projectId, storyboardId, onClose, onEpisodesUpdated,
}: WorkbenchDialogProps) {
  const [episodes, setEpisodes] = useState<Array<{ id: number; episodeNumber: number; title: string; composedVideoUrl: string | null; composeStatus: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [composingIds, setComposingIds] = useState<Set<number>>(new Set());
  const [batchComposing, setBatchComposing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  const store = useCanvasDataStore();

  const loadEpisodes = useCallback(async () => {
    if (!storyboardId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/storyboards/${storyboardId}/episodes`);
      const json = await res.json() as { code: number; data: Array<{ id: number; episodeNumber: number | null; title: string | null; composedVideoUrl: string | null; composeStatus: number }> };
      const eps = (json.data ?? []).map(ep => ({
        id: ep.id, episodeNumber: ep.episodeNumber ?? 0, title: ep.title ?? "",
        composedVideoUrl: ep.composedVideoUrl, composeStatus: ep.composeStatus,
      }));
      setEpisodes(eps);
      onEpisodesUpdated(eps.map(ep => ({
        id: ep.id, episodeNumber: ep.episodeNumber, title: ep.title,
        composedVideoUrl: ep.composedVideoUrl, composeStatus: ep.composeStatus === 0 ? "idle" : ep.composeStatus === 1 ? "processing" : ep.composeStatus === 2 ? "done" : "error",
      })));
    } catch (err) { console.error("[workbench] load failed", err); }
    finally { setLoading(false); }
  }, [storyboardId, onEpisodesUpdated]);

  useEffect(() => { if (open && storyboardId) loadEpisodes(); }, [open, storyboardId, loadEpisodes]);

  const handleCompose = useCallback(async (episode: { id: number; episodeNumber: number; title: string }) => {
    setComposingIds(prev => new Set(prev).add(episode.id));
    try {
      await fetch(`/api/episodes/${episode.id}/compose`, { method: "POST" });
      setTimeout(loadEpisodes, 2000);
    } catch (err) { console.error("[workbench] compose failed", err); }
    finally { setComposingIds(prev => { const next = new Set(prev); next.delete(episode.id); return next; }); }
  }, [loadEpisodes]);

  const handleBatchCompose = useCallback(async () => {
    setBatchComposing(true);
    const idleOrError = episodes.filter(e => e.composeStatus === 0 || e.composeStatus === 3);
    if (idleOrError.length === 0) { setBatchComposing(false); return; }
    for (const ep of idleOrError) {
      setComposingIds(prev => new Set(prev).add(ep.id));
      try {
        await fetch(`/api/episodes/${ep.id}/compose`, { method: "POST" });
      } catch { /* ignore */ }
      finally { setComposingIds(prev => { const next = new Set(prev); next.delete(ep.id); return next; }); }
    }
    setTimeout(() => { loadEpisodes(); setBatchComposing(false); }, 3000);
  }, [episodes, loadEpisodes]);

  if (!open) return null;

  const readyCount = episodes.filter(e => e.composeStatus === 2).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: "85vw", maxWidth: 720, maxHeight: "80vh", borderRadius: 16, overflow: "hidden",
        background: "rgba(14,14,20,0.98)", border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎬</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>视频装配工作台</span>
            {!loading && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{readyCount}/{episodes.length} 集已完成</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={loadEpisodes} disabled={loading} style={{
              padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 11,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
            }}>
              ↻ 刷新
            </button>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
              加载剧集列表...
            </div>
          ) : episodes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              暂无剧集数据
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {episodes.map(ep => {
                const status = ep.composeStatus === 0 ? "idle" : ep.composeStatus === 1 ? "processing" : ep.composeStatus === 2 ? "done" : "error";
                const color = composeStatusColor(status);
                const label = composeStatusLabel(status);
                const isComposing = composingIds.has(ep.id) || batchComposing;
                return (
                  <div key={ep.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: color, boxShadow: `0 0 8px ${color}66` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#f4f4f5" }}>
                        第{ep.episodeNumber ?? "?"}集{ep.title ? ` · ${ep.title}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color, flexShrink: 0 }}>{label}</span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {ep.composeStatus === 2 && ep.composedVideoUrl && (
                        <button onClick={() => ep.composedVideoUrl && setPreviewVideo({ url: ep.composedVideoUrl, title: `第${ep.episodeNumber ?? ""}集${ep.title ? ` · ${ep.title}` : ""}` })} style={{
                          display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 6,
                          border: "none", background: "rgba(74,222,128,0.12)", color: "#4ade80",
                          fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                        }}>👁 预览</button>
                      )}
                      {(ep.composeStatus === 0 || ep.composeStatus === 3) && (
                        <button onClick={() => handleCompose(ep)} disabled={isComposing} style={{
                          display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 6,
                          border: "none", background: isComposing ? "rgba(96,165,250,0.15)" : "rgba(96,165,250,0.2)",
                          color: isComposing ? "rgba(147,197,253,0.4)" : "#93c5fd",
                          fontSize: 10, cursor: isComposing ? "default" : "pointer", fontFamily: "inherit",
                        }}>
                          {isComposing ? "⏳" : "✨"}{isComposing ? "合成中..." : "合成"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loading && episodes.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "rgba(255,255,255,0.4)",
          }}>
            <span>已完成 {readyCount}/{episodes.length} 集</span>
            <button onClick={handleBatchCompose} disabled={batchComposing || episodes.every(e => e.composeStatus === 2 || e.composeStatus === 1)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 8,
              border: "1px solid rgba(244,114,182,0.3)",
              background: batchComposing ? "rgba(244,114,182,0.08)" : "rgba(244,114,182,0.12)",
              color: batchComposing ? "rgba(249,168,212,0.4)" : "#f9a8d4",
              fontSize: 11, fontWeight: 500, cursor: batchComposing ? "default" : "pointer", fontFamily: "inherit",
            }}>
              {batchComposing ? "⏳" : "✨"}
              {batchComposing ? "批量合成中..." : "批量合成未完成的剧集"}
            </button>
          </div>
        )}
      </div>

      {previewVideo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setPreviewVideo(null)}>
          <div style={{ maxWidth: "80vw", maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <video src={previewVideo.url} controls autoPlay
              style={{ maxWidth: "80vw", maxHeight: "80vh", borderRadius: 12, display: "block" }} />
          </div>
        </div>
      )}
    </div>
  );
}
